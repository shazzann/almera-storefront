import "server-only";

import sharp from "sharp";
import { getSupabaseAdmin, isSupabaseAdminConfigured } from "@/lib/supabase/admin.server";

export const PAYMENT_PROOF_BUCKET = "payment-proofs";
export const MAX_PROOF_BYTES = 1_048_576; // 1 MB
export const MAX_RAW_IMAGE_BYTES = 10 * 1024 * 1024; // 10 MB before compression
const RETENTION_DAYS = 10;

function isPdfBuffer(buf: Buffer): boolean {
  return buf.length >= 5 && buf.subarray(0, 5).toString("ascii") === "%PDF-";
}

function isSupportedImageBuffer(buf: Buffer): boolean {
  if (buf.length < 12) return false;
  // JPEG: FF D8 FF
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return true;
  // PNG: 89 50 4E 47
  if (buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47) return true;
  // WebP: RIFF....WEBP
  if (
    buf.subarray(0, 4).toString("ascii") === "RIFF" &&
    buf.subarray(8, 12).toString("ascii") === "WEBP"
  ) {
    return true;
  }
  return false;
}

export async function ensurePaymentProofsBucket(): Promise<void> {
  if (!isSupabaseAdminConfigured()) return;
  const supabase = getSupabaseAdmin();
  const { error } = await supabase.storage.createBucket(PAYMENT_PROOF_BUCKET, {
    public: false,
    fileSizeLimit: MAX_PROOF_BYTES,
    allowedMimeTypes: ["image/webp", "image/jpeg", "image/png", "application/pdf"],
  });
  if (
    error &&
    !error.message?.toLowerCase().includes("already exists") &&
    !error.message?.toLowerCase().includes("duplicate")
  ) {
    console.warn("[payment-proofs] Could not ensure bucket:", error.message);
  }
}

export async function validateAndStorePaymentProof(
  file: File | Blob,
  orderReference: string,
): Promise<{ path: string; mime: string }> {
  const rawBuffer = Buffer.from(await file.arrayBuffer());
  if (rawBuffer.byteLength === 0) {
    throw new Error("The selected payment proof file is empty.");
  }

  let outputBuffer: Buffer;
  let contentType: "application/pdf" | "image/webp";
  let extension: "pdf" | "webp";

  if (isPdfBuffer(rawBuffer)) {
    if (rawBuffer.byteLength > MAX_PROOF_BYTES) {
      throw new Error("PDF payment proof must be under 1 MB.");
    }
    outputBuffer = rawBuffer;
    contentType = "application/pdf";
    extension = "pdf";
  } else if (isSupportedImageBuffer(rawBuffer)) {
    if (rawBuffer.byteLength > MAX_RAW_IMAGE_BYTES) {
      throw new Error("Image file is too large. Please choose an image under 10 MB.");
    }
    try {
      outputBuffer = await sharp(rawBuffer)
        .rotate()
        .resize({
          width: 1200,
          height: 1600,
          fit: "inside",
          withoutEnlargement: true,
        })
        .webp({ quality: 80, effort: 4 })
        .toBuffer();

      if (outputBuffer.byteLength > MAX_PROOF_BYTES) {
        outputBuffer = await sharp(rawBuffer)
          .rotate()
          .resize({
            width: 1000,
            height: 1300,
            fit: "inside",
            withoutEnlargement: true,
          })
          .webp({ quality: 68, effort: 4 })
          .toBuffer();
      }
    } catch {
      throw new Error("Could not process your payment proof image. Please upload a valid JPG, PNG, WebP or PDF.");
    }

    if (outputBuffer.byteLength > MAX_PROOF_BYTES) {
      throw new Error("Compressed payment proof exceeds 1 MB. Please upload a smaller screenshot or photo.");
    }

    contentType = "image/webp";
    extension = "webp";
  } else {
    throw new Error("Payment proof must be an image (JPG, PNG, WebP) or PDF file.");
  }

  const safeRef = orderReference.replace(/[^a-zA-Z0-9_-]/g, "") || "order";
  const path = `orders/${safeRef}-${Date.now()}.${extension}`;
  const supabase = getSupabaseAdmin();

  let { error: uploadError } = await supabase.storage
    .from(PAYMENT_PROOF_BUCKET)
    .upload(path, outputBuffer, {
      contentType,
      cacheControl: "3600",
      upsert: false,
    });

  if (uploadError && uploadError.message?.toLowerCase().includes("bucket")) {
    await ensurePaymentProofsBucket();
    const retry = await supabase.storage
      .from(PAYMENT_PROOF_BUCKET)
      .upload(path, outputBuffer, {
        contentType,
        cacheControl: "3600",
        upsert: false,
      });
    uploadError = retry.error;
  }

  if (uploadError) {
    throw new Error(`Could not save payment proof: ${uploadError.message}`);
  }

  return { path, mime: contentType };
}

