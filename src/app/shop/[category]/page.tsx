import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { ShopBrowser } from "@/components/shop-browser";
import { categories, getCategory } from "@/lib/catalog";
import { getAllCategories, getAllProducts } from "@/lib/catalog.server";

export function generateStaticParams() {
  return categories.map((c) => ({ category: c.slug }));
}

export async function generateMetadata({
  params,
}: PageProps<"/shop/[category]">): Promise<Metadata> {
  const slug = (await params).category;
  const allCats = await getAllCategories();
  const c = allCats.find((cat) => cat.slug === slug) ?? getCategory(slug);
  if (!c) return {};
  return {
    title: `${c.name} in Sri Lanka`,
    description: c.blurb,
    alternates: { canonical: `/shop/${c.slug}` },
    openGraph: { images: [{ url: `${c.image}?w=1200&h=630&fit=crop` }] },
  };
}

export default function CategoryPage({ params }: PageProps<"/shop/[category]">) {
  return (
    <Suspense fallback={<CategorySkeleton />}>
      <CategoryContent params={params} />
    </Suspense>
  );
}

function CategorySkeleton() {
  return (
    <div
      className="mx-auto max-w-7xl animate-pulse px-4 pt-8 sm:px-8 sm:pt-14"
      aria-busy="true"
    >
      <div className="h-3 w-24 rounded bg-sage-soft" />
      <div className="mt-5 h-14 w-2/3 rounded bg-sage-soft" />
      <div className="mt-5 h-4 w-full max-w-xl rounded bg-sage-soft" />
      <div className="mt-10 grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-6">
        {Array.from({ length: 6 }, (_, i) => (
          <div key={i} className="arch-soft aspect-[3/4] bg-sage-soft" />
        ))}
      </div>
    </div>
  );
}

async function CategoryContent({
  params,
}: Pick<PageProps<"/shop/[category]">, "params">) {
  const slug = (await params).category;
  const [allCats, products] = await Promise.all([getAllCategories(), getAllProducts()]);
  const c = allCats.find((cat) => cat.slug === slug) ?? getCategory(slug);
  if (!c) notFound();
  return <ShopBrowser products={products} categoryList={allCats} />;
}
