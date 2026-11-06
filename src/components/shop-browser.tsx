"use client";

import { usePathname } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { getCategory, inCategory, type Category, type CategorySlug, type Product } from "@/lib/catalog";
import { CategorySeoSection } from "@/components/seo/category-seo-section";
import { ShopHeader } from "./shop-header";
import { ShopView } from "./shop-view";

const slugFrom = (pathname: string) =>
  pathname.startsWith("/shop/") ? pathname.split("/")[2] : undefined;
const isShopPath = (pathname: string) => pathname === "/shop" || pathname.startsWith("/shop/");

/**
 * Every product arrives with the page, so switching tabs only filters what is already here.
 * The address still changes, which keeps refreshing, sharing and the back button working.
 */
export function ShopBrowser({
  products,
  categoryList,
  initialCategorySlug,
}: {
  products: Product[];
  categoryList: Category[];
  initialCategorySlug?: CategorySlug;
}) {
  const pathname = usePathname();
  const [slug, setSlug] = useState<string | undefined>(
    () => initialCategorySlug ?? slugFrom(pathname),
  );

  // This page stays mounted but hidden while a product is open, so ignore addresses outside the shop.
  if (isShopPath(pathname) && slugFrom(pathname) !== slug) setSlug(slugFrom(pathname));

  const category = slug
    ? (categoryList.find((c) => c.slug === slug) ?? getCategory(slug))
    : undefined;
  const items = useMemo(
    () => (category ? products.filter((p) => inCategory(p, category.slug)) : products),
    [products, category],
  );

  useEffect(() => {
    document.title = category
      ? `${category.name} in Sri Lanka | almera`
      : "Shop Pakistani Lawn Suits, Shalwar Kameez & Lehengas in Sri Lanka | almera";
  }, [category]);

  return (
    <>
      <ShopHeader
        title={
          category ? (
            category.name
          ) : (
            <>
              the whole <em>wardrobe</em>
            </>
          )
        }
        blurb={
          category
            ? category.blurb
            : "Every lawn suit, shalwar kameez and lehenga we have in stock. Most pieces come in small quantities, so they sell quickly."
        }
        active={category?.slug}
        categoryList={categoryList}
      />
      <ShopView
        resetKey={category?.slug ?? "all"}
        items={items}
        showCategoryFilter={!category}
        showStitchingFilter={
          !category || !["ready-to-wear", "western"].includes(category.slug)
        }
        subcategories={category?.subcategories}
        categoryList={categoryList}
      />
      <CategorySeoSection
        categorySlug={category?.slug ?? "all"}
        categoryList={categoryList}
      />
    </>
  );
}
