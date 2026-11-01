import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import {
  DEFAULT_GALLERY,
  DEFAULT_HERO,
  categories as defaultCategories,
  getCategory as defaultGetCategory,
  type Category,
  type CategorySlug,
  type GallerySettings,
  type HeroSettings,
  type Product,
  type Stitching,
} from "@/lib/catalog";
import { CACHE_TAGS } from "@/lib/cache-invalidation.server";
import { getSupabaseAdmin, isSupabaseConfigured } from "@/lib/supabase/admin.server";

export type DbProductVariantRow = {
  id: string;
  stitching: "unstitched" | "stitched";
  size: string;
  stock: number | string | null;
  is_active?: boolean | null;
};

export type DbProductRow = {
  id: string;
  slug: string;
  name: string;
  categories: string[];
  primary_category?: string;
  subcategory?: string | null;
  colour: string;
  fabric: string;
  price_unstitched?: number | string | null;
  price_stitched?: number | string | null;
  was_price_unstitched?: number | string | null;
  was_price_stitched?: number | string | null;
  starting_price?: number | string | null;
  is_ready_to_wear?: boolean | null;
  images?: string[] | null;
  pieces?: string[] | null;
  sizes?: string[] | null;
  tags?: ("new" | "bestseller" | "festive")[] | null;
  description?: string | null;
  care?: string | null;
  stock?: number | string | null;
  is_featured?: boolean | null;
  is_active?: boolean | null;
  colour_group?: string | null;
  created_at?: string;
  product_variants?: DbProductVariantRow[] | null;
};

const PRODUCT_SELECT = "*, product_variants(id, stitching, size, stock, is_active)";

export function mapDbRowToProduct(row: DbProductRow): Product {
  const price: Partial<Record<Stitching, number>> = {};
  if (row.price_unstitched != null) price.unstitched = Number(row.price_unstitched);
  if (row.price_stitched != null) price.stitched = Number(row.price_stitched);

  const wasPrice: Partial<Record<Stitching, number>> = {};
  if (row.was_price_unstitched != null) wasPrice.unstitched = Number(row.was_price_unstitched);
  if (row.was_price_stitched != null) wasPrice.stitched = Number(row.was_price_stitched);

  const categories = [...(row.categories ?? [])] as CategorySlug[];
  if (row.is_ready_to_wear && !categories.includes("ready-to-wear")) {
    categories.push("ready-to-wear");
  }

  const sizes = row.sizes && row.sizes.length > 0 ? row.sizes : ["XS", "S", "M", "L", "XL"];
  const activeVariants = (row.product_variants ?? []).filter((v) => v.is_active !== false);

  let unstitchedStock: number | undefined;
  let sizeStock: Record<string, number> | undefined;

  if (activeVariants.length > 0) {
    if (price.unstitched != null) {
      const uv = activeVariants.find((v) => v.stitching === "unstitched" && v.size === "-");
      unstitchedStock = Math.max(0, Number(uv?.stock ?? 0));
    }
    if (price.stitched != null) {
      sizeStock = {};
      for (const sz of sizes) {
        const sv = activeVariants.find((v) => v.stitching === "stitched" && v.size === sz);
        sizeStock[sz] = Math.max(0, Number(sv?.stock ?? 0));
      }
    }
  }

  return {
    slug: row.slug,
    name: row.name,
    categories,
    subcategory: row.subcategory ?? undefined,
    colour: row.colour,
    fabric: row.fabric,
    price,
    ...(Object.keys(wasPrice).length > 0 ? { wasPrice } : {}),
    images: row.images ?? [],
    pieces: row.pieces ?? [],
    description: row.description ?? "",
    stock: Number(row.stock ?? 0),
    ...(unstitchedStock !== undefined ? { unstitchedStock } : {}),
    ...(sizeStock !== undefined ? { sizeStock } : {}),
    tags: (row.tags ?? []) as ("new" | "bestseller" | "festive")[],
    sizes,
    care: row.care ?? undefined,
    colourGroup: row.colour_group ?? undefined,
  };
}

export type ShopFilterParams = {
  category?: CategorySlug;
  subcategory?: string;
  stitching?: Stitching;
  priceBand?: "under-10k" | "10k-20k" | "20k-80k" | "above-80k";
  inStockOnly?: boolean;
  sort?: "featured" | "new" | "price-asc" | "price-desc";
  q?: string;
};

export async function getAllProducts(): Promise<Product[]> {
  "use cache";
  cacheLife("minutes");
  cacheTag(CACHE_TAGS.products);

  if (!isSupabaseConfigured()) return [];

  try {
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from("products")
      .select(PRODUCT_SELECT)
      .eq("is_active", true)
      .order("is_featured", { ascending: false })
      .order("created_at", { ascending: false });

    if (error || !data) return [];
    return data.map((row) => mapDbRowToProduct(row as DbProductRow));
  } catch {
    return [];
  }
}

export async function getProductsByCategory(slug: CategorySlug): Promise<Product[]> {
  "use cache";
  cacheLife("minutes");
  cacheTag(CACHE_TAGS.products, CACHE_TAGS.category(slug));

  if (!isSupabaseConfigured()) return [];

  try {
    const supabase = getSupabaseAdmin();
    let query = supabase.from("products").select(PRODUCT_SELECT).eq("is_active", true);

    if (slug === "ready-to-wear") {
      query = query.eq("is_ready_to_wear", true);
    } else {
      query = query.contains("categories", [slug]);
    }

    const { data, error } = await query
      .order("is_featured", { ascending: false })
      .order("created_at", { ascending: false });

    if (error || !data) return [];
    return data.map((row) => mapDbRowToProduct(row as DbProductRow));
  } catch {
    return [];
  }
}

