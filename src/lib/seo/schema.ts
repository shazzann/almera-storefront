import {
  SIZES,
  getOptionStock,
  nameWithColour,
  startingPrice,
  stitchingOptions,
  type Category,
  type Product,
  type Stitching,
} from "@/lib/catalog";
import {
  COUNTRY,
  CURRENCY,
  DEFAULT_OG_IMAGE,
  FOUNDING_DATE,
  LEGAL_NAME,
  LOGO_URL,
  OFFER_PRICE_VALID_UNTIL,
  POSTAL_ADDRESS,
  RETURN_POLICY,
  SHIPPING_POLICY,
  SITE_DESCRIPTION_DEFAULT,
  SITE_NAME,
  SITE_TAGLINE,
  SITE_URL,
  SOCIAL_PROFILES,
  STORE_GEO,
  STORE_OPENING_HOURS,
  SUPPORT_EMAIL,
  SUPPORT_PHONE,
} from "./config";
import { cleanDescriptionText } from "./metadata";

export const ORGANIZATION_ID = `${SITE_URL}/#organization`;
export const WEBSITE_ID = `${SITE_URL}/#website`;
export const STORE_ID = `${SITE_URL}/#store`;

/**
 * Escapes `<` as `\u003c` when serializing JSON-LD to prevent XSS injection.
 */
export function serializeJsonLd(data: unknown): string {
  return JSON.stringify(data).replace(/</g, "\\u003c");
}

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function isRealIdentifier(val?: string | null): val is string {
  if (!val || typeof val !== "string") return false;
  const trimmed = val.trim();
  return trimmed.length > 0 && !UUID_PATTERN.test(trimmed);
}

export type BreadcrumbItem = {
  name: string;
  path: string;
};

/**
 * Site-wide `@graph` rendered ONCE in `src/app/layout.tsx`.
 * Contains `Organization` (`/#organization`) and `WebSite` (`/#website`).
 */
export function buildSiteGraphSchema() {
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization",
        "@id": ORGANIZATION_ID,
        name: SITE_NAME,
        legalName: LEGAL_NAME,
        alternateName: `${SITE_NAME} — ${SITE_TAGLINE}`,
        url: SITE_URL,
        logo: {
          "@type": "ImageObject",
          "@id": `${SITE_URL}/#logo`,
          url: LOGO_URL,
          contentUrl: LOGO_URL,
          width: 1254,
          height: 1254,
          caption: `${SITE_NAME} — ${SITE_TAGLINE}`,
        },
        image: DEFAULT_OG_IMAGE.url,
        description: SITE_DESCRIPTION_DEFAULT,
        foundingDate: FOUNDING_DATE,
        email: SUPPORT_EMAIL,
        telephone: SUPPORT_PHONE,
        address: {
          "@type": "PostalAddress",
          ...POSTAL_ADDRESS,
        },
        sameAs: [...SOCIAL_PROFILES],
        contactPoint: [
          {
            "@type": "ContactPoint",
            contactType: "customer service",
            telephone: SUPPORT_PHONE,
            email: SUPPORT_EMAIL,
            areaServed: COUNTRY,
            availableLanguage: ["en", "si", "ta"],
          },
          {
            "@type": "ContactPoint",
            contactType: "sales",
            telephone: SUPPORT_PHONE,
            email: SUPPORT_EMAIL,
            areaServed: COUNTRY,
            availableLanguage: ["en", "si", "ta"],
          },
        ],
      },
      {
        "@type": "WebSite",
        "@id": WEBSITE_ID,
        url: SITE_URL,
        name: SITE_NAME,
        alternateName: `${SITE_NAME} — ${SITE_TAGLINE}`,
        inLanguage: "en-LK",
        publisher: {
          "@id": ORGANIZATION_ID,
        },
        potentialAction: {
          "@type": "SearchAction",
          target: {
            "@type": "EntryPoint",
            urlTemplate: `${SITE_URL}/shop?q={search_term_string}`,
          },
          "query-input": "required name=search_term_string",
        },
      },
    ],
  };
}

/**
 * `Store` / `LocalBusiness` schema for the homepage.
 * References the site-wide `Organization` via `@id`.
 */
