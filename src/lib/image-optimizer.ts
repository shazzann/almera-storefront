"use client";

export type OptimizeImageOptions = {
  maxWidth?: number;
  maxHeight?: number;
  quality?: number;
};

/**
 * Compresses and converts an uploaded image to WebP in the browser before
 * uploading to Supabase Storage (`product-images` bucket).
 */
export async function optimizeImageToWebP(
  file: File,
  options: OptimizeImageOptions = {},
): Promise<File> {
  const maxWidth = options.maxWidth ?? 1200;
  const maxHeight = options.maxHeight ?? 1600;
  const quality = options.quality ?? 0.82;

  if (typeof window === "undefined") return file;

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

  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob((b) => resolve(b), "image/webp", quality),
  );
  if (!blob) return file;

  const baseName = file.name.replace(/\.[^/.]+$/, "");
  return new File([blob], `${baseName}.webp`, { type: "image/webp" });
}

