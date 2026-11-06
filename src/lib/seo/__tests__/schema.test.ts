import assert from "node:assert/strict";
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";
import { z } from "zod";
import type { Product } from "@/lib/catalog";
import { SITE_URL } from "@/lib/seo/config";
import { buildMerchantFeedXml } from "@/lib/seo/feeds";
import {
  buildCanonicalUrl,
  buildCategoryMetadata,
  buildMetadata,
  buildProductMetadata,
  truncateMetaDescription,
} from "@/lib/seo/metadata";
import { prefersMarkdown } from "@/lib/seo/redirects";
import {
  ORGANIZATION_ID,
  WEBSITE_ID,
  buildBreadcrumbSchema,
  buildBundleSchema,
  buildCollectionPageSchema,
  buildFaqSchema,
  buildHomeStoreSchema,
  buildProductBreadcrumbItems,
  buildProductSchema,
  buildSiteGraphSchema,
  serializeJsonLd,
} from "@/lib/seo/schema";

const __dirname = dirname(fileURLToPath(import.meta.url));
const SNAPSHOT_PATH = join(__dirname, "product-schema.snapshot.json");

// Google Rich Results Zod Validators
const QuantitativeValueSchema = z.object({
  "@type": z.literal("QuantitativeValue"),
  minValue: z.number().int().nonnegative(),
  maxValue: z.number().int().nonnegative(),
  unitCode: z.literal("DAY"),
});

const OfferShippingDetailsSchema = z.object({
  "@type": z.literal("OfferShippingDetails"),
  shippingRate: z.object({
    "@type": z.literal("MonetaryAmount"),
    value: z.number().nonnegative(),
    currency: z.literal("LKR"),
  }),
  shippingDestination: z.object({
    "@type": z.literal("DefinedRegion"),
    addressCountry: z.literal("LK"),
  }),
  deliveryTime: z.object({
    "@type": z.literal("ShippingDeliveryTime"),
    handlingTime: QuantitativeValueSchema,
    transitTime: QuantitativeValueSchema,
  }),
});

const MerchantReturnPolicySchema = z.object({
  "@type": z.literal("MerchantReturnPolicy"),
  applicableCountry: z.literal("LK"),
  returnPolicyCategory: z.enum([
    "https://schema.org/MerchantReturnNotPermitted",
    "https://schema.org/MerchantReturnFiniteReturnWindow",
    "https://schema.org/MerchantReturnUnlimitedWindow",
  ]),
});

const OfferSchema = z.object({
  "@type": z.literal("Offer"),
  url: z.string().url(),
  price: z.number().positive(),
  priceCurrency: z.literal("LKR"),
  priceValidUntil: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  itemCondition: z.literal("https://schema.org/NewCondition"),
  availability: z.enum([
    "https://schema.org/InStock",
    "https://schema.org/OutOfStock",
    "https://schema.org/PreOrder",
  ]),
  sku: z.string().min(1).optional(),
  seller: z.object({
    "@id": z.literal(ORGANIZATION_ID),
  }),
  shippingDetails: OfferShippingDetailsSchema,
  hasMerchantReturnPolicy: MerchantReturnPolicySchema,
});

const VariantProductSchema = z.object({
  "@type": z.literal("Product"),
  name: z.string().min(1),
  description: z.string().min(1),
  url: z.string().url(),
  image: z.array(z.string().url()).min(1),
  sku: z.string().min(1),
  color: z.string().min(1),
  material: z.string().min(1),
  size: z.string().optional(),
  brand: z.object({
    "@type": z.literal("Brand"),
    name: z.string().min(1),
  }),
  offers: OfferSchema,
});

const ProductGroupSchema = z.object({
  "@context": z.literal("https://schema.org"),
  "@type": z.literal("ProductGroup"),
  "@id": z.string().url(),
  productGroupID: z.string().min(1),
  name: z.string().min(1),
  description: z.string().min(1),
  url: z.string().url(),
  image: z.array(z.string().url()).min(1),
  sku: z.string().min(1),
  brand: z.object({
    "@type": z.literal("Brand"),
    name: z.string().min(1),
  }),
  category: z.string().min(1),
  color: z.string().min(1),
  material: z.string().min(1),
  variesBy: z.array(z.string()).min(1),
  hasVariant: z.array(VariantProductSchema).min(2),
});

const SiteGraphSchema = z.object({
  "@context": z.literal("https://schema.org"),
  "@graph": z.tuple([
    z.object({
      "@type": z.literal("Organization"),
      "@id": z.literal(ORGANIZATION_ID),
      name: z.string().min(1),
      legalName: z.string().min(1),
      url: z.literal(SITE_URL),
      logo: z.object({
        "@type": z.literal("ImageObject"),
        url: z.string().url(),
      }),
      contactPoint: z
        .array(
          z.object({
            "@type": z.literal("ContactPoint"),
            contactType: z.string(),
            telephone: z.string(),
            areaServed: z.literal("LK"),
            availableLanguage: z.array(z.string()).min(1),
          }),
        )
        .min(2),
    }),
    z.object({
      "@type": z.literal("WebSite"),
      "@id": z.literal(WEBSITE_ID),
      url: z.literal(SITE_URL),
      publisher: z.object({ "@id": z.literal(ORGANIZATION_ID) }),
      potentialAction: z.object({
        "@type": z.literal("SearchAction"),
        target: z.object({
          "@type": z.literal("EntryPoint"),
          urlTemplate: z.string().includes("{search_term_string}"),
        }),
        "query-input": z.literal("required name=search_term_string"),
      }),
    }),
  ]),
});