export function buildHomeStoreSchema() {
  return {
    "@context": "https://schema.org",
    "@type": "ClothingStore",
    "@id": STORE_ID,
    name: `${SITE_NAME} — ${SITE_TAGLINE}`,
    description: SITE_DESCRIPTION_DEFAULT,
    url: SITE_URL,
    image: [DEFAULT_OG_IMAGE.url, LOGO_URL],
    telephone: SUPPORT_PHONE,
    email: SUPPORT_EMAIL,
    priceRange: "LKR 5,000 - LKR 120,000",
    currenciesAccepted: CURRENCY,
    paymentAccepted: "Cash on Delivery, Bank Transfer, Visa, MasterCard",
    address: {
      "@type": "PostalAddress",
      ...POSTAL_ADDRESS,
    },
    geo: {
      "@type": "GeoCoordinates",
      latitude: STORE_GEO.latitude,
      longitude: STORE_GEO.longitude,
    },
    openingHoursSpecification: [
      {
        "@type": "OpeningHoursSpecification",
        dayOfWeek: [...STORE_OPENING_HOURS.dayOfWeek],
        opens: STORE_OPENING_HOURS.opens,
        closes: STORE_OPENING_HOURS.closes,
      },
    ],
    parentOrganization: {
      "@id": ORGANIZATION_ID,
    },
  };
}

/**
 * Builds an `Offer` schema with live availability, shipping details from config,
 * and merchant return policy. Never hardcodes shipping numbers.
 */
export function buildOfferSchema({
  url,
  price,
  inStock,
  stitching = "unstitched",
  sku,
}: {
  url: string;
  price: number;
  inStock: boolean;
  stitching?: Stitching;
  sku?: string;
}) {
  const handling =
    stitching === "stitched"
      ? SHIPPING_POLICY.stitchedHandlingDays
      : SHIPPING_POLICY.unstitchedHandlingDays;

  const shippingRateValue =
    price >= SHIPPING_POLICY.freeShippingThresholdLkr
      ? 0
      : SHIPPING_POLICY.firstPieceRateLkr;

  return {
    "@type": "Offer" as const,
    url,
    price: Number(price.toFixed(2)),
    priceCurrency: CURRENCY,
    priceValidUntil: OFFER_PRICE_VALID_UNTIL,
    itemCondition: "https://schema.org/NewCondition",
    availability: inStock
      ? "https://schema.org/InStock"
      : "https://schema.org/OutOfStock",
    ...(isRealIdentifier(sku) ? { sku } : {}),
    seller: {
      "@id": ORGANIZATION_ID,
    },
    shippingDetails: {
      "@type": "OfferShippingDetails",
      shippingRate: {
        "@type": "MonetaryAmount",
        value: shippingRateValue,
        currency: CURRENCY,
      },
      shippingDestination: {
        "@type": "DefinedRegion",
        addressCountry: SHIPPING_POLICY.destinationCountry,
      },
      deliveryTime: {
        "@type": "ShippingDeliveryTime",
        handlingTime: {
          "@type": "QuantitativeValue",
          minValue: handling.min,
          maxValue: handling.max,
          unitCode: "DAY",
        },
        transitTime: {
          "@type": "QuantitativeValue",
          minValue: SHIPPING_POLICY.transitDays.min,
          maxValue: SHIPPING_POLICY.transitDays.max,
          unitCode: "DAY",
        },
      },
    },
    hasMerchantReturnPolicy: {
      "@type": "MerchantReturnPolicy",
      applicableCountry: RETURN_POLICY.applicableCountry,
      returnPolicyCategory: RETURN_POLICY.returnPolicyCategory,
    },
  };
}

/**
 * Builds PDP structured data (`Product` or `ProductGroup` when variants exist).
 * - Uses full image array.
 * - Includes `gtin` / `mpn` ONLY when real non-UUID values exist.
 * - Includes `aggregateRating` and up to 5 `review` items ONLY when real reviews exist.
 * - Includes `hasPart` for multi-piece suits/bundles and `isRelatedTo` for colour siblings.
 */
