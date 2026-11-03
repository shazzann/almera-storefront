"use client";

import { useState } from "react";
import Image from "@/components/image";

/**
 * A past order's photo. Deleting a product removes its photos, so orders for it show a clear
 * "Photo unavailable" tile instead of a broken image. Place inside a positioned box.
 */
export function OrderItemPhoto({ src, alt = "", sizes, compact = false }: { src: string | null | undefined; alt?: string; sizes: string; compact?: boolean }) {
  const [failed, setFailed] = useState(!src);

  if (failed) {
    return (
      <span role="img" aria-label="Photo unavailable" title="Photo unavailable" className="absolute inset-0 flex flex-col items-center justify-center gap-0.5 bg-mist px-1 text-center text-ink/45">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden className={compact ? "size-4" : "size-5"}>
          <rect x="3.5" y="5" width="17" height="14" rx="2.5" />
          <path d="m3.5 15 4.5-4.5 4 4 2.5-2.5 6 6" />
          <path d="M4 4l16 16" />
        </svg>
        {!compact && <span className="text-[0.6rem] leading-tight font-medium">Photo unavailable</span>}
      </span>
    );
  }

  return <Image src={src!} alt={alt} fill sizes={sizes} className="object-cover" onError={() => setFailed(true)} />;
}
