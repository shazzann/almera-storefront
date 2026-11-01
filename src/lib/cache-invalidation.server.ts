import "server-only";
import { revalidateTag, updateTag } from "next/cache";

export const CACHE_TAGS = {
  products: "catalog:products",
  product: (slug: string) => `catalog:product:${slug}`,
  category: (slug: string) => `catalog:category:${slug}`,
  categories: "catalog:categories",
  hero: "site:hero",
  gallery: "site:gallery",
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

/** Called from the admin save, so the owner sees the new hero on the next page load. */
export function refreshHeroCache() {
  updateTag(CACHE_TAGS.hero);
}

/** Called from the admin saves, so category changes show on the next page load. */
export function refreshCategoriesCache() {
  updateTag(CACHE_TAGS.categories);
}

export function refreshGalleryCache() {
  updateTag(CACHE_TAGS.gallery);
}
