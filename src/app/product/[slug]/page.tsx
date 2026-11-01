import type { Metadata } from "next";
import { Suspense } from "react";
import { notFound } from "next/navigation";
import { ProductCard } from "@/components/product-card";
import { ProductView } from "@/components/product-view";
import { colourOptions, getCategory, nameWithColour, startingPrice } from "@/lib/catalog";
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
      <ProductView product={p} colours={colours} />

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

