import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ProductCard } from "@/components/product-card";
import { ProductView } from "@/components/product-view";
import { JsonLd } from "@/components/seo/json-ld";
import { colourOptions, getCategory } from "@/lib/catalog";
import { getAllCategories, getAllProducts, getProductBySlug } from "@/lib/catalog.server";
import { buildProductMetadata } from "@/lib/seo/metadata";
import {
  buildBreadcrumbSchema,
  buildProductBreadcrumbItems,
  buildProductSchema,
} from "@/lib/seo/schema";

export const ensureStatic = "navigation";

export async function generateStaticParams() {
  const products = await getAllProducts();
  if (products.length === 0) {
    return [{ slug: "_" }];
  }
  return products.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({
  params,
}: PageProps<"/product/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const p = await getProductBySlug(slug);
  if (!p) notFound();
  return buildProductMetadata(p);
}

export default async function ProductPage({ params }: PageProps<"/product/[slug]">) {
  const { slug } = await params;
  const [p, allProducts, categoryList] = await Promise.all([
    getProductBySlug(slug),
    getAllProducts(),
    getAllCategories(),
  ]);
  if (!p) notFound();

  const category =
    categoryList.find((c) => c.slug === p.categories[0]) ??
    getCategory(p.categories[0]) ?? {
      slug: p.categories[0] ?? "lawns",
      name: p.categories[0] ?? "Shop",
    };

  const colours = colourOptions(p, allProducts);
  const relatedItems = allProducts
    .filter(
      (x) =>
        x.categories[0] === p.categories[0] &&
        x.slug !== p.slug &&
        !colours.some((c) => c.slug === x.slug),
    )
    .slice(0, 4);

  const moreFromBrand = allProducts
    .filter(
      (x) =>
        x.slug !== p.slug &&
        !colours.some((c) => c.slug === x.slug) &&
        !relatedItems.some((r) => r.slug === x.slug),
    )
    .slice(0, 4);

  const productSchema = buildProductSchema(p, {
    categoryName: category.name,
    colourSiblings: colours,
  });
  const breadcrumbSchema = buildBreadcrumbSchema(buildProductBreadcrumbItems(p, category));

  return (
    <>
      <JsonLd data={productSchema} />
      <JsonLd data={breadcrumbSchema} />

      <ProductView product={p} colours={colours} />

      {relatedItems.length > 0 && (
        <section
          className="mx-auto max-w-7xl px-4 py-16 sm:px-8 sm:py-20"
          aria-labelledby="related"
        >
          <div className="flex items-end justify-between gap-4">
            <h2 id="related" className="display text-4xl sm:text-5xl">
              more from <em className="text-sage-deep">{category.name.toLowerCase()}</em>
            </h2>
            <Link
              href={`/shop/${category.slug}`}
              className="link-underline mb-1 shrink-0 text-xs font-semibold tracking-[0.16em] uppercase"
            >
              View all {category.name}
            </Link>
          </div>
          <div className="mt-8 grid grid-cols-2 gap-x-3 gap-y-10 sm:grid-cols-4 sm:gap-x-6">
            {relatedItems.map((r) => (
              <ProductCard key={r.slug} product={r} />
            ))}
          </div>
        </section>
      )}

      {moreFromBrand.length > 0 && (
        <section
          className="mx-auto max-w-7xl border-t border-line px-4 py-16 sm:px-8 sm:py-20"
          aria-labelledby="more-from-brand"
        >
          <div className="flex items-end justify-between gap-4">
            <div>
              <p className="eyebrow text-gold-deep">The Desi Wardrobe</p>
              <h2 id="more-from-brand" className="display mt-2 text-4xl sm:text-5xl">
                more from <em className="text-sage-deep">almera</em>
              </h2>
            </div>
            <Link
              href="/brand/almera"
              className="link-underline mb-1 shrink-0 text-xs font-semibold tracking-[0.16em] uppercase"
            >
              Explore almera collection
            </Link>
          </div>
          <div className="mt-8 grid grid-cols-2 gap-x-3 gap-y-10 sm:grid-cols-4 sm:gap-x-6">
            {moreFromBrand.map((item) => (
              <ProductCard key={item.slug} product={item} />
            ))}
          </div>
        </section>
      )}
    </>
  );
}
