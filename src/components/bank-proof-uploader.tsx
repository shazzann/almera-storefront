"use client";

import { useEffect, useId, useRef, useState } from "react";
import { CheckIcon } from "@/components/icons";
import { CopyIcon, ClockIcon, TrashIcon } from "@/components/admin/admin-icons";
import { formatLKR } from "@/lib/catalog";
import { optimizeImageForUpload } from "@/lib/image-optimizer";
import { BANK_DETAILS } from "@/lib/whatsapp";

const MAX_PROOF_BYTES = 1_048_576; // 1 MB
const MAX_RAW_IMAGE_BYTES = 10 * 1024 * 1024; // 10 MB before compression

export type BankProofUploaderProps = {
  amount: number;
  phoneReference: string | null;
  onRequestPhoneFocus?: () => void;
  holdExpiresAt?: string | null;
  heldOrderNumber?: string | null;
  onStartHold?: () => Promise<void> | void;
  onAccountNumberCopied?: () => void;
  startingHold?: boolean;
  file: File | null;
  onFileChange: (file: File | null) => void;
  fileError?: string | null;
  onFileError?: (err: string | null) => void;
  submitting?: boolean;
  onSubmitProof?: () => Promise<void> | void;
  submitLabel?: string;
};

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  const kb = bytes / 1024;
  if (kb < 1024) return `${Math.round(kb)} KB`;
  return `${(kb / 1024).toFixed(2)} MB`;
}

function formatCountdown(ms: number): string {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const mins = Math.floor(totalSeconds / 60);
  const secs = totalSeconds % 60;
  return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
}