const BreadcrumbListSchema = z.object({
  "@context": z.literal("https://schema.org"),
  "@type": z.literal("BreadcrumbList"),
  itemListElement: z
    .array(
      z.object({
        "@type": z.literal("ListItem"),
        position: z.number().int().positive(),
        name: z.string().min(1),
        item: z.string().url(),
      }),
    )
    .min(1),
});

const FaqPageSchema = z.object({
  "@context": z.literal("https://schema.org"),
  "@type": z.literal("FAQPage"),
  mainEntity: z
    .array(
      z.object({
        "@type": z.literal("Question"),
        name: z.string().min(1),
        acceptedAnswer: z.object({
          "@type": z.literal("Answer"),
          text: z.string().min(1),
        }),
      }),
    )
    .min(1),
});

const SAMPLE_PRODUCT: Product = {
  id: "9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d",
  slug: "emerald-garden-lawn",
  name: "Emerald Garden Embroidered Lawn",
  categories: ["lawns", "pakistani"],
  subcategory: "Printed & Embroidered",
  colour: "Emerald",
  fabric: "Pakistani Lawn",
  price: {
    unstitched: 12500,
    stitched: 16000,
  },
  wasPrice: {
    unstitched: 14500,
  },
  images: [
    "https://cdn.almera.lk/storage/v1/object/public/product-images/products/emerald-1.webp",
    "https://cdn.almera.lk/storage/v1/object/public/product-images/products/emerald-2.webp",
  ],
  pieces: [
    "Embroidered lawn shirt front, printed back & sleeves",
    "2.5 m chiffon dupatta",
    "2.5 m dyed cambric trouser",
  ],
  description:
    "Breathable three-piece Pakistani lawn suit in deep emerald with delicate neckline embroidery and a printed chiffon dupatta.",
  stock: 6,
  unstitchedStock: 3,
  sizeStock: { M: 1, L: 2, XL: 0, XXL: 0 },
  sizes: ["M", "L", "XL", "XXL"],
  tags: ["new", "bestseller"],
  colourGroup: "garden-lawn",
  mpn: "9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d", // UUID must be rejected as mpn!
};

