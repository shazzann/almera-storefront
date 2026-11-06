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
    for (const slug of slugs) {
      updateTag(CACHE_TAGS.product(slug));
      revalidatePath(`/product/${slug}`);
    }
    for (const cat of categories) {
      updateTag(CACHE_TAGS.category(cat));
      revalidatePath(`/shop/${cat}`);
    }
    revalidatePath("/", "layout");
    revalidatePath("/shop", "layout");
    revalidatePath("/sitemap.xml");
    revalidatePath("/products.xml");
    revalidatePath("/google-merchant-products.xml");
    revalidatePath("/meta-catalog.xml");
  } catch {
    // Ignore when called outside request context
  }
}

/** Called from the admin save, so the owner sees the new hero on the next page load. */
export function refreshHeroCache() {
  try {
    updateTag(CACHE_TAGS.hero);
    revalidatePath("/");
  } catch {
    // Ignore when called outside request context
  }
}

/** Called from the admin saves, so category changes show on the next page load. */
export function refreshCategoriesCache() {
  try {
    updateTag(CACHE_TAGS.categories);
    revalidatePath("/", "layout");
    revalidatePath("/shop", "layout");
    revalidatePath("/sitemap.xml");
  } catch {
    // Ignore when called outside request context
  }
}

export function refreshGalleryCache() {
  try {
    updateTag(CACHE_TAGS.gallery);
    revalidatePath("/");
  } catch {
    // Ignore when called outside request context
  }
}