export function buildProductSchema(
  product: Product,
  options: {
    categoryName?: string;
    colourSiblings?: Product[];
  } = {},
) {
  const productUrl = `${SITE_URL}/product/${product.slug}`;
  const cleanDesc =
    cleanDescriptionText(product.description) ||
    `${product.name} in ${product.colour} ${product.fabric} by ${SITE_NAME}.`;
  const images =
    product.images.length > 0
      ? product.images.map((img) =>
          img.startsWith("http") ? img : `${SITE_URL}${img.startsWith("/") ? "" : "/"}${img}`,
        )
      : [DEFAULT_OG_IMAGE.url];

  const categoryName = options.categoryName || product.categories[0] || "Apparel";
  const baseSku = isRealIdentifier(product.sku)
    ? product.sku
    : `ALM-${product.slug.toUpperCase()}`;

  const stitchings = stitchingOptions(product);
  const sizes = product.sizes && product.sizes.length > 0 ? product.sizes : [...SIZES];

  // Build real review / aggregateRating nodes only if verified reviews exist
  const reviewNodes =
    product.reviews && product.reviews.length > 0
      ? {
          aggregateRating: {
            "@type": "AggregateRating",
            ratingValue: Number(
              (
                product.reviews.reduce((acc, r) => acc + r.ratingValue, 0) /
                product.reviews.length
              ).toFixed(2),
            ),
            reviewCount: product.reviews.length,
            bestRating: 5,
            worstRating: 1,
          },
          review: product.reviews.slice(0, 5).map((r) => ({
            "@type": "Review",
            author: {
              "@type": "Person",
              name: r.author,
            },
            ...(r.datePublished ? { datePublished: r.datePublished } : {}),
            reviewBody: r.body,
            reviewRating: {
              "@type": "Rating",
              ratingValue: r.ratingValue,
              bestRating: 5,
              worstRating: 1,
            },
          })),
        }
      : {};

  // Multi-piece suit/bundle components
  const hasPart =
    product.pieces && product.pieces.length > 1
      ? product.pieces.map((piece, idx) => ({
          "@type": "Product",
          name: `${product.name} — ${piece}`,
          sku: `${baseSku}-P${idx + 1}`,
          brand: {
            "@type": "Brand",
            name: SITE_NAME,
          },
        }))
      : undefined;

  // Related colour siblings
  const isRelatedTo =
    options.colourSiblings && options.colourSiblings.length > 0
      ? options.colourSiblings
          .filter((sib) => sib.slug !== product.slug)
          .map((sib) => ({
            "@type": "Product",
            name: nameWithColour(sib),
            url: `${SITE_URL}/product/${sib.slug}`,
            color: sib.colour,
            ...(sib.images[0] ? { image: sib.images[0] } : {}),
          }))
      : undefined;

  // Determine variant list (unstitched + stitched sizes)
  type VariantEntry = {
    variantName: string;
    sku: string;
    stitching: Stitching;
    size?: string;
    price: number;
    inStock: boolean;
    url: string;
  };

  const variantEntries: VariantEntry[] = [];

  if (stitchings.includes("unstitched") && product.price.unstitched != null) {
    const dbVar = product.variants?.find(
      (v) => v.stitching === "unstitched" && v.size === "-",
    );
    const stock = getOptionStock(product, "unstitched");
    variantEntries.push({
      variantName: `${nameWithColour(product)} — Unstitched`,
      sku: isRealIdentifier(dbVar?.sku) ? dbVar!.sku! : `${baseSku}-UNSTITCHED`,
      stitching: "unstitched",
      price: dbVar?.price ?? product.price.unstitched,
      inStock: stock > 0,
      url: `${productUrl}?stitching=unstitched`,
    });
  }

  if (stitchings.includes("stitched") && product.price.stitched != null) {
    for (const sz of sizes) {
      const dbVar = product.variants?.find(
        (v) => v.stitching === "stitched" && v.size === sz,
      );
      const stock = getOptionStock(product, "stitched", sz);
      variantEntries.push({
        variantName: `${nameWithColour(product)} — Stitched (${sz})`,
        sku: isRealIdentifier(dbVar?.sku)
          ? dbVar!.sku!
          : `${baseSku}-STITCHED-${sz.toUpperCase()}`,
        stitching: "stitched",
        size: sz,
        price: dbVar?.price ?? product.price.stitched,
        inStock: stock > 0,
        url: `${productUrl}?stitching=stitched&size=${encodeURIComponent(sz)}`,
      });
    }
  }

  const hasMultipleVariants = variantEntries.length > 1;

  if (hasMultipleVariants) {
    const variesBy: string[] = ["https://schema.org/size"];
    if (product.colourGroup) {
      variesBy.push("https://schema.org/color");
    }

    return {
      "@context": "https://schema.org",
      "@type": "ProductGroup",
      "@id": `${productUrl}#product-group`,
      productGroupID: product.colourGroup || product.slug,
      name: nameWithColour(product),
      description: cleanDesc,
      url: productUrl,
      image: images,
      sku: baseSku,
      ...(isRealIdentifier(product.gtin) ? { gtin: product.gtin } : {}),
      ...(isRealIdentifier(product.mpn) ? { mpn: product.mpn } : {}),
      brand: {
        "@type": "Brand",
        name: SITE_NAME,
      },
      category: categoryName,
      color: product.colour,
      material: product.fabric,
      variesBy,
      hasVariant: variantEntries.map((v) => ({
        "@type": "Product",
        name: v.variantName,
        description: cleanDesc,
        url: v.url,
        image: images,
        sku: v.sku,
        color: product.colour,
        material: product.fabric,
        ...(v.size ? { size: v.size } : {}),
        brand: {
          "@type": "Brand",
          name: SITE_NAME,
        },
        offers: buildOfferSchema({
          url: productUrl,
          price: v.price,
          inStock: v.inStock,
          stitching: v.stitching,
          sku: v.sku,
        }),
      })),
      ...(hasPart ? { hasPart } : {}),
      ...(isRelatedTo ? { isRelatedTo } : {}),
      ...reviewNodes,
    };
  }

  const singlePrice = variantEntries[0]?.price ?? startingPrice(product);
  const singleStitching = variantEntries[0]?.stitching ?? "unstitched";
  const singleSku = variantEntries[0]?.sku ?? baseSku;

  return {
    "@context": "https://schema.org",
    "@type": "Product",
    "@id": `${productUrl}#product`,
    name: nameWithColour(product),
    description: cleanDesc,
    url: productUrl,
    image: images,
    sku: singleSku,
    ...(isRealIdentifier(product.gtin) ? { gtin: product.gtin } : {}),
    ...(isRealIdentifier(product.mpn) ? { mpn: product.mpn } : {}),
    brand: {
      "@type": "Brand",
      name: SITE_NAME,
    },
    category: categoryName,
    color: product.colour,
    material: product.fabric,
    offers: buildOfferSchema({
      url: productUrl,
      price: singlePrice,
      inStock: product.stock > 0,
      stitching: singleStitching,
      sku: singleSku,
    }),
    ...(hasPart ? { hasPart } : {}),
    ...(isRelatedTo ? { isRelatedTo } : {}),
    ...reviewNodes,
  };
}

