const STORAGE_BUCKET = "product-images";

/**
 * Returns the configured CDN host (e.g. https://cdn.almera.lk).
 * Defaults directly to the production Cloudflare Edge CDN.
 */
export function getCdnHost(): string {
  const host =
    process.env.NEXT_PUBLIC_CDN_URL ||
    process.env.NEXT_PUBLIC_STORAGE_CDN_URL ||
    process.env.STORAGE_CDN_URL ||
    "https://cdn.almera.lk";

  return host.replace(/\/+$/, "");
}

/**
 * Extracts the clean file path within the storage bucket from any legacy proxy URL,
 * direct storage URL, or raw relative path (stripping query parameters and hash).
 * Returns null if the source is an external URL (e.g. Unsplash) or not a storage path.
 */
export function getStoragePath(source: string | null | undefined): string | null {
  if (!source || typeof source !== "string") return null;

  const trimmed = source.trim();
  if (!trimmed || trimmed.startsWith("data:") || trimmed.startsWith("blob:")) {
    return null;
  }

  // Preserve external third-party hosts like Unsplash
  if (trimmed.includes("images.unsplash.com")) {
    return null;
  }

  // Strip query string and fragment
  const cleanUrl = trimmed.split(/[?#]/)[0];

  // Pattern 1: Legacy proxy route e.g. /api/public/image/<path>
  const legacyProxyMatch = cleanUrl.match(/(?:\/api\/public\/image\/)(.+)$/);
  if (legacyProxyMatch) {
    return sanitizePath(legacyProxyMatch[1]);
  }

  // Pattern 2: Supabase / CDN public object path e.g. .../storage/v1/object/public/<bucket>/<path>
  const storageObjectMatch = cleanUrl.match(
    new RegExp(`(?:/storage/v1/object/public/${STORAGE_BUCKET}/)(.+)$`),
  );
  if (storageObjectMatch) {
    return sanitizePath(storageObjectMatch[1]);
  }

  // Generic bucket match for any /storage/v1/object/public/<any-bucket>/<path>
  const genericStorageMatch = cleanUrl.match(/(?:\/storage\/v1\/object\/public\/[^/]+\/)(.+)$/);
  if (genericStorageMatch) {
    return sanitizePath(genericStorageMatch[1]);
  }

  // Pattern 3: If it's already a relative storage path (e.g., "products/123-abc.webp" or "/products/...")
  if (!cleanUrl.startsWith("http://") && !cleanUrl.startsWith("https://")) {
    // If it starts with local static assets (like /brand/, /placeholder.svg), do not treat as storage
    if (
      cleanUrl.startsWith("/brand/") ||
      cleanUrl === "/placeholder.svg" ||
      cleanUrl === "/icon.svg" ||
      cleanUrl === "/favicon.ico"
    ) {
      return null;
    }

    const stripped = cleanUrl.replace(/^\/+/, "");
    // If someone prefixed the bucket name e.g. "product-images/products/...", strip bucket
    if (stripped.startsWith(`${STORAGE_BUCKET}/`)) {
      return sanitizePath(stripped.slice(STORAGE_BUCKET.length + 1));
    }
    return sanitizePath(stripped);
  }

  return null;
}

/**
 * Sanitizes a file path: removes leading/trailing slashes and directory traversal.
 */
function sanitizePath(path: string): string {
  return path.replace(/^\/+/, "").replace(/\/+$/, "").replace(/\.\./g, "");
}

/**
 * Builds the canonical Cloudflare Edge CDN URL for a bucket file path.
 * Format: ${cdnHost}/storage/v1/object/public/<bucket-name>/${cleanPath}
 */
export function buildImageUrl(filePath: string): string {
  const cleanPath = getStoragePath(filePath) || sanitizePath(filePath);
  const host = getCdnHost();
  return `${host}/storage/v1/object/public/${STORAGE_BUCKET}/${cleanPath}`;
}

/**
 * Converts any raw or legacy URL into the canonical CDN URL.
 * Preserves Unsplash URLs, local public assets, and data URIs untouched.
 */
export function publicImageUrl(source: string | null | undefined): string {
  if (!source) return "";

  const trimmed = source.trim();
  if (
    trimmed.startsWith("data:") ||
    trimmed.startsWith("blob:") ||
    trimmed.includes("images.unsplash.com") ||
    trimmed.startsWith("/brand/") ||
    trimmed === "/placeholder.svg" ||
    trimmed === "/icon.svg" ||
    trimmed === "/favicon.ico"
  ) {
    return trimmed;
  }

  const storagePath = getStoragePath(trimmed);
  if (storagePath) {
    return buildImageUrl(storagePath);
  }

  return trimmed;
}

/**
 * Cache HIT Maximizer for Responsive Images.
 * Returns undefined to omit browser srcset fragmentation, ensuring all clients pull
 * the exact same pre-optimized WebP asset from Cloudflare Edge PoPs for a ~100% cache HIT ratio.
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function responsiveImageSrcSet(_source?: string): undefined {
  return undefined;
}

/**
 * Checks whether a given image URL belongs to the Cloudflare CDN or Supabase storage origin.
 */
export function isCdnUrl(url: string | null | undefined): boolean {
  if (!url || typeof url !== "string") return false;
  const cdnHost = getCdnHost();
  const supabaseHost = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
  return url.startsWith(cdnHost) || (Boolean(supabaseHost) && url.startsWith(supabaseHost));
}
