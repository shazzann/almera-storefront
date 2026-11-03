"use client";

import { cdnImageForWidth, isCdnUrl, originalOfVariant, publicImageUrl } from "@/lib/image-url";
import NextImage, { type ImageLoaderProps, type ImageProps } from "next/image";
import { useMemo } from "react";

/** Unsplash resizes its own photos, and its originals are too big for the image optimizer to fetch in time. */
function unsplashLoader({ src, width, quality }: ImageLoaderProps) {
  return `${src}${src.includes("?") ? "&" : "?"}w=${width}&q=${quality ?? 75}&auto=format&fit=crop`;
}

/** Our CDN keeps 320px and 640px copies of every photo, so phones download only what they can show. */
function cdnLoader({ src, width }: ImageLoaderProps) {
  return cdnImageForWidth(src, width);
}

export default function Image(props: ImageProps) {
  const srcString = typeof props.src === "string" ? props.src : null;

  // Resolve to canonical Cloudflare CDN URL if it's a storage path or Supabase URL
  const resolvedSrc = useMemo(() => {
    if (!srcString) return props.src;
    return publicImageUrl(srcString);
  }, [srcString, props.src]);

  const fromUnsplash = typeof resolvedSrc === "string" && resolvedSrc.includes("images.unsplash.com");
  const fromCdn = typeof resolvedSrc === "string" && isCdnUrl(resolvedSrc);
  const loader = fromUnsplash ? unsplashLoader : fromCdn ? cdnLoader : undefined;

  return (
    <NextImage
      {...props}
      src={resolvedSrc}
      {...(loader ? { loader } : {})}
      onError={(e) => {
        const img = e.currentTarget;
        // A missing smaller copy falls back to the full photo, and a missing photo to the placeholder.
        const original = originalOfVariant(img.currentSrc || img.src);
        img.srcset = "";
        if (original) {
          img.src = original;
          return;
        }
        if (!img.src.endsWith("/placeholder.svg")) img.src = "/placeholder.svg";
        props.onError?.(e);
      }}
    />
  );
}