/**
 * Dedicated bundle/collection schema builder with Offer and `hasPart`/`isRelatedTo`.
 */
export function buildBundleSchema({
  slug,
  name,
  description,
  image,
  price,
  inStock,
  includedProducts,
}: {
  slug: string;
  name: string;
  description: string;
  image: string;
  price: number;
  inStock: boolean;
  includedProducts: Product[];
}) {
  const bundleUrl = `${SITE_URL}/product/${slug}`;
  return {
    "@context": "https://schema.org",
    "@type": "Product",
    "@id": `${bundleUrl}#bundle`,
    name,
    description: cleanDescriptionText(description),
    url: bundleUrl,
    image: [image.startsWith("http") ? image : `${SITE_URL}${image}`],
    sku: `ALM-BUNDLE-${slug.toUpperCase()}`,
    brand: {
      "@type": "Brand",
      name: SITE_NAME,
    },
    offers: buildOfferSchema({
      url: bundleUrl,
      price,
      inStock,
      sku: `ALM-BUNDLE-${slug.toUpperCase()}`,
    }),
    hasPart: includedProducts.map((p) => ({
      "@type": "Product",
      name: nameWithColour(p),
      url: `${SITE_URL}/product/${p.slug}`,
      ...(p.images[0] ? { image: p.images[0] } : {}),
    })),
    isRelatedTo: includedProducts.map((p) => ({
      "@type": "Product",
      name: nameWithColour(p),
      url: `${SITE_URL}/product/${p.slug}`,
    })),
  };
}

