"use client";

import Image from "@/components/image";
import Link from "next/link";
import { useState } from "react";
import { formatLKR, startingPrice, stitchingOptions, type Product } from "@/lib/catalog";

const FALLBACK_IMAGE = "https://images.unsplash.com/photo-1745313452052-0e4e341f326c";

export function stockNote(p: Product) {
  if (p.stock === 0) return "Sold out";
  if (p.stock <= 3) return `Only ${p.stock} left`;
  return null;
}

export function ProductCard({
  product: p,
  priority = false,
  sizes = "(min-width: 1024px) 23vw, (min-width: 640px) 31vw, 46vw",
}: {
  product: Product;
  priority?: boolean;
  sizes?: string;
}) {
  const [loaded, setLoaded] = useState(false);
  const [hovered, setHovered] = useState(false);
  const options = stitchingOptions(p);
  const from = startingPrice(p);
  const was = p.wasPrice ? Math.min(...Object.values(p.wasPrice)) : null;
  const note = stockNote(p);
  const soldOut = p.stock === 0;
  const primarySrc = p.images[0] || FALLBACK_IMAGE;
  const secondarySrc = p.images[1];

  return (
    <Link
      href={`/product/${p.slug}`}
      className="group block"
      onPointerEnter={() => setHovered(true)}
      onFocus={() => setHovered(true)}
    >
      <div className="arch-soft relative aspect-[3/4] overflow-hidden bg-sage-soft">
        {!loaded && (
          <div
            aria-hidden="true"
            className="absolute inset-0 animate-pulse bg-gradient-to-b from-sage-soft via-ivory/60 to-sage-soft"
          />
        )}
        <Image
          src={primarySrc}
          alt={`${p.name}, ${p.colour.toLowerCase()} ${p.fabric.toLowerCase()}`}
          fill
          sizes={sizes}
          priority={priority}
          loading={priority ? "eager" : "lazy"}
          decoding="async"
          onLoad={() => setLoaded(true)}
          className={`object-cover transition duration-[1.2s] ease-[var(--ease-out-soft)] group-hover:scale-[1.04] ${
            loaded ? "opacity-100" : "opacity-0"
          } ${soldOut ? "grayscale-[60%] opacity-70" : ""}`}
        />
        {secondarySrc && hovered && (
          <Image
            src={secondarySrc}
            alt=""
            fill
            sizes={sizes}
            loading="lazy"
            decoding="async"
            className="object-cover opacity-0 transition-opacity duration-700 [@media(hover:hover)]:group-hover:opacity-100"
          />
        )}
        {note && (
          <span
            className={`absolute bottom-3 left-3 rounded-full px-2.5 py-1 text-[0.65rem] font-semibold tracking-[0.08em] uppercase backdrop-blur ${
              soldOut ? "bg-ink/80 text-ivory" : "bg-ivory/90 text-gold-deep"
            }`}
          >
            {note}
          </span>
        )}
      </div>
      <div className="px-0.5 pt-3.5">
        <p className="text-[0.65rem] font-semibold tracking-[0.14em] text-ink/50 uppercase">
          {options.length === 2
            ? "Stitched or unstitched"
            : options[0] === "stitched"
              ? "Ready to wear"
              : "Unstitched"}
        </p>
        <h3 className="mt-1 text-[0.95rem] leading-snug font-medium group-hover:text-sage-deep sm:text-base">
          {p.name}
        </h3>
        <p className="mt-1 text-[0.9rem]">
          {options.length > 1 && <span className="text-ink/55">From </span>}
          <span className={`whitespace-nowrap font-semibold ${was ? "text-bark" : ""}`}>
            {formatLKR(from)}
          </span>
          {was && <s className="ml-2 text-[0.8rem] whitespace-nowrap text-ink/40">{formatLKR(was)}</s>}
        </p>
      </div>
    </Link>
  );
}
