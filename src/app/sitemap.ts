import type { MetadataRoute } from "next";
import { categories, products } from "@/lib/catalog";

const SITE_URL = "https://almera.lk";

export default function sitemap(): MetadataRoute.Sitemap {
  const pages = ["", "/shop", "/about", "/help", "/contact"].map((path) => ({ url: `${SITE_URL}${path}`, changeFrequency: "weekly" as const }));
  return [
    ...pages,
    ...categories.map((c) => ({ url: `${SITE_URL}/shop/${c.slug}`, changeFrequency: "daily" as const })),
    ...products.map((p) => ({ url: `${SITE_URL}/product/${p.slug}`, images: p.images.slice(0, 1).map((i) => `${i}?w=1200`) })),
  ];
}
