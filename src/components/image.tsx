"use client";

import NextImage, { type ImageLoaderProps, type ImageProps } from "next/image";

/** Unsplash resizes its own photos, and its originals are too big for the image optimizer to fetch in time. */
function unsplashLoader({ src, width, quality }: ImageLoaderProps) {
  return `${src}${src.includes("?") ? "&" : "?"}w=${width}&q=${quality ?? 75}&auto=format&fit=crop`;
}

export default function Image(props: ImageProps) {
  const fromUnsplash = typeof props.src === "string" && props.src.includes("images.unsplash.com");
  return <NextImage {...props} {...(fromUnsplash ? { loader: unsplashLoader } : {})} />;
}
