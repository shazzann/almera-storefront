import { readFile } from "node:fs/promises";
import { join } from "node:path";
import sharp from "sharp";

let cachedLogoDataUri: string | null = null;

export async function getBrandLogoDataUri(): Promise<string | null> {
  if (cachedLogoDataUri) return cachedLogoDataUri;
  try {
    const filePath = join(process.cwd(), "public", "brand", "almera-logo-new.jpeg");
    const buf = await readFile(filePath);
    const resized = await sharp(buf).resize(360, 360, { fit: "cover" }).jpeg({ quality: 82 }).toBuffer();
    cachedLogoDataUri = `data:image/jpeg;base64,${resized.toString("base64")}`;
    return cachedLogoDataUri;
  } catch {
    return null;
  }
}

/**
 * Fetches a remote product/category image (including .webp from CDN) and converts
 * it to a JPEG base64 data URI compatible with `next/og` (Satori).
 */
export async function fetchRemoteImageAsDataUri(
  url?: string | null,
  width = 520,
  height = 630,
): Promise<string | null> {
  if (!url || !url.startsWith("http")) return null;
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 3000);
    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timer);
    if (!res.ok) return null;
    const arrayBuf = await res.arrayBuffer();
    const jpegBuf = await sharp(Buffer.from(arrayBuf))
      .resize(width, height, { fit: "cover" })
      .jpeg({ quality: 82 })
      .toBuffer();
    return `data:image/jpeg;base64,${jpegBuf.toString("base64")}`;
  } catch {
    return null;
  }
}

