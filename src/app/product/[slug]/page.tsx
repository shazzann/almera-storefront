import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { notFound } from "next/navigation";
import { ColourPicker } from "@/components/colour-picker";
import { ProductCard } from "@/components/product-card";
import { ProductGallery } from "@/components/product-gallery";
import { ProductPurchase } from "@/components/product-purchase";
import { colourOptions, getCategory, nameWithColour, startingPrice, stitchingOptions } from "@/lib/catalog";
import { getAllProducts, getProductBySlug } from "@/lib/catalog.server";

export async function generateStaticParams() {
  const products = await getAllProducts();
  if (products.length === 0) {
    return [{ slug: "_" }];
  }
  return products.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: PageProps<"/product/[slug]">): Promise<Metadata> {
  const p = await getProductBySlug((await params).slug);
  if (!p) return {};
  return {
    title: `${nameWithColour(p)}, ${p.fabric}`,
    description: `${p.description} Shop online at almera with island-wide delivery in Sri Lanka.`,
    alternates: { canonical: `/product/${p.slug}` },
    openGraph: p.images[0] ? { images: [{ url: `${p.images[0]}?w=1200&h=1500&fit=crop`, alt: p.name }] } : undefined,
  };
}

export default function ProductPage({ params }: PageProps<"/product/[slug]">) {
  return (
    <Suspense fallback={<ProductSkeleton />}>
      <ProductDetails params={params} />
    </Suspense>
  );
}

function ProductSkeleton() {
  return (
    <div className="mx-auto max-w-7xl animate-pulse lg:grid lg:grid-cols-[1.15fr_1fr] lg:gap-14 lg:px-8 lg:pt-10" aria-busy="true">
      <div className="aspect-[4/5] bg-sage-soft lg:arch" />
      <div className="space-y-4 px-4 pt-6 sm:px-8 lg:px-0 lg:pt-0">
        <div className="h-3 w-32 rounded bg-sage-soft" />
        <div className="h-12 w-3/4 rounded bg-sage-soft" />
        <div className="h-4 w-full rounded bg-sage-soft" />
        <div className="h-4 w-2/3 rounded bg-sage-soft" />
        <div className="h-13 w-full rounded-full bg-sage-soft" />
      </div>
    </div>
  );
}

async function ProductDetails({ params }: Pick<PageProps<"/product/[slug]">, "params">) {
  const slug = (await params).slug;
  const [p, allProducts] = await Promise.all([getProductBySlug(slug), getAllProducts()]);
  if (!p) notFound();
  const category = getCategory(p.categories[0]) ?? {
    slug: p.categories[0] ?? "lawns",
    name: p.categories[0] ?? "Shop",
  };
  const options = stitchingOptions(p);
  const colours = colourOptions(p, allProducts);
  const relatedItems = allProducts
    .filter((x) => x.categories[0] === p.categories[0] && x.slug !== p.slug && !colours.includes(x))
    .slice(0, 4);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: p.name,
    description: p.description,
    image: p.images.map((i) => `${i}?w=1200`),
    brand: { "@type": "Brand", name: "almera" },
    category: category.name,
    color: p.colour,
    material: p.fabric,
    offers: {
      "@type": "AggregateOffer",
      priceCurrency: "LKR",
      lowPrice: startingPrice(p),
      highPrice: Math.max(...Object.values(p.price).filter((v): v is number => typeof v === "number")),
      availability: p.stock > 0 ? "https://schema.org/InStock" : "https://schema.org/SoldOut",
    },
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <div className="mx-auto max-w-7xl lg:grid lg:grid-cols-[1.15fr_1fr] lg:gap-14 lg:px-8 lg:pt-10">
        <ProductGallery key={p.slug} images={p.images} name={p.name} />

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
                <ColourPicker current={p} options={colours} />
              </div>
            )}

            <div className="mt-6">
              <ProductPurchase key={p.slug} product={p} />
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
                Island-wide courier in 2–4 working days. Stitched orders take 5–7 days before dispatch. Free island-wide delivery on orders over Rs. 25,000.
              </Detail>
              <Detail title="Order policy">
                All sales are final: we don’t offer exchanges, returns or refunds. Colours may vary slightly between screens. Check the size guide or message us before ordering.{" "}
                <Link href="/help#policy" className="underline underline-offset-4">Read the full policy</Link>
              </Detail>
            </div>
          </div>
        </div>
      </div>

      {relatedItems.length > 0 && (
        <section className="mx-auto max-w-7xl px-4 py-16 sm:px-8 sm:py-24" aria-labelledby="related">
          <h2 id="related" className="display text-4xl sm:text-5xl">
            more from <em className="text-sage-deep">{category.name.toLowerCase()}</em>
          </h2>
          <div className="mt-8 grid grid-cols-2 gap-x-3 gap-y-10 sm:grid-cols-4 sm:gap-x-6">
            {relatedItems.map((r) => (
              <ProductCard key={r.slug} product={r} />
            ))}
          </div>
        </section>
      )}
    </>
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
