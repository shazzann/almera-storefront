import "server-only";
import { revalidateTag } from "next/cache";

export const CACHE_TAGS = {
  products: "catalog:products",
  product: (slug: string) => `catalog:product:${slug}`,
  category: (slug: string) => `catalog:category:${slug}`,
  categories: "catalog:categories",
} as const;

export function revalidateCatalogCache(slugs: string[] = [], categories: string[] = []) {
  try {
    revalidateTag(CACHE_TAGS.products, "max");
    for (const slug of slugs) revalidateTag(CACHE_TAGS.product(slug), "max");
    for (const cat of categories) revalidateTag(CACHE_TAGS.category(cat), "max");
  } catch {
    // Ignore when called outside request context
  }
}

