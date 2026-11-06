import type { Metadata } from "next";
import { JsonLd } from "@/components/seo/json-ld";
import { ShopBrowser } from "@/components/shop-browser";
import { getAllCategories, getAllProducts } from "@/lib/catalog.server";
import { CATEGORY_SEO_CONTENT } from "@/lib/seo/faq-content";
import { buildCategoryMetadata } from "@/lib/seo/metadata";
import {
  buildBreadcrumbSchema,
  buildCollectionPageSchema,
  buildFaqSchema,
} from "@/lib/seo/schema";

export const metadata: Metadata = buildCategoryMetadata({});

export default async function ShopPage() {
  const [products, categoryList] = await Promise.all([
    getAllProducts(),
    getAllCategories(),
  ]);

  return (
    <>
      <JsonLd
        data={buildCollectionPageSchema({
          path: "/shop",
          title: "Shop Pakistani Lawn Suits, Shalwar Kameez & Lehengas in Sri Lanka",
          products,
        })}
      />
      <JsonLd
        data={buildBreadcrumbSchema([
          { name: "Home", path: "/" },
          { name: "Shop", path: "/shop" },
        ])}
      />
      <JsonLd data={buildFaqSchema(CATEGORY_SEO_CONTENT.all.faqs)} />
      <ShopBrowser products={products} categoryList={categoryList} />
    </>
  );
}
