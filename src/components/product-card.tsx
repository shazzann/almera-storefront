import Image from "next/image";
import Link from "next/link";
import { formatLKR, startingPrice, stitchingOptions, type Product } from "@/lib/catalog";

export function stockNote(p: Product) {
  if (p.stock === 0) return "Sold out";
  if (p.stock <= 3) return `Only ${p.stock} left`;
  return null;
}

export function ProductCard({ product: p, priority = false, sizes = "(min-width: 1024px) 23vw, (min-width: 640px) 31vw, 46vw" }: { product: Product; priority?: boolean; sizes?: string }) {
  const options = stitchingOptions(p);
  const from = startingPrice(p);
  const was = p.wasPrice ? Math.min(...Object.values(p.wasPrice)) : null;
  const note = stockNote(p);
  const soldOut = p.stock === 0;

  return (
    <Link href={`/product/${p.slug}`} className="group block">
      <div className="arch-soft relative aspect-[3/4] overflow-hidden bg-sage-soft">
        <Image
          src={p.images[0]}
          alt={`${p.name}, ${p.colour.toLowerCase()} ${p.fabric.toLowerCase()}`}
          fill
          sizes={sizes}
          loading={priority ? "eager" : undefined}
          className={`object-cover transition duration-[1.2s] ease-[var(--ease-out-soft)] group-hover:scale-[1.04] ${soldOut ? "grayscale-[60%] opacity-70" : ""}`}
        />
        {p.images[1] && (
          <Image
            src={p.images[1]}
            alt=""
            fill
            sizes={sizes}
            className="object-cover opacity-0 transition-opacity duration-700 [@media(hover:hover)]:group-hover:opacity-100"
          />
        )}
        {note && (
          <span className={`absolute bottom-3 left-3 rounded-full px-2.5 py-1 text-[0.65rem] font-semibold tracking-[0.08em] uppercase backdrop-blur ${soldOut ? "bg-ink/80 text-ivory" : "bg-ivory/90 text-gold-deep"}`}>
            {note}
          </span>
        )}
      </div>
      <div className="px-0.5 pt-3.5">
        <p className="text-[0.65rem] font-semibold tracking-[0.14em] text-ink/50 uppercase">
          {options.length === 2 ? "Stitched or unstitched" : options[0] === "stitched" ? "Ready to wear" : "Unstitched"}
        </p>
        <h3 className="mt-1 text-[0.95rem] leading-snug font-medium group-hover:text-sage-deep sm:text-base">{p.name}</h3>
        <p className="mt-1 text-[0.9rem]">
          {options.length > 1 && <span className="text-ink/55">From </span>}
          <span className={`whitespace-nowrap font-semibold ${was ? "text-bark" : ""}`}>{formatLKR(from)}</span>
          {was && <s className="ml-2 text-[0.8rem] whitespace-nowrap text-ink/40">{formatLKR(was)}</s>}
        </p>
      </div>
    </Link>
  );
}
