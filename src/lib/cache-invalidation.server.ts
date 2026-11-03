import "server-only";
import { revalidatePath, updateTag } from "next/cache";

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
    updateTag(CACHE_TAGS.products);
    for (const slug of slugs) updateTag(CACHE_TAGS.product(slug));
    for (const cat of categories) updateTag(CACHE_TAGS.category(cat));
    revalidatePath("/", "layout");
    revalidatePath("/shop", "layout");
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
