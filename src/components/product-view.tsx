"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { DELIVERY, FREE_DELIVERY_FROM, formatLKR, getCategory, nameWithColour, stitchingOptions, type Product } from "@/lib/catalog";
import { ColourPicker } from "./colour-picker";
import { ProductGallery } from "./product-gallery";
import { ProductPurchase } from "./product-purchase";

/**
 * Every colour of an item arrives with the page, so switching only swaps what is on screen.
 * The address still changes, which keeps refreshing and sharing on the chosen colour.
 */
export function ProductView({ product, colours }: { product: Product; colours: Product[] }) {
  const pathname = usePathname();
  const p = colours.find((o) => pathname === `/product/${o.slug}`) ?? product;
  const [preload, setPreload] = useState(false);

  const category = getCategory(p.categories[0]) ?? {
    slug: p.categories[0] ?? "lawns",
    name: p.categories[0] ?? "Shop",
  };
  const options = stitchingOptions(p);

  useEffect(() => {
    document.title = `${nameWithColour(p)}, ${p.fabric} · almera`;
  }, [p]);

  // Fetch the other colours' main photos once this page has settled, so they appear straight away.
  useEffect(() => {
    if (colours.length === 0) return;
    const timer = setTimeout(() => setPreload(true), 800);
    return () => clearTimeout(timer);
  }, [colours.length]);

  return (
    <div className="mx-auto max-w-7xl lg:grid lg:grid-cols-[1.15fr_1fr] lg:gap-14 lg:px-8 lg:pt-10">
      <ProductGallery key={p.slug} images={p.images} name={p.name} />

      {preload && (
        <div aria-hidden className="pointer-events-none fixed top-0 left-0 size-px overflow-hidden opacity-0">
          {colours.filter((o) => o.images[0]).map((o) => (
            <Image key={o.slug} src={o.images[0]} alt="" width={1} height={1} sizes="(min-width: 1024px) 55vw, 100vw" loading="eager" />
          ))}
        </div>
      )}

      <div className="px-4 pt-6 sm:px-8 lg:px-0 lg:pt-0">
        <div className="lg:sticky lg:top-28">
          <nav aria-label="Breadcrumb" className="text-xs text-ink/55">
            <Link href="/shop" className="hover:text-ink">Shop</Link>
            <span className="mx-1.5">/</span>
            <Link href={`/shop/${category.slug}`} className="hover:text-ink">{category.name}</Link>
          </nav>
          <h1 className="display mt-3 text-[2.6rem] sm:text-5xl lg:text-[3.6rem]">{p.name}</h1>
          <p className="mt-3 text-sm text-ink/60">
            {p.colour} · {p.fabric} · {options.length === 2 ? "Stitched or unstitched" : "Ready to wear"}
          </p>
          <p className="mt-5 leading-relaxed text-ink/80">{p.description}</p>

          {colours.length > 0 && (
            <div className="mt-6">
              <ColourPicker current={p} options={colours} onSelect={(slug) => window.history.replaceState(null, "", `/product/${slug}`)} />
            </div>
          )}

          <div className="mt-6">
            <ProductPurchase product={p} />
          </div>

          <div className="mt-8 divide-y divide-line border-y border-line">
            <Detail title="What’s included" open>
              <ul className="space-y-1.5">
                {p.pieces.map((x) => (
                  <li key={x} className="flex gap-2.5"><span className="mt-2 size-1 shrink-0 rounded-full bg-gold" />{x}</li>
                ))}
              </ul>
            </Detail>
            <Detail title="Fabric & care">
              {p.fabric}. {p.care ?? "Dry clean for the first wash. After that, hand wash cold, separately, and dry in the shade. Iron on the reverse side."}
            </Detail>
            <Detail title="Delivery">
              Island-wide courier in 2–4 working days. Stitched orders take 5–7 days before dispatch. Delivery is {formatLKR(DELIVERY.standard.firstPiece)} for the first piece and {formatLKR(DELIVERY.standard.extraPiece)} for each extra piece. Free island-wide delivery on orders over {formatLKR(FREE_DELIVERY_FROM)}.
            </Detail>
            <Detail title="Order policy">
              All sales are final: we don’t offer exchanges, returns or refunds. Colours may vary slightly between screens. Check the size guide or message us before ordering.{" "}
              <Link href="/help#policy" className="underline underline-offset-4">Read the full policy</Link>
            </Detail>
          </div>
        </div>
      </div>
    </div>
  );
}

function Detail({ title, children, open }: { title: string; children: React.ReactNode; open?: boolean }) {
  return (
    <details className="group" open={open}>
      <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between font-medium [&::-webkit-details-marker]:hidden">
        {title}
        <span className="relative size-3.5" aria-hidden>
          <span className="absolute top-1/2 left-0 h-px w-full bg-ink" />
          <span className="absolute top-0 left-1/2 h-full w-px bg-ink transition-transform duration-300 group-open:scale-y-0" />
        </span>
      </summary>
      <div className="pb-5 text-[0.95rem] leading-relaxed text-ink/70">{children}</div>
    </details>
  );
}
