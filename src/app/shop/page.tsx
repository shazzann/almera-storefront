import type { Metadata } from "next";
import { ShopBrowser } from "@/components/shop-browser";
import { getAllCategories, getAllProducts } from "@/lib/catalog.server";

export const metadata: Metadata = {
  title: "Shop new arrivals",
  description:
    "Shop the latest Pakistani lawn suits, ready-to-wear shalwar kameez and lehengas from almera, delivered island-wide in Sri Lanka.",
  alternates: { canonical: "/shop" },
};

export default async function ShopPage() {
  const [products, categoryList] = await Promise.all([
    getAllProducts(),
    getAllCategories(),
  ]);
  return <ShopBrowser products={products} categoryList={categoryList} />;
}
