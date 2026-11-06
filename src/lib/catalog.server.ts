import "server-only";
import { cache } from "react";
import { cacheLife, cacheTag } from "next/cache";
import {
  DEFAULT_GALLERY,
  DEFAULT_HERO,
  SIZES,
  categories as defaultCategories,
  getCategory as defaultGetCategory,
  type Category,
  type CategorySlug,
  type GallerySettings,
  type HeroSettings,
  type Product,
  type ProductVariantInfo,
  type Stitching,
} from "@/lib/catalog";
import { CACHE_TAGS } from "@/lib/cache-invalidation.server";
import { getSupabaseAdmin, isSupabaseConfigured } from "@/lib/supabase/admin.server";
import { publicImageUrl } from "@/lib/image-url";

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function isNonUuidIdentifier(val?: string | null): val is string {
  if (!val || typeof val !== "string") return false;
  const trimmed = val.trim();
  return trimmed.length > 0 && !UUID_REGEX.test(trimmed);
}

export type DbProductVariantRow = {
  id: string;
  stitching: "unstitched" | "stitched";
  size: string;
  sku?: string | null;
  price_override?: number | string | null;
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
  updated_at?: string;
  product_variants?: DbProductVariantRow[] | null;
};

const PRODUCT_SELECT =
  "*, product_variants(id, stitching, size, sku, price_override, stock, is_active)";

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

  const sizes = row.sizes && row.sizes.length > 0 ? row.sizes : [...SIZES];
  const activeVariants = (row.product_variants ?? []).filter((v) => v.is_active !== false);

  let unstitchedStock: number | undefined;
  let sizeStock: Record<string, number> | undefined;
  const variants: ProductVariantInfo[] = [];

  if (activeVariants.length > 0) {
    if (price.unstitched != null) {
      const uv = activeVariants.find((v) => v.stitching === "unstitched" && v.size === "-");
      unstitchedStock = Math.max(0, Number(uv?.stock ?? 0));
      if (uv) {
        variants.push({
          id: uv.id,
          stitching: "unstitched",
          size: "-",
          sku: isNonUuidIdentifier(uv.sku) ? uv.sku.trim() : undefined,
          price: uv.price_override != null ? Number(uv.price_override) : price.unstitched,
          stock: unstitchedStock,
        });
      }
    }
    if (price.stitched != null) {
      sizeStock = {};
      for (const sz of sizes) {
        const sv = activeVariants.find((v) => v.stitching === "stitched" && v.size === sz);
        const stStock = Math.max(0, Number(sv?.stock ?? 0));
        sizeStock[sz] = stStock;
        variants.push({
          id: sv?.id ?? `${row.slug}-stitched-${sz}`,
          stitching: "stitched",
          size: sz,
          sku: isNonUuidIdentifier(sv?.sku) ? sv!.sku!.trim() : undefined,
          price: sv?.price_override != null ? Number(sv.price_override) : price.stitched,
          stock: stStock,
        });
      }
    }
  }

  const primarySku = variants.find((v) => isNonUuidIdentifier(v.sku))?.sku;

  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    categories,
    subcategory: row.subcategory ?? undefined,
    colour: row.colour,
    fabric: row.fabric,
    price,
    ...(Object.keys(wasPrice).length > 0 ? { wasPrice } : {}),
    images: (row.images ?? []).map((img) => publicImageUrl(img)),
    pieces: row.pieces ?? [],
    description: row.description ?? "",
    stock: Number(row.stock ?? 0),
    ...(unstitchedStock !== undefined ? { unstitchedStock } : {}),
    ...(sizeStock !== undefined ? { sizeStock } : {}),
    tags: (row.tags ?? []) as ("new" | "bestseller" | "festive")[],
    sizes,
    care: row.care ?? undefined,
    colourGroup: row.colour_group ?? undefined,
    ...(primarySku ? { sku: primarySku } : {}),
    ...(variants.length > 0 ? { variants } : {}),
    ...(row.created_at ? { createdAt: row.created_at } : {}),
    ...(row.updated_at || row.created_at ? { updatedAt: row.updated_at ?? row.created_at } : {}),
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

