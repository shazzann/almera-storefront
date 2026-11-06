import type { Metadata } from "next";
import {
  formatLKR,
  nameWithColour,
  startingPrice,
  stitchingOptions,
  type Category,
  type Product,
} from "@/lib/catalog";
import {
  COUNTRY_NAME,
  CURRENCY,
  DEFAULT_LOCALE,
  DEFAULT_OG_IMAGE,
  SITE_DESCRIPTION_DEFAULT,
  SITE_NAME,
  SITE_URL,
} from "./config";

/**
 * Strips Markdown formatting and HTML tags, then collapses runs of whitespace.
 */
export function cleanDescriptionText(raw: string): string {
  return raw
    .replace(/!\[([^\]]*)\]\([^)]+\)/g, "$1")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/<[^>]+>/g, " ")
    .replace(/^[#>*+-]+\s+/gm, "")
    .replace(/[`*_~]+/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Truncates text at a word boundary to ~maxLength characters (default 155).
 */
export function truncateMetaDescription(raw: string, maxLength = 155): string {
  const cleaned = cleanDescriptionText(raw || SITE_DESCRIPTION_DEFAULT);
  if (cleaned.length <= maxLength) return cleaned;

  const sliced = cleaned.slice(0, maxLength);
  const lastSpace = sliced.lastIndexOf(" ");
  const boundary = lastSpace > maxLength * 0.6 ? sliced.slice(0, lastSpace) : sliced;
  return `${boundary.replace(/[.,;:!?-]+$/, "")}…`;
}

/**
 * Indexable query parameters allowed in canonical PLP URLs.
 * Sort, pagination, price-range, stock-filter, and tracking params are always excluded.
 */
const INDEXABLE_PLP_PARAMS = new Set(["sub", "brand"]);

/**
 * Computes an absolute canonical URL from a path (and optional query string),
 * enforcing lowercase path, no trailing slash, and stripping tracking/sort/filter params.
 */
export function buildCanonicalUrl(
  path: string,
  allowedParams?: Record<string, string | undefined>,
): string {
  const [rawPathname] = (path || "/").split("?");
  const normalizedPath =
    "/" +
    rawPathname
      .trim()
      .replace(/\/+/g, "/")
      .replace(/^\/+|\/+$/g, "")
      .toLowerCase();

  const base = normalizedPath === "/" ? SITE_URL : `${SITE_URL}${normalizedPath}`;

  if (!allowedParams) return base;

  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(allowedParams)) {
    if (INDEXABLE_PLP_PARAMS.has(key) && value && value.trim()) {
      search.set(key, value.trim());
    }
  }
  const qs = search.toString();
  return qs ? `${base}?${qs}` : base;
}

export type BuildMetadataInput = {
  title: string;
  /** Set true to use ` { absolute: title } ` without appending ` | SITE_NAME`. */
  absoluteTitle?: boolean;
  description?: string;
  path: string;
  canonicalQueryParams?: Record<string, string | undefined>;
  image?: {
    url: string;
    width?: number;
    height?: number;
    alt?: string;
  } | null;
  type?: "website" | "article";
  noindex?: boolean;
  keywords?: string[];
  other?: Record<string, string | number | (string | number)[]>;
};

export function buildMetadata({
  title,
  absoluteTitle = false,
  description = SITE_DESCRIPTION_DEFAULT,
  path,
  canonicalQueryParams,
  image,
  type = "website",
  noindex = false,
  keywords,
  other,
}: BuildMetadataInput): Metadata {
  const cleanDesc = truncateMetaDescription(description, 155);
  const canonical = buildCanonicalUrl(path, canonicalQueryParams);
  const ogTitle = absoluteTitle ? title : `${title} | ${SITE_NAME}`;

  const resolvedImageUrl = image?.url
    ? image.url.startsWith("http")
      ? image.url
      : `${SITE_URL}${image.url.startsWith("/") ? "" : "/"}${image.url}`
    : DEFAULT_OG_IMAGE.url;

  const ogImage = {
    url: resolvedImageUrl,
    width: image?.width ?? DEFAULT_OG_IMAGE.width,
    height: image?.height ?? DEFAULT_OG_IMAGE.height,
    alt: image?.alt ?? title,
  };

  return {
    title: absoluteTitle ? { absolute: title } : title,
    description: cleanDesc,
    ...(keywords && keywords.length > 0 ? { keywords } : {}),
    alternates: {
      canonical,
    },
    openGraph: {
      title: ogTitle,
      description: cleanDesc,
      url: canonical,
      siteName: SITE_NAME,
      locale: DEFAULT_LOCALE,
      type,
      images: [ogImage],
    },
    twitter: {
      card: "summary_large_image",
      title: ogTitle,
      description: cleanDesc,
      images: [ogImage.url],
    },
    robots: noindex
      ? {
          index: false,
          follow: true,
          googleBot: {
            index: false,
            follow: true,
          },
        }
      : {
          index: true,
          follow: true,
          googleBot: {
            index: true,
            follow: true,
            "max-image-preview": "large",
            "max-snippet": -1,
            "max-video-preview": -1,
          },
        },
    ...(other ? { other } : {}),
  };
}

/**
 * PDP metadata builder following the pattern:
 * `"{Product} Price in {Country} | 100% Original"` (with layout template appending `| almera`).
 * Includes OpenGraph primary product image and product price/currency/availability meta tags.
 */
export function buildProductMetadata(product: Product): Metadata {
  const displayName = nameWithColour(product);
  const title = `${displayName} Price in ${COUNTRY_NAME} | 100% Original`;
  const price = startingPrice(product);
  const options = stitchingOptions(product);
  const stitchLabel =
    options.length === 2
      ? "Available stitched or unstitched"
      : options[0] === "stitched"
        ? "Ready to wear"
        : "Unstitched 3-piece suit";

  const rawDescription = `${product.description} ${stitchLabel} in ${product.colour.toLowerCase()} ${product.fabric.toLowerCase()} from ${formatLKR(price)}. Island-wide delivery & Cash on Delivery in ${COUNTRY_NAME}.`;

  const primaryImage = product.images[0]
    ? {
        url: product.images[0],
        width: 1200,
        height: 1500,
        alt: `${displayName} — ${product.colour} ${product.fabric} by ${SITE_NAME}`,
      }
    : {
        url: `${SITE_URL}/product/${product.slug}/opengraph-image`,
        width: 1200,
        height: 630,
        alt: `${displayName} — ${SITE_NAME}`,
      };

  const availability = product.stock > 0 ? "in stock" : "out of stock";

  return buildMetadata({
    title,
    description: rawDescription,
    path: `/product/${product.slug}`,
    image: primaryImage,
    keywords: [
      product.name,
      `${product.name} price in Sri Lanka`,
      `${product.fabric} Sri Lanka`,
      product.subcategory ?? "Pakistani suits Sri Lanka",
      `${product.colour} ${product.fabric}`,
      SITE_NAME,
    ],
    other: {
      "og:type": "product",
      "product:price:amount": String(price),
      "product:price:currency": CURRENCY,
      "product:availability": availability,
      "product:condition": "new",
      "product:brand": SITE_NAME,
    },
  });
}

/**
 * PLP / Category metadata builder.
 * Computes canonical strictly from indexable facets (category -> subcategory -> brand).
 * Marks unknown or thin facet combinations as `noindex, follow`.
 */
export function buildCategoryMetadata({
  category,
  subcategory,
  brand,
  searchQuery,
  matchingCount,
  hasUnknownFacet = false,
}: {
  category?: Category;
  subcategory?: string;
  brand?: string;
  searchQuery?: string;
  matchingCount?: number;
  hasUnknownFacet?: boolean;
}): Metadata {
  const validSubcategory =
    subcategory && category?.subcategories?.some((s) => s.toLowerCase() === subcategory.toLowerCase())
      ? category.subcategories.find((s) => s.toLowerCase() === subcategory.toLowerCase())
      : undefined;

  const isInvalidSub = Boolean(subcategory && !validSubcategory);
  const isThinFacet =
    typeof matchingCount === "number" &&
    matchingCount === 0 &&
    Boolean(subcategory || brand || searchQuery);
  const isSearchQuery = Boolean(searchQuery && searchQuery.trim().length > 0);

  const shouldNoindex = hasUnknownFacet || isInvalidSub || isThinFacet || isSearchQuery;

  const basePath = category ? `/shop/${category.slug}` : "/shop";
  const canonicalParams: Record<string, string | undefined> = {};
  if (validSubcategory) canonicalParams.sub = validSubcategory;
  if (brand) canonicalParams.brand = brand.toLowerCase();

  const titlePrefix = validSubcategory
    ? `${validSubcategory} — ${category?.name ?? "Shop"}`
    : category
      ? `${category.name} in ${COUNTRY_NAME}`
      : `Shop Pakistani Lawn Suits, Shalwar Kameez & Lehengas in ${COUNTRY_NAME}`;

  const description = category
    ? `${category.blurb} Shop 100% original ${category.name.toLowerCase()} online at ${SITE_NAME} with island-wide courier and Cash on Delivery across ${COUNTRY_NAME}.`
    : `Shop the latest Pakistani lawn suits, ready-to-wear shalwar kameez, festive suits and bridal lehengas from ${SITE_NAME}, delivered island-wide across ${COUNTRY_NAME}.`;

  const image = category
    ? {
        url: `${SITE_URL}/shop/${category.slug}/opengraph-image`,
        width: 1200,
        height: 630,
        alt: `${category.name} in ${COUNTRY_NAME} | ${SITE_NAME}`,
      }
    : undefined;

  return buildMetadata({
    title: titlePrefix,
    description,
    path: basePath,
    canonicalQueryParams: Object.keys(canonicalParams).length > 0 ? canonicalParams : undefined,
    image,
    noindex: shouldNoindex,
    keywords: category
      ? [
          `${category.name} Sri Lanka`,
          `buy ${category.name.toLowerCase()} Colombo`,
          ...(category.subcategories ?? []).map((s) => `${s} Sri Lanka`),
          SITE_NAME,
        ]
      : undefined,
  });
}