/**
 * `ItemList` schema for Featured Products (Home) or Category Product Grids (first 50 items).
 */
export function buildItemListSchema({
  name,
  url,
  products,
}: {
  name: string;
  url: string;
  products: Product[];
}) {
  const capped = products.slice(0, 50);
  return {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name,
    url: url.startsWith("http") ? url : `${SITE_URL}${url}`,
    numberOfItems: capped.length,
    itemListElement: capped.map((p, index) => ({
      "@type": "ListItem",
      position: index + 1,
      url: `${SITE_URL}/product/${p.slug}`,
      name: nameWithColour(p),
      ...(p.images[0] ? { image: p.images[0] } : {}),
    })),
  };
}

/**
 * `CollectionPage` + `ItemList` (first 50 items) for PLP / Category / Brand pages.
 */
export function buildCollectionPageSchema({
  category,
  path,
  title,
  description,
  products,
}: {
  category?: Category;
  path: string;
  title?: string;
  description?: string;
  products: Product[];
}) {
  const pageUrl = `${SITE_URL}${path === "/" ? "" : path}`;
  const pageTitle = title || (category ? `${category.name} in Sri Lanka` : "Shop the Wardrobe");
  const pageDesc = cleanDescriptionText(
    description || category?.blurb || SITE_DESCRIPTION_DEFAULT,
  );
  const capped = products.slice(0, 50);

  return {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    "@id": `${pageUrl}#collection`,
    name: pageTitle,
    description: pageDesc,
    url: pageUrl,
    inLanguage: "en-LK",
    isPartOf: {
      "@id": WEBSITE_ID,
    },
    about: {
      "@id": ORGANIZATION_ID,
    },
    mainEntity: {
      "@type": "ItemList",
      name: pageTitle,
      numberOfItems: capped.length,
      itemListElement: capped.map((p, idx) => ({
        "@type": "ListItem",
        position: idx + 1,
        url: `${SITE_URL}/product/${p.slug}`,
        name: nameWithColour(p),
        ...(p.images[0] ? { image: p.images[0] } : {}),
      })),
    },
  };
}

/**
 * `BreadcrumbList` schema matching the visible `<Breadcrumbs />` component on every public page.
 */
export function buildBreadcrumbSchema(items: BreadcrumbItem[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, idx) => {
      const fullUrl = item.path.startsWith("http")
        ? item.path
        : `${SITE_URL}${item.path === "/" ? "" : item.path}`;
      return {
        "@type": "ListItem",
        position: idx + 1,
        name: item.name,
        item: fullUrl,
      };
    }),
  };
}

/**
 * Builds the 4- or 5-level PDP breadcrumb trail:
 * Home → Shop → Category → (Subcategory if present) → Product
 */
export function buildProductBreadcrumbItems(
  product: Product,
  category: { slug: string; name: string },
): BreadcrumbItem[] {
  const items: BreadcrumbItem[] = [
    { name: "Home", path: "/" },
    { name: "Shop", path: "/shop" },
    { name: category.name, path: `/shop/${category.slug}` },
  ];

  if (product.subcategory && product.subcategory.trim()) {
    items.push({
      name: product.subcategory.trim(),
      path: `/shop/${category.slug}?sub=${encodeURIComponent(product.subcategory.trim())}`,
    });
  }

  items.push({
    name: nameWithColour(product),
    path: `/product/${product.slug}`,
  });

  return items;
}

/**
 * `FAQPage` schema for pages that render a visible Q&A section.
 */
export function buildFaqSchema(faqs: { q: string; a: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((faq) => ({
      "@type": "Question",
      name: cleanDescriptionText(faq.q),
      acceptedAnswer: {
        "@type": "Answer",
        text: cleanDescriptionText(faq.a),
      },
    })),
  };
}
