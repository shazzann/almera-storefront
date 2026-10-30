import type { Metadata } from "next";
import { ShopHeader } from "@/components/shop-header";
import { ShopView } from "@/components/shop-view";
import { getAllProducts } from "@/lib/catalog.server";

export const metadata: Metadata = {
  title: "Shop new arrivals",
  description: "Shop the latest Pakistani lawn suits, ready-to-wear shalwar kameez and lehengas from almera, delivered island-wide in Sri Lanka.",
  alternates: { canonical: "/shop" },
};

export default async function ShopPage() {
  const items = await getAllProducts();
  return (
    <>
      <ShopHeader
        title={<>the whole <em>wardrobe</em></>}
        blurb="Every lawn suit, shalwar kameez and lehenga we have in stock. Most pieces come in small quantities, so they sell quickly."
      />
      <ShopView items={items} showCategoryFilter />
      <div className="h-20" />
    </>
  );
}
