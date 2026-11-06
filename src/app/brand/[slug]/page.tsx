import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ProductCard } from "@/components/product-card";
import { Breadcrumbs } from "@/components/seo/breadcrumbs";
import { CategorySeoSection } from "@/components/seo/category-seo-section";
import { JsonLd } from "@/components/seo/json-ld";
import { getAllCategories, getAllProducts } from "@/lib/catalog.server";
import { COUNTRY_NAME, SITE_NAME } from "@/lib/seo/config";
import { HOME_FAQS } from "@/lib/seo/faq-content";
import { buildMetadata } from "@/lib/seo/metadata";
import {
  buildBreadcrumbSchema,
  buildCollectionPageSchema,
  buildFaqSchema,
} from "@/lib/seo/schema";

const BRANDS: Record<
  string,
  {
    slug: string;
    name: string;
    title: string;
    blurb: string;
  }
> = {
  almera: {
    slug: "almera",
    name: "almera",
    title: `almera — Official Collection in ${COUNTRY_NAME}`,
    blurb:
      "Every piece in the almera wardrobe — from breathable Pakistani lawn suits and semi-rich hakoba ensembles to hand-embellished bridal lehengas, delivered island-wide across Sri Lanka.",
  },
};

export const ensureStatic = "navigation";

export function generateStaticParams() {
  return Object.keys(BRANDS).map((slug) => ({ slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const brand = BRANDS[slug.toLowerCase()];
  if (!brand) notFound();

  return buildMetadata({
    title: brand.title,
    description: brand.blurb,
    path: `/brand/${brand.slug}`,
    keywords: [
      SITE_NAME,
      "almera Sri Lanka",
      "almera Colombo",
      "Pakistani lawn suits Sri Lanka",
      "bridal lehengas Sri Lanka",
    ],
  });
}

export default async function BrandPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const brand = BRANDS[slug.toLowerCase()];
  if (!brand) notFound();

  const [products, categoryList] = await Promise.all([
    getAllProducts(),
    getAllCategories(),
  ]);

  const breadcrumbs = [
    { name: "Home", path: "/" },
    { name: "Shop", path: "/shop" },
    { name: brand.name, path: `/brand/${brand.slug}` },
  ];

  return (
    <div className="mx-auto max-w-7xl px-4 pt-8 pb-20 sm:px-8 sm:pt-14">
      <JsonLd
        data={buildCollectionPageSchema({
          path: `/brand/${brand.slug}`,
          title: brand.title,
          description: brand.blurb,
          products,
        })}
      />
      <JsonLd data={buildBreadcrumbSchema(breadcrumbs)} />
      <JsonLd data={buildFaqSchema(HOME_FAQS)} />

      <Breadcrumbs items={breadcrumbs} />
      <h1 className="display mt-4 text-[3.2rem] sm:text-7xl">
        {brand.name} <em className="text-sage-deep">collection</em>
      </h1>
      <p className="mt-4 max-w-2xl leading-relaxed text-ink/70">{brand.blurb}</p>

      <div className="mt-10 grid grid-cols-2 gap-x-3 gap-y-10 sm:grid-cols-3 sm:gap-x-6 lg:grid-cols-4">
        {products.map((p) => (
          <ProductCard key={p.slug} product={p} />
        ))}
      </div>

      <div className="mt-16">
        <CategorySeoSection
          categorySlug="all"
          categoryList={categoryList}
          customHeading={`About ${brand.name} — The Desi Wardrobe in Sri Lanka`}
        />
      </div>
    </div>
  );
}