export function BankProofUploader({
  amount,
  phoneReference,
  onRequestPhoneFocus,
  holdExpiresAt,
  heldOrderNumber,
  onStartHold,
  onAccountNumberCopied,
  startingHold = false,
  file,
  onFileChange,
  fileError,
  onFileError,
  submitting = false,
  onSubmitProof,
  submitLabel,
}: BankProofUploaderProps) {
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [compressing, setCompressing] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [nowMs, setNowMs] = useState<number>(() => Date.now());

  useEffect(() => {
    if (!holdExpiresAt) return;
    setNowMs(Date.now());
    const id = setInterval(() => setNowMs(Date.now()), 1000);
    return () => clearInterval(id);
  }, [holdExpiresAt]);

  useEffect(() => {
    if (!file || !file.type.startsWith("image/")) {
      setPreviewUrl(null);
      return;
    }
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  const holdExpiryMs = holdExpiresAt ? new Date(holdExpiresAt).getTime() : null;
  const remainingMs = holdExpiryMs != null ? holdExpiryMs - nowMs : null;

  async function handleCopy(key: string, value: string, afterCopy?: () => void) {
    try {
      await navigator.clipboard.writeText(value);
      setCopiedKey(key);
      setTimeout(() => setCopiedKey((cur) => (cur === key ? null : cur)), 2000);
      afterCopy?.();
    } catch {
      // Clipboard API unavailable in some contexts
    }
  }

  async function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const selected = e.target.files?.[0];
    e.target.value = "";
    if (!selected) return;

    onFileError?.(null);

    const mime = (selected.type || "").toLowerCase();
    const lowerName = selected.name.toLowerCase();
    const isPdf = mime === "application/pdf" || lowerName.endsWith(".pdf");
    const isImage =
      mime.startsWith("image/") ||
      /\.(jpe?g|png|webp)$/.test(lowerName);

    if (isPdf) {
      if (selected.size > MAX_PROOF_BYTES) {
        onFileChange(null);
        onFileError?.("PDF payment proof must be under 1 MB.");
        return;
      }
      onFileChange(selected);
      return;
    }

    if (isImage) {
      if (!["image/jpeg", "image/png", "image/webp"].includes(mime) && !/\.(jpe?g|png|webp)$/.test(lowerName)) {
        onFileChange(null);
        onFileError?.("Only JPG, PNG, WebP images or PDF files (< 1 MB) are allowed.");
        return;
      }
      if (selected.size > MAX_RAW_IMAGE_BYTES) {
        onFileChange(null);
        onFileError?.("Please choose an image under 10 MB.");
        return;
      }

      setCompressing(true);
      try {
        let optimized = await optimizeImageForUpload(selected, {
          maxWidth: 1200,
          maxHeight: 1600,
          quality: 0.8,
        });
        if (optimized.size > MAX_PROOF_BYTES) {
          optimized = await optimizeImageForUpload(selected, {
            maxWidth: 1000,
            maxHeight: 1300,
            quality: 0.68,
          });
        }
        if (optimized.size > MAX_PROOF_BYTES) {
          onFileChange(null);
          onFileError?.("Compressed image must be under 1 MB. Please upload a smaller screenshot or photo.");
          return;
        }
        if (!["image/jpeg", "image/png", "image/webp"].includes(optimized.type.toLowerCase())) {
          onFileChange(null);
          onFileError?.("Only JPG, PNG, WebP images or PDF files (< 1 MB) are allowed.");
          return;
        }
        onFileChange(optimized);
      } catch {
        onFileChange(null);
        onFileError?.("Could not process image. Please try another JPG, PNG, WebP or PDF under 1 MB.");
      } finally {
        setCompressing(false);
      }
      return;
    }

    onFileChange(null);
    onFileError?.("Only JPG, PNG, WebP images or PDF files (< 1 MB) are allowed.");
  }

  return (
    <div className="mt-3 space-y-4 rounded-2xl border border-gold/45 bg-ivory p-4 text-sm sm:p-5">
      {/* 1-Hour Payment Reservation Banner */}
      {holdExpiresAt ? (
        <div
          className={`flex items-start gap-3 rounded-xl border px-3.5 py-3 text-xs ${
            remainingMs != null && remainingMs > 0
              ? "border-sage-deep/30 bg-sage-soft/50 text-charcoal"
              : "border-gold/50 bg-gold/10 text-charcoal"
          }`}
        >
          <ClockIcon className="mt-0.5 size-4 shrink-0 text-sage-deep" />
          <div className="min-w-0 flex-1 leading-relaxed">
            {remainingMs != null && remainingMs > 0 ? (
              <>
                <p className="font-semibold">
                  {heldOrderNumber ? `Order ${heldOrderNumber} reserved · ` : "Items reserved · "}
                  <span className="font-mono text-sage-deep tabular-nums">
                    {formatCountdown(remainingMs)}
                  </span>{" "}
                  remaining
                </p>
                <p className="mt-0.5 text-ink/70">
                  Complete your transfer and upload your slip before the timer ends. If you close this tab, you can continue from{" "}
                  <strong>My Account</strong> or <strong>Track Order</strong>.
                </p>
              </>
            ) : (
              <>
                <p className="font-semibold text-gold-deep">1-hour reservation window ended</p>
                <p className="mt-0.5 text-ink/70">
                  You can still upload your payment slip below—we’ll confirm your order automatically if items are still in stock, or notify our team to assist immediately.
                </p>
              </>
            )}
          </div>
        </div>
      ) : (
        onStartHold && (
          <div className="rounded-xl border border-sage-deep/25 bg-sage-soft/35 p-3.5 text-xs">
            <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between">
              <div className="leading-relaxed text-ink/80">
                <p className="font-semibold text-charcoal">1-Hour Payment Window</p>
                <p className="mt-0.5">
                  Reserve your pieces for 1 hour before opening your banking app—you can resume uploading from My Account anytime.
                </p>
              </div>
              <button
                type="button"
                onClick={onStartHold}
                disabled={startingHold}
                className="btn btn-ghost shrink-0 border border-ink/20 bg-ivory px-3.5 py-2 text-xs font-semibold"
              >
                {startingHold ? "Reserving…" : "Reserve items for 1 hour"}
              </button>
            </div>
          </div>
        )
      )}

      {/* Bank Account & Reference Instructions */}
      <div>
        <p className="eyebrow text-gold-deep">Direct bank deposit / transfer instructions</p>
        <p className="mt-1 text-xs leading-relaxed text-ink/70">
          Transfer or deposit the exact amount below using your mobile number as the bank reference, then upload your payment slip before placing your order.
        </p>

        <dl className="mt-3 divide-y divide-line rounded-xl border border-line bg-mist/40 px-3.5 text-xs sm:text-sm">
          <div className="flex items-center justify-between gap-3 py-2.5">
            <div>
              <dt className="text-xs text-ink/60">Amount to transfer</dt>
              <dd className="mt-0.5 font-semibold text-charcoal tabular-nums">
                {formatLKR(amount)}
              </dd>
            </div>
            <button
              type="button"
              onClick={() => handleCopy("amount", amount.toFixed(0))}
              className="inline-flex items-center gap-1 rounded-full border border-line bg-ivory px-2.5 py-1 text-xs font-medium text-ink/80 hover:border-ink"
            >
              {copiedKey === "amount" ? (
                <>
                  <CheckIcon className="size-3.5 text-sage-deep" /> Copied
                </>
              ) : (
                <>
                  <CopyIcon className="size-3.5" /> Copy
                </>
              )}
            </button>
          </div>

          <div className="flex items-center justify-between gap-3 py-2.5">
            <div className="min-w-0">
              <dt className="text-xs text-ink/60">Reference (Use your phone number)</dt>
              <dd className="mt-0.5">
                {phoneReference ? (
                  <span className="font-mono font-semibold text-charcoal tabular-nums">
                    {phoneReference}
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={onRequestPhoneFocus}
                    className="text-left text-xs font-medium text-[#a5432f] underline underline-offset-4"
                  >
                    Enter your mobile number above to generate reference →
                  </button>
                )}
              </dd>
            </div>
            {phoneReference && (
              <button
                type="button"
                onClick={() => handleCopy("reference", phoneReference)}
                className="inline-flex shrink-0 items-center gap-1 rounded-full border border-line bg-ivory px-2.5 py-1 text-xs font-medium text-ink/80 hover:border-ink"
              >
                {copiedKey === "reference" ? (
                  <>
                    <CheckIcon className="size-3.5 text-sage-deep" /> Copied
                  </>
                ) : (
                  <>
                    <CopyIcon className="size-3.5" /> Copy
                  </>
                )}
              </button>
            )}
          </div>

          <div className="py-2.5">
            <dt className="text-xs text-ink/60">Bank</dt>
            <dd className="mt-0.5 font-medium">{BANK_DETAILS.bankName}</dd>
          </div>

          <div className="py-2.5">
            <dt className="text-xs text-ink/60">Account name</dt>
            <dd className="mt-0.5 font-medium">{BANK_DETAILS.accountName}</dd>
          </div>

          <div className="flex items-center justify-between gap-3 py-2.5">
            <div>
              <dt className="text-xs text-ink/60">Account number</dt>
              <dd className="mt-0.5 font-mono font-semibold tabular-nums">
                {BANK_DETAILS.accountNumber}
              </dd>
            </div>
            <button
              type="button"
              onClick={() =>
                handleCopy(
                  "account",
                  BANK_DETAILS.accountNumber.replace(/\s+/g, ""),
                  onAccountNumberCopied,
                )
              }
              className="inline-flex items-center gap-1 rounded-full border border-line bg-ivory px-2.5 py-1 text-xs font-medium text-ink/80 hover:border-ink"
            >
              {copiedKey === "account" ? (
                <>
                  <CheckIcon className="size-3.5 text-sage-deep" /> Copied
                </>
              ) : (
                <>
                  <CopyIcon className="size-3.5" /> Copy
                </>
              )}
            </button>
          </div>

          <div className="py-2.5">
            <dt className="text-xs text-ink/60">Branch</dt>
            <dd className="mt-0.5 font-medium">{BANK_DETAILS.branch}</dd>
          </div>
        </dl>
      </div>

      {/* Payment Proof Upload */}
      <div>
        <div className="flex items-baseline justify-between gap-2">
          <label htmlFor={inputId} className="text-xs font-semibold tracking-wider text-charcoal uppercase">
            Upload payment proof (Required)
          </label>
          <span className="text-[11px] text-ink/55">JPG, PNG, WebP or PDF · &lt; 1 MB</span>
        </div>

        <input
          ref={inputRef}
          id={inputId}
          type="file"
          accept="image/jpeg,image/png,image/webp,application/pdf"
          onChange={handleFileSelect}
          disabled={compressing || submitting}
          className="sr-only"
        />

        {!file ? (
          <label
            htmlFor={inputId}
            className={`mt-2 flex cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed px-4 py-6 text-center transition ${
              fileError
                ? "border-[#a5432f] bg-[#a5432f]/5"
                : "border-ink/25 bg-mist/40 hover:border-ink/50"
            }`}
          >
            <span className="text-xs font-semibold text-charcoal">
              {compressing ? "Optimizing image…" : "Tap to select screenshot, slip photo, or PDF"}
            </span>
            <span className="mt-1 text-[11px] text-ink/60">
              Photos are automatically compressed under 1 MB. PDFs must be under 1 MB.
            </span>
          </label>
        ) : (
          <div className="mt-2 rounded-xl border border-sage-deep/35 bg-sage-soft/35 p-3">
            <div className="flex items-center gap-3">
              {previewUrl ? (
                <img
                  src={previewUrl}
                  alt="Selected payment proof"
                  className="size-16 shrink-0 rounded-lg border border-line bg-ivory object-cover"
                />
              ) : (
                <div className="grid size-16 shrink-0 place-items-center rounded-lg border border-line bg-ivory text-xs font-bold tracking-wider text-gold-deep uppercase">
                  PDF
                </div>
              )}
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-semibold text-charcoal">{file.name}</p>
                <p className="mt-0.5 text-[11px] text-sage-deep">
                  Ready · {formatFileSize(file.size)}
                </p>
                <div className="mt-1.5 flex flex-wrap gap-3">
                  <button
                    type="button"
                    onClick={() => inputRef.current?.click()}
                    disabled={submitting || compressing}
                    className="text-xs font-medium text-charcoal underline underline-offset-4"
                  >
                    Replace file
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      onFileChange(null);
                      onFileError?.(null);
                    }}
                    disabled={submitting || compressing}
                    className="inline-flex items-center gap-1 text-xs font-medium text-[#a5432f]"
                  >
                    <TrashIcon className="size-3.5" /> Remove
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {fileError && (
          <p role="alert" className="mt-2 text-xs font-medium text-[#a5432f]">
            {fileError}
          </p>
        )}
      </div>

      {onSubmitProof && (
        <button
          type="button"
          onClick={onSubmitProof}
          disabled={!file || compressing || submitting}
          className="btn btn-primary w-full disabled:opacity-50"
        >
          {submitting ? "Uploading payment proof…" : submitLabel ?? "Confirm payment & upload proof"}
        </button>
      )}
    </div>
  );
}