export async function removePaymentProofFile(path: string | null | undefined): Promise<void> {
  if (!path || !isSupabaseAdminConfigured()) return;
  try {
    await getSupabaseAdmin().storage.from(PAYMENT_PROOF_BUCKET).remove([path]);
  } catch (err) {
    console.warn("[payment-proofs] Failed to remove proof file:", err);
  }
}

export async function purgeExpiredPaymentProofs(): Promise<{
  purgedCount: number;
  orderNumbers: string[];
}> {
  if (!isSupabaseAdminConfigured()) return { purgedCount: 0, orderNumbers: [] };

  const supabase = getSupabaseAdmin();
  const { data: rows, error } = await supabase
    .from("orders")
    .select("id, order_number, status, payment_proof_path, payment_proof_confirmed_at, updated_at")
    .not("payment_proof_path", "is", null)
    .limit(200);

  if (error) {
    if (error.code === "42703") {
      // Migration not applied yet
      return { purgedCount: 0, orderNumbers: [] };
    }
    console.error("[payment-proofs] Failed to query proofs for purge:", error.message);
    return { purgedCount: 0, orderNumbers: [] };
  }

  if (!rows || rows.length === 0) {
    return { purgedCount: 0, orderNumbers: [] };
  }

  const cutoffMs = Date.now() - RETENTION_DAYS * 24 * 60 * 60 * 1000;

  const expired = rows.filter((row) => {
    if (!row.payment_proof_path) return false;
    if (row.payment_proof_confirmed_at) {
      return new Date(row.payment_proof_confirmed_at).getTime() <= cutoffMs;
    }
    if (["cancelled", "refunded"].includes(row.status) && row.updated_at) {
      return new Date(row.updated_at).getTime() <= cutoffMs;
    }
    return false;
  });

  if (expired.length === 0) {
    return { purgedCount: 0, orderNumbers: [] };
  }

  const pathsToDelete = expired
    .map((r) => r.payment_proof_path)
    .filter((p): p is string => Boolean(p));

  if (pathsToDelete.length > 0) {
    const { error: removeErr } = await supabase.storage
      .from(PAYMENT_PROOF_BUCKET)
      .remove(pathsToDelete);

    if (removeErr) {
      console.error("[payment-proofs] Failed to delete expired proofs from bucket:", removeErr.message);
      return { purgedCount: 0, orderNumbers: [] };
    }
  }

  const idsToClear = expired.map((r) => r.id);
  const orderNumbers = expired.map((r) => String(r.order_number || r.id));
  const purgedAt = new Date().toISOString();

  const { error: updateErr } = await supabase
    .from("orders")
    .update({
      payment_proof_path: null,
      payment_proof_purged_at: purgedAt,
    })
    .in("id", idsToClear);

  if (updateErr) {
    console.error("[payment-proofs] Failed to mark proofs purged:", updateErr.message);
    return { purgedCount: 0, orderNumbers: [] };
  }

  try {
    await supabase.from("audit_log").insert({
      action: "purge_payment_proofs",
      entity_type: "order",
      entity_id: null,
      details: {
        count: orderNumbers.length,
        order_numbers: orderNumbers,
      },
    });
  } catch (err) {
    console.warn("[payment-proofs] Failed to write purge audit log:", err);
  }

  return { purgedCount: orderNumbers.length, orderNumbers };
}