export async function getFilteredProducts(filters: ShopFilterParams = {}): Promise<Product[]> {
  "use cache";
  cacheLife("minutes");
  cacheTag(
    CACHE_TAGS.products,
    ...(filters.category ? [CACHE_TAGS.category(filters.category)] : []),
  );

  if (!isSupabaseConfigured()) return [];

  try {
    const supabase = getSupabaseAdmin();
    let query = supabase.from("products").select(PRODUCT_SELECT).eq("is_active", true);

    if (filters.category) {
      if (filters.category === "ready-to-wear") {
        query = query.eq("is_ready_to_wear", true);
      } else {
        query = query.contains("categories", [filters.category]);
      }
    }

    if (filters.subcategory) {
      query = query.eq("subcategory", filters.subcategory);
    }

    if (filters.stitching === "unstitched") {
      query = query.not("price_unstitched", "is", null);
    } else if (filters.stitching === "stitched") {
      query = query.not("price_stitched", "is", null);
    }

    if (filters.priceBand === "under-10k") {
      query = query.lt("starting_price", 10000);
    } else if (filters.priceBand === "10k-20k") {
      query = query.gte("starting_price", 10000).lt("starting_price", 20000);
    } else if (filters.priceBand === "20k-80k") {
      query = query.gte("starting_price", 20000).lt("starting_price", 80000);
    } else if (filters.priceBand === "above-80k") {
      query = query.gte("starting_price", 80000);
    }

    if (filters.inStockOnly) {
      query = query.gt("stock", 0);
    }

    if (filters.q?.trim()) {
      const term = filters.q.trim().replace(/[%_(),."\\']/g, "");
      if (term) {
        query = query.or(
          `name.ilike.%${term}%,colour.ilike.%${term}%,fabric.ilike.%${term}%,subcategory.ilike.%${term}%,description.ilike.%${term}%`,
        );
      }
    }

    switch (filters.sort) {
      case "price-asc":
        query = query.order("starting_price", { ascending: true });
        break;
      case "price-desc":
        query = query.order("starting_price", { ascending: false });
        break;
      case "new":
        query = query.order("created_at", { ascending: false });
        break;
      case "featured":
      default:
        query = query
          .order("is_featured", { ascending: false })
          .order("created_at", { ascending: false });
        break;
    }

    const { data, error } = await query;
    if (error || !data) return [];

    const mapped = data.map((r) => mapDbRowToProduct(r as DbProductRow));
    if (filters.sort === "new") {
      mapped.sort((a, b) => (b.tags.includes("new") ? 1 : 0) - (a.tags.includes("new") ? 1 : 0));
    }
    return mapped;
  } catch {
    return [];
  }
}

export async function getProductBySlug(slug: string): Promise<Product | null> {
  "use cache";
  cacheLife("minutes");
  cacheTag(CACHE_TAGS.products, CACHE_TAGS.product(slug));

  if (!isSupabaseConfigured()) return null;

  try {
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from("products")
      .select(PRODUCT_SELECT)
      .eq("slug", slug)
      .eq("is_active", true)
      .maybeSingle();

    if (error || !data) return null;
    return mapDbRowToProduct(data as DbProductRow);
  } catch {
    return null;
  }
}

export async function getAllCategories(): Promise<Category[]> {
  "use cache";
  cacheLife("hours");
  cacheTag(CACHE_TAGS.categories);

  if (!isSupabaseConfigured()) return defaultCategories;

  try {
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from("categories")
      .select("*")
      .eq("is_active", true)
      .order("sort_order", { ascending: true });

    if (error || !data || data.length === 0) {
      return defaultCategories;
    }

    return data.map((row: any) => ({
      slug: row.slug as CategorySlug,
      name: row.name,
      blurb: row.description || defaultGetCategory(row.slug)?.blurb || "",
      image: row.image_url || defaultGetCategory(row.slug)?.image || "",
      subcategories:
        Array.isArray(row.subcategories) && row.subcategories.length > 0
          ? row.subcategories
          : undefined,
      group: row.nav_group ?? undefined,
    }));
  } catch {
    return defaultCategories;
  }
}

/** Reads the owner's homepage hero. Falls back to the defaults if none is saved. */
export async function getHeroSettings(): Promise<HeroSettings> {
  "use cache";
  cacheLife("hours");
  cacheTag(CACHE_TAGS.hero);

  if (!isSupabaseConfigured()) return DEFAULT_HERO;

  try {
    const { data, error } = await getSupabaseAdmin()
      .from("site_settings")
      .select("value")
      .eq("key", "hero")
      .maybeSingle();
    if (error || !data) return DEFAULT_HERO;
    return { ...DEFAULT_HERO, ...(data.value as Partial<HeroSettings>) };
  } catch {
    return DEFAULT_HERO;
  }
}

/** Reads the owner's homepage gallery. Falls back to the automatic photos if none is saved. */
export async function getGallerySettings(): Promise<GallerySettings> {
  "use cache";
  cacheLife("hours");
  cacheTag(CACHE_TAGS.gallery);

  if (!isSupabaseConfigured()) return DEFAULT_GALLERY;

  try {
    const { data, error } = await getSupabaseAdmin()
      .from("site_settings")
      .select("value")
      .eq("key", "gallery")
      .maybeSingle();
    if (error || !data) return DEFAULT_GALLERY;
    return { ...DEFAULT_GALLERY, ...(data.value as Partial<GallerySettings>) };
  } catch {
    return DEFAULT_GALLERY;
  }
}
