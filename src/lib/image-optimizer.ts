"use client";

export type OptimizeImageOptions = {
  maxWidth?: number;
  maxHeight?: number;
  quality?: number;
};

/**
 * Pre-optimizes images on the client before upload to Cloudflare / Supabase Storage.
 * - Preserves vector SVGs and animated GIFs without rasterization.
 * - Converts PNG/JPEG/etc. to lightweight WebP (0.82 quality) constrained within bounds.
 * - Falls back to JPEG on older iOS devices that lack canvas WebP export.
 */
export async function optimizeImageForUpload(
  file: File,
  options: OptimizeImageOptions = {},
): Promise<File> {
  if (typeof window === "undefined") return file;

  // Preserve vector SVGs and animated GIFs
  const mime = file.type.toLowerCase();
  if (mime === "image/svg+xml" || mime === "image/gif") {
    return file;
  }

  const maxWidth = options.maxWidth ?? 1200;
  const maxHeight = options.maxHeight ?? 1600;
  const quality = options.quality ?? 0.82;

  try {
    const bitmap = await createImageBitmap(file);
    let { width, height } = bitmap;

    if (width > maxWidth || height > maxHeight) {
      const ratio = Math.min(maxWidth / width, maxHeight / height);
      width = Math.round(width * ratio);
      height = Math.round(height * ratio);
    }

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) return file;

    ctx.drawImage(bitmap, 0, 0, width, height);

    const encode = (type: string) =>
      new Promise<Blob | null>((resolve) => canvas.toBlob((b) => resolve(b), type, quality));

    // iPhones / older WebKit can't save WebP and quietly hand back a huge PNG, so fall back to JPEG there.
    let blob = await encode("image/webp");
    if (blob?.type !== "image/webp") {
      blob = await encode("image/jpeg");
    }
    if (!blob) return file;

    const baseName = file.name.replace(/\.[^/.]+$/, "");
    const extension = blob.type === "image/webp" ? "webp" : "jpg";
    return new File([blob], `${baseName}.${extension}`, { type: blob.type });
  } catch (err) {
    console.warn("Client-side image optimization failed, proceeding with original file:", err);
    return file;
  }
}

/**
 * Backwards-compatible alias for existing callers.
 */
export const optimizeImageToWebP = optimizeImageForUpload;
