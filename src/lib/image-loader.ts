"use client";

type LoaderArgs = { src: string; width: number; quality?: number };

export default function imageLoader({ src, width, quality }: LoaderArgs) {
  if (src.startsWith("/")) return `${src}?w=${width}`;
  return `${src}?w=${width}&q=${quality ?? 75}&auto=format&fit=crop`;
}
