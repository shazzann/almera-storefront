"use client";

import Image from "@/components/image";
import Link from "next/link";
import type { MouseEvent } from "react";
import type { Product } from "@/lib/catalog";

/** Each colour is its own listing with its own address, so these stay real links that can open in a new tab. */
export function ColourPicker({ current, options, onSelect }: { current: Product; options: Product[]; onSelect: (slug: string) => void }) {
  const choose = (e: MouseEvent, slug: string) => {
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    e.preventDefault();
    onSelect(slug);
  };

  return (
    <div>
      <p className="text-sm" aria-live="polite">
        <span className="text-ink/60">Colour: </span>
        <span className="font-medium">{current.colour}</span>
      </p>
      <ul className="no-scrollbar -mx-4 mt-3 flex gap-3 overflow-x-auto px-4 py-1 sm:-mx-8 sm:px-8 lg:mx-0 lg:flex-wrap lg:px-1">
        {options.map((o) => {
          const active = o.slug === current.slug;
          const soldOut = o.stock <= 0;
          return (
            <li key={o.slug} className="w-[4.5rem] shrink-0">
              <Link
                href={`/product/${o.slug}`}
                prefetch={false}
                onClick={(e) => choose(e, o.slug)}
                aria-current={active ? "true" : undefined}
                aria-label={`${o.colour}${soldOut ? ", sold out" : ""}`}
                className="block text-center"
              >
                <span className={`arch-soft relative block aspect-[3/4] overflow-hidden bg-sage-soft ${active ? "ring-2 ring-ink ring-offset-2 ring-offset-mist" : ""}`}>
                  {o.images[0] && <Image src={o.images[0]} alt="" fill sizes="72px" className={`object-cover ${soldOut ? "opacity-45" : ""}`} />}
                </span>
                <span className={`mt-2 block text-xs leading-tight ${active ? "font-semibold" : "text-ink/70"}`}>{o.colour}</span>
                {soldOut && <span className="block text-[0.68rem] text-ink/55">Sold out</span>}
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
