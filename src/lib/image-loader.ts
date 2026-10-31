"use client";

type LoaderArgs = { src: string; width: number; quality?: number };

const STORAGE_MARKER = "/product-images/";

export default function imageLoader({ src, width, quality }: LoaderArgs): string {
  if (!src) return "/placeholder.svg";

  // Local public assets (/images/...)
  if (src.startsWith("/") && !src.startsWith(STORAGE_MARKER)) {
    return `${src}${src.includes("?") ? "&" : "?"}w=${width}&q=${quality ?? 80}`;
  }

  // Unsplash URLs: append width/quality/crop parameters
  if (src.includes("images.unsplash.com")) {
    const sep = src.includes("?") ? "&" : "?";
    return `${src}${sep}w=${width}&q=${quality ?? 75}&auto=format&fit=crop`;
  }

  // Other external HTTP(S) URLs
  if (src.startsWith("http://") || src.startsWith("https://")) {
    return src;
  }

  // Relative Supabase storage paths (e.g. "products/zoya-lawn-1.webp" or "/product-images/...")
  const cdnBase = (
    process.env.NEXT_PUBLIC_SUPABASE_CDN_URL ||
    process.env.NEXT_PUBLIC_SUPABASE_URL ||
    ""
  ).replace(/\/+$/, "");

  const cleanPath = src.includes(STORAGE_MARKER)
    ? src.slice(src.indexOf(STORAGE_MARKER) + STORAGE_MARKER.length).split("?")[0]
    : src.replace(/^\/+/, "");

  if (!cdnBase) return src;
  return `${cdnBase}/storage/v1/object/public/product-images/${cleanPath}`;
}
