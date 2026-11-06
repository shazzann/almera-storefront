import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { JsonLd } from "@/components/seo/json-ld";
import { ShopBrowser } from "@/components/shop-browser";
import { categories, getCategory, inCategory } from "@/lib/catalog";
import { getAllCategories, getAllProducts } from "@/lib/catalog.server";
import { CATEGORY_SEO_CONTENT } from "@/lib/seo/faq-content";
import { buildCategoryMetadata } from "@/lib/seo/metadata";
import {
  buildBreadcrumbSchema,
  buildCollectionPageSchema,
  buildFaqSchema,
} from "@/lib/seo/schema";

export const ensureStatic = "navigation";

export function generateStaticParams() {
  return categories.map((c) => ({ category: c.slug }));
}

export async function generateMetadata({
  params,
}: PageProps<"/shop/[category]">): Promise<Metadata> {
  const slug = (await params).category;
  const allCats = await getAllCategories();
  const c = allCats.find((cat) => cat.slug === slug) ?? getCategory(slug);
  if (!c) notFound();
  return buildCategoryMetadata({ category: c });
}

export default async function CategoryPage({ params }: PageProps<"/shop/[category]">) {
  const slug = (await params).category;
  const [allCats, products] = await Promise.all([getAllCategories(), getAllProducts()]);
  const c = allCats.find((cat) => cat.slug === slug) ?? getCategory(slug);
  if (!c) notFound();

  const categoryProducts = products.filter((p) => inCategory(p, c.slug));
  const copy = CATEGORY_SEO_CONTENT[c.slug] ?? CATEGORY_SEO_CONTENT.all;

  return (
    <>
      <JsonLd
        data={buildCollectionPageSchema({
          category: c,
          path: `/shop/${c.slug}`,
          title: `${c.name} in Sri Lanka`,
          description: c.blurb,
          products: categoryProducts,
        })}
      />
      <JsonLd
        data={buildBreadcrumbSchema([
          { name: "Home", path: "/" },
          { name: "Shop", path: "/shop" },
          { name: c.name, path: `/shop/${c.slug}` },
        ])}
      />
      <JsonLd data={buildFaqSchema(copy.faqs)} />
      <ShopBrowser
        products={products}
        categoryList={allCats}
        initialCategorySlug={c.slug}
      />
    </>
  );
}