describe("Technical SEO Layer — JSON-LD, Metadata & Feeds", () => {
  it("validates site-wide Organization + WebSite @graph", () => {
    const graph = buildSiteGraphSchema();
    const parsed = SiteGraphSchema.safeParse(graph);
    assert.equal(parsed.success, true, parsed.error?.message);
  });

  it("validates Home ClothingStore schema and references Organization by @id", () => {
    const store = buildHomeStoreSchema();
    assert.equal(store["@type"], "ClothingStore");
    assert.deepEqual(store.parentOrganization, { "@id": ORGANIZATION_ID });
  });

  it("validates PDP ProductGroup schema, omits UUID mpn, and snapshots JSON-LD", () => {
    const schema = buildProductSchema(SAMPLE_PRODUCT, {
      categoryName: "Lawns",
    });

    const parsed = ProductGroupSchema.safeParse(schema);
    assert.equal(parsed.success, true, parsed.error?.message);

    // Ensure UUID was NOT emitted as mpn
    assert.equal("mpn" in schema, false);
    assert.equal("gtin" in schema, false);
    // Ensure fake reviews are never emitted when product.reviews is undefined
    assert.equal("aggregateRating" in schema, false);
    assert.equal("review" in schema, false);

    // Snapshot verification
    const serialized = JSON.stringify(schema, null, 2);
    if (!existsSync(SNAPSHOT_PATH)) {
      writeFileSync(SNAPSHOT_PATH, `${serialized}\n`, "utf8");
    }
    const existingSnapshot = readFileSync(SNAPSHOT_PATH, "utf8").trim();
    assert.equal(serialized, existingSnapshot);
  });

  it("validates single-variant Product schema and free-shipping threshold calculation", () => {
    const luxuryLehenga: Product = {
      ...SAMPLE_PRODUCT,
      slug: "bridal-zardozi-lehenga",
      name: "Bridal Zardozi Lehenga",
      categories: ["occasion"],
      subcategory: "Lehengas",
      price: { unstitched: 48000 },
      sizes: [],
      unstitchedStock: 1,
      stock: 1,
      mpn: "ALM-BR-01",
    };

    const schema = buildProductSchema(luxuryLehenga, { categoryName: "Occasion" });
    assert.equal(schema["@type"], "Product");
    assert.equal(schema.mpn, "ALM-BR-01");
    if ("offers" in schema) {
      assert.equal(schema.offers.shippingDetails.shippingRate.value, 0);
      assert.equal(schema.offers.availability, "https://schema.org/InStock");
    }
  });

  it("validates Bundle schema with hasPart and isRelatedTo", () => {
    const bundle = buildBundleSchema({
      slug: "eid-festive-trio",
      name: "Eid Festive Trio Bundle",
      description: "Three coordinated lawn suits for Eid.",
      image: "/brand/almera-logo-new.jpeg",
      price: 34000,
      inStock: true,
      includedProducts: [SAMPLE_PRODUCT],
    });
    assert.equal(bundle["@type"], "Product");
    assert.equal(bundle.hasPart.length, 1);
    assert.equal(bundle.offers.shippingDetails.shippingRate.value, 0);
  });

  it("validates PDP 5-level BreadcrumbList (Home -> Shop -> Category -> Subcategory -> Product)", () => {
    const items = buildProductBreadcrumbItems(SAMPLE_PRODUCT, {
      slug: "lawns",
      name: "Lawns",
    });
    assert.equal(items.length, 5);
    assert.deepEqual(
      items.map((i) => i.name),
      [
        "Home",
        "Shop",
        "Lawns",
        "Printed & Embroidered",
        "Emerald Garden Embroidered Lawn",
      ],
    );
    const bcSchema = buildBreadcrumbSchema(items);
    assert.equal(BreadcrumbListSchema.safeParse(bcSchema).success, true);
  });

  it("validates CollectionPage + ItemList and FAQPage schemas", () => {
    const col = buildCollectionPageSchema({
      path: "/shop/lawns",
      title: "Lawns in Sri Lanka",
      products: [SAMPLE_PRODUCT],
    });
    assert.equal(col["@type"], "CollectionPage");
    assert.equal(col.mainEntity["@type"], "ItemList");
    assert.equal(col.mainEntity.numberOfItems, 1);

    const faq = buildFaqSchema([{ q: "Does **almera** deliver island-wide?", a: "Yes, in 2–4 days." }]);
    assert.equal(FaqPageSchema.safeParse(faq).success, true);
    assert.equal(faq.mainEntity[0].name, "Does almera deliver island-wide?");
  });

  it("escapes `<` as `\\u003c` in JsonLd serializer to prevent XSS", () => {
    const raw = serializeJsonLd({ name: "</script><script>alert(1)</script>" });
    assert.equal(raw.includes("</script>"), false);
    assert.equal(raw.includes("\\u003c/script>"), true);
  });

  it("builds canonical URLs, truncates descriptions, and applies PDP title pattern", () => {
    const truncated = truncateMetaDescription(
      "**Markdown** _text_ with   extra spaces and a very long sentence that exceeds one hundred and fifty five characters so we can verify word boundary truncation works properly without cutting mid-word.",
      155,
    );
    assert.ok(truncated.length <= 156);
    assert.equal(truncated.includes("**"), false);

    assert.equal(
      buildCanonicalUrl("/Shop/Lawns/", {
        sub: "Cotton",
        sort: "price-asc",
        utm_source: "ig",
      }),
      "https://almera.lk/shop/lawns?sub=Cotton",
    );

    const pdpMeta = buildProductMetadata(SAMPLE_PRODUCT);
    assert.equal(
      pdpMeta.title,
      "Emerald Garden Embroidered Lawn Price in Sri Lanka | 100% Original",
    );
    assert.equal(
      (pdpMeta.other as Record<string, string>)["product:price:currency"],
      "LKR",
    );

    const unknownFacetMeta = buildCategoryMetadata({
      subcategory: "NonExistentSub",
    });
    assert.deepEqual(
      (unknownFacetMeta.robots as { index: boolean; follow: boolean }).index,
      false,
    );

    const noindexMeta = buildMetadata({
      title: "Checkout",
      path: "/checkout",
      noindex: true,
    });
    assert.deepEqual(
      (noindexMeta.robots as { index: boolean; follow: boolean }).index,
      false,
    );
  });

  it("parses Accept header q-values for Markdown content negotiation", () => {
    assert.equal(prefersMarkdown("text/markdown"), true);
    assert.equal(prefersMarkdown("text/markdown;q=0.9, text/html;q=0.8"), true);
    assert.equal(prefersMarkdown("text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8"), false);
    assert.equal(prefersMarkdown("text/markdown;q=0.5, text/html;q=0.9"), false);
  });

  it("generates valid Google Merchant XML feed with sale_price and shipping", () => {
    const xml = buildMerchantFeedXml({
      products: [SAMPLE_PRODUCT],
      categories: [],
      target: "google",
    });
    assert.ok(xml.includes('<rss version="2.0" xmlns:g="http://base.google.com/ns/1.0">'));
    assert.ok(xml.includes("<g:item_group_id>garden-lawn</g:item_group_id>"));
    assert.ok(xml.includes("<g:price>14500.00 LKR</g:price>"));
    assert.ok(xml.includes("<g:sale_price>12500.00 LKR</g:sale_price>"));
    assert.ok(xml.includes("<g:identifier_exists>no</g:identifier_exists>"));
  });
});
