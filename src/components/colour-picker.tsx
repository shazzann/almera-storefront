import Image from "next/image";
import Link from "next/link";
import type { Product } from "@/lib/catalog";

/** Each colour is its own listing, so choosing one opens that listing's photos, price and stock. */
export function ColourPicker({ current, options }: { current: Product; options: Product[] }) {
  return (
    <div>
      <p className="text-sm">
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