async function fetchAllProductsCached(): Promise<Product[]> {
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

export const getAllProducts = cache(fetchAllProductsCached);

async function fetchFilteredProductsCached(filters: ShopFilterParams = {}): Promise<Product[]> {
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

export const getFilteredProducts = cache((filters: ShopFilterParams = {}) =>
  fetchFilteredProductsCached(filters),
);

async function fetchProductBySlugCached(slug: string): Promise<Product | null> {
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

export const getProductBySlug = cache(fetchProductBySlugCached);

async function fetchAllCategoriesCached(): Promise<Category[]> {
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

    return data.map((row: Record<string, unknown>) => ({
      slug: row.slug as CategorySlug,
      name: String(row.name ?? ""),
      blurb:
        (typeof row.description === "string" && row.description) ||
        defaultGetCategory(String(row.slug))?.blurb ||
        "",
      image:
        typeof row.image_url === "string" && row.image_url
          ? publicImageUrl(row.image_url)
          : defaultGetCategory(String(row.slug))?.image || "",
      subcategories:
        Array.isArray(row.subcategories) && row.subcategories.length > 0
          ? (row.subcategories as string[])
          : undefined,
      group: typeof row.nav_group === "string" ? row.nav_group : undefined,
      updatedAt:
        typeof row.updated_at === "string"
          ? row.updated_at
          : typeof row.created_at === "string"
            ? row.created_at
            : undefined,
    }));
  } catch {
    return defaultCategories;
  }
}

export const getAllCategories = cache(fetchAllCategoriesCached);

/** Reads the owner's homepage hero. Falls back to the defaults if none is saved. */
async function fetchHeroSettingsCached(): Promise<HeroSettings> {
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
    const hero = { ...DEFAULT_HERO, ...(data.value as Partial<HeroSettings>) };
    if (hero.imageUrl) {
      hero.imageUrl = publicImageUrl(hero.imageUrl);
    }
    return hero;
  } catch {
    return DEFAULT_HERO;
  }
}

export const getHeroSettings = cache(fetchHeroSettingsCached);

/** Reads the owner's homepage gallery. Falls back to the automatic photos if none is saved. */
async function fetchGallerySettingsCached(): Promise<GallerySettings> {
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
    const gallery = { ...DEFAULT_GALLERY, ...(data.value as Partial<GallerySettings>) };
    if (Array.isArray(gallery.tiles)) {
      gallery.tiles = gallery.tiles.map((t) => (t ? publicImageUrl(t) : null));
    }
    return gallery;
  } catch {
    return DEFAULT_GALLERY;
  }
}

export const getGallerySettings = cache(fetchGallerySettingsCached);

/**
 * Strict data loader for Sitemaps & Merchant Feeds (`revalidate = 3600` via cacheLife).
 * Throws an error if Supabase is configured and the query fails, so Next.js serves
 * stale cache or 500/503 instead of caching an empty sitemap/feed.
 */
async function fetchSitemapCatalogDataCached(): Promise<{
  products: Product[];
  categories: Category[];
}> {
  "use cache";
  cacheLife({ revalidate: 3600, stale: 3600, expire: 86400 });
  cacheTag(CACHE_TAGS.products, CACHE_TAGS.categories);

  if (!isSupabaseConfigured()) {
    throw new Error("Database is not configured; refusing to generate an empty sitemap/feed.");
  }

  const supabase = getSupabaseAdmin();
  const [productsRes, categoriesRes] = await Promise.all([
    supabase
      .from("products")
      .select(PRODUCT_SELECT)
      .eq("is_active", true)
      .order("is_featured", { ascending: false })
      .order("created_at", { ascending: false }),
    supabase
      .from("categories")
      .select("*")
      .eq("is_active", true)
      .order("sort_order", { ascending: true }),
  ]);

  if (productsRes.error) {
    throw new Error(`Failed to load products for sitemap/feed: ${productsRes.error.message}`);
  }
  if (categoriesRes.error) {
    throw new Error(`Failed to load categories for sitemap/feed: ${categoriesRes.error.message}`);
  }

  const products = (productsRes.data ?? []).map((row) => mapDbRowToProduct(row as DbProductRow));
  const categories: Category[] =
    categoriesRes.data && categoriesRes.data.length > 0
      ? categoriesRes.data.map((row: Record<string, unknown>) => ({
          slug: row.slug as CategorySlug,
          name: String(row.name ?? ""),
          blurb:
            (typeof row.description === "string" && row.description) ||
            defaultGetCategory(String(row.slug))?.blurb ||
            "",
          image:
            typeof row.image_url === "string" && row.image_url
              ? publicImageUrl(row.image_url)
              : defaultGetCategory(String(row.slug))?.image || "",
          subcategories:
            Array.isArray(row.subcategories) && row.subcategories.length > 0
              ? (row.subcategories as string[])
              : undefined,
          group: typeof row.nav_group === "string" ? row.nav_group : undefined,
          updatedAt:
            typeof row.updated_at === "string"
              ? row.updated_at
              : typeof row.created_at === "string"
                ? row.created_at
                : undefined,
        }))
      : defaultCategories;

  return { products, categories };
}

export const getSitemapCatalogData = cache(fetchSitemapCatalogDataCached);
