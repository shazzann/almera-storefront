"use client";

import { isCdnUrl, publicImageUrl } from "@/lib/image-url";
import NextImage, { type ImageLoaderProps, type ImageProps } from "next/image";
import { useMemo } from "react";

/** Unsplash resizes its own photos, and its originals are too big for the image optimizer to fetch in time. */
function unsplashLoader({ src, width, quality }: ImageLoaderProps) {
  return `${src}${src.includes("?") ? "&" : "?"}w=${width}&q=${quality ?? 75}&auto=format&fit=crop`;
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

  // Pre-optimized CDN assets bypass Next serverless re-encoding to pull directly from Cloudflare PoPs
  const shouldBeUnoptimized = props.unoptimized ?? (fromCdn ? true : undefined);

  return (
    <NextImage
      {...props}
      src={resolvedSrc}
      unoptimized={shouldBeUnoptimized}
      {...(fromUnsplash ? { loader: unsplashLoader } : {})}
      onError={(e) => {
        // Fallback to branded placeholder if image fails to load or 404s
        if (!e.currentTarget.src.endsWith("/placeholder.svg")) {
          e.currentTarget.src = "/placeholder.svg";
        }
        props.onError?.(e);
      }}
    />
  );
}
