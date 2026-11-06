import type { MetadataRoute } from "next";
import { getSitemapCatalogData } from "@/lib/catalog.server";
import { SITE_URL, STATIC_BUILD_DATE } from "@/lib/seo/config";

const STATIC_ROUTES: {
  path: string;
  changeFrequency: NonNullable<MetadataRoute.Sitemap[number]["changeFrequency"]>;
  priority: number;
}[] = [
  { path: "", changeFrequency: "daily", priority: 1.0 },
  { path: "/shop", changeFrequency: "daily", priority: 0.9 },
  { path: "/brand/almera", changeFrequency: "weekly", priority: 0.8 },
  { path: "/about", changeFrequency: "monthly", priority: 0.6 },
  { path: "/help", changeFrequency: "monthly", priority: 0.6 },
  { path: "/contact", changeFrequency: "monthly", priority: 0.6 },
];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  // Throws on DB error so Next.js never caches or returns an empty sitemap.
  const { products, categories } = await getSitemapCatalogData();

  const staticEntries: MetadataRoute.Sitemap = STATIC_ROUTES.map((route) => ({
    url: `${SITE_URL}${route.path}`,
    lastModified: STATIC_BUILD_DATE,
    changeFrequency: route.changeFrequency,
    priority: route.priority,
  }));

  const categoryEntries: MetadataRoute.Sitemap = categories.map((cat) => ({
    url: `${SITE_URL}/shop/${cat.slug}`,
    lastModified: cat.updatedAt || STATIC_BUILD_DATE,
    changeFrequency: "daily",
    priority: 0.85,
  }));

  const productEntries: MetadataRoute.Sitemap = products.map((product) => ({
    url: `${SITE_URL}/product/${product.slug}`,
    lastModified: product.updatedAt || product.createdAt || STATIC_BUILD_DATE,
    changeFrequency: "weekly",
    priority: 0.8,
    images: product.images
      .filter(Boolean)
      .map((img) =>
        img.startsWith("http")
          ? img
          : `${SITE_URL}${img.startsWith("/") ? "" : "/"}${img}`,
      ),
  }));

  return [...staticEntries, ...categoryEntries, ...productEntries];
}
