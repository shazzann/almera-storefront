import {
  SIZES,
  getCategory,
  getOptionStock,
  nameWithColour,
  stitchingOptions,
  type Category,
  type Product,
  type Stitching,
} from "@/lib/catalog";
import {
  COUNTRY,
  CURRENCY,
  SHIPPING_POLICY,
  SITE_DESCRIPTION_DEFAULT,
  SITE_NAME,
  SITE_URL,
} from "./config";
import { cleanDescriptionText } from "./metadata";

export function escapeXml(value: string | number | null | undefined): string {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function isRealId(val?: string | null): val is string {
  if (!val || typeof val !== "string") return false;
  const trimmed = val.trim();
  return trimmed.length > 0 && !UUID_REGEX.test(trimmed);
}

function resolveGoogleProductCategory(product: Product): string {
  if (product.categories.includes("western")) {
    return "Apparel & Accessories > Clothing > Pants > Jeans";
  }
  if (product.categories.includes("occasion") || product.subcategory === "Lehengas") {
    return "Apparel & Accessories > Clothing > Wedding & Bridal Party Dresses";
  }
  return "Apparel & Accessories > Clothing > Traditional & Ceremonial Clothing";
}

function resolveProductType(product: Product, categories: Category[]): string {
  const catSlug = product.categories[0];
  const cat =
    categories.find((c) => c.slug === catSlug) ??
    (catSlug ? getCategory(catSlug) : undefined);
  const catName = cat?.name ?? "Apparel";
  return product.subcategory ? `${catName} > ${product.subcategory}` : catName;
}

type FeedVariantItem = {
  id: string;
  itemGroupId: string;
  title: string;
  description: string;
  link: string;
  imageLink: string;
  additionalImageLinks: string[];
  availability: "in_stock" | "out_of_stock";
  metaAvailability: "in stock" | "out of stock";
  regularPrice: number;
  salePrice?: number;
  brand: string;
  gtin?: string;
  mpn?: string;
  condition: "new";
  googleProductCategory: string;
  productType: string;
  color: string;
  material: string;
  size?: string;
  stitching: Stitching;
};

function expandProductForFeed(
  product: Product,
  categories: Category[],
): FeedVariantItem[] {
  const itemGroupId = product.colourGroup || product.slug;
  const baseTitle = nameWithColour(product);
  const description =
    cleanDescriptionText(product.description) ||
    `${baseTitle} in ${product.colour} ${product.fabric} from ${SITE_NAME}.`;
  const link = `${SITE_URL}/product/${product.slug}`;
  const fullImages = product.images
    .filter(Boolean)
    .map((img) =>
      img.startsWith("http")
        ? img
        : `${SITE_URL}${img.startsWith("/") ? "" : "/"}${img}`,
    );
  const imageLink = fullImages[0] ?? `${SITE_URL}/brand/almera-logo-new.jpeg`;
  const additionalImageLinks = fullImages.slice(1, 11);
  const googleProductCategory = resolveGoogleProductCategory(product);
  const productType = resolveProductType(product, categories);
  const stitchings = stitchingOptions(product);
  const sizes = product.sizes && product.sizes.length > 0 ? product.sizes : [...SIZES];

  const items: FeedVariantItem[] = [];

  if (stitchings.includes("unstitched") && product.price.unstitched != null) {
    const dbVar = product.variants?.find(
      (v) => v.stitching === "unstitched" && v.size === "-",
    );
    const currentPrice = dbVar?.price ?? product.price.unstitched;
    const compareAt = product.wasPrice?.unstitched;
    const hasSale = typeof compareAt === "number" && compareAt > currentPrice;
    const stock = getOptionStock(product, "unstitched");
    const inStock = stock > 0;
    const mpn = isRealId(dbVar?.sku)
      ? dbVar!.sku!
      : isRealId(product.mpn)
        ? product.mpn
        : undefined;

    items.push({
      id: `${product.slug}-unstitched`,
      itemGroupId,
      title: `${baseTitle} — Unstitched 3-Piece (${product.fabric})`,
      description,
      link,
      imageLink,
      additionalImageLinks,
      availability: inStock ? "in_stock" : "out_of_stock",
      metaAvailability: inStock ? "in stock" : "out of stock",
      regularPrice: hasSale ? compareAt! : currentPrice,
      ...(hasSale ? { salePrice: currentPrice } : {}),
      brand: SITE_NAME,
      ...(isRealId(product.gtin) ? { gtin: product.gtin } : {}),
      ...(mpn ? { mpn } : {}),
      condition: "new",
      googleProductCategory,
      productType,
      color: product.colour,
      material: product.fabric,
      size: "Unstitched",
      stitching: "unstitched",
    });
  }

  if (stitchings.includes("stitched") && product.price.stitched != null) {
    for (const sz of sizes) {
      const dbVar = product.variants?.find(
        (v) => v.stitching === "stitched" && v.size === sz,
      );
      const currentPrice = dbVar?.price ?? product.price.stitched;
      const compareAt = product.wasPrice?.stitched;
      const hasSale = typeof compareAt === "number" && compareAt > currentPrice;
      const stock = getOptionStock(product, "stitched", sz);
      const inStock = stock > 0;
      const mpn = isRealId(dbVar?.sku)
        ? dbVar!.sku!
        : isRealId(product.mpn)
          ? product.mpn
          : undefined;

      items.push({
        id: `${product.slug}-stitched-${sz.toLowerCase()}`,
        itemGroupId,
        title: `${baseTitle} — Stitched Size ${sz} (${product.fabric})`,
        description,
        link,
        imageLink,
        additionalImageLinks,
        availability: inStock ? "in_stock" : "out_of_stock",
        metaAvailability: inStock ? "in stock" : "out of stock",
        regularPrice: hasSale ? compareAt! : currentPrice,
        ...(hasSale ? { salePrice: currentPrice } : {}),
        brand: SITE_NAME,
        ...(isRealId(product.gtin) ? { gtin: product.gtin } : {}),
        ...(mpn ? { mpn } : {}),
        condition: "new",
        googleProductCategory,
        productType,
        color: product.colour,
        material: product.fabric,
        size: sz,
        stitching: "stitched",
      });
    }
  }

  return items;
}

export function buildMerchantFeedXml({
  products,
  categories,
  target = "google",
}: {
  products: Product[];
  categories: Category[];
  target?: "google" | "meta";
}): string {
  const feedItems = products.flatMap((p) => expandProductForFeed(p, categories));

  const itemXmlBlocks = feedItems.map((item) => {
    const effectivePrice = item.salePrice ?? item.regularPrice;
    const shippingRate =
      effectivePrice >= SHIPPING_POLICY.freeShippingThresholdLkr
        ? 0
        : SHIPPING_POLICY.firstPieceRateLkr;

    const handling =
      item.stitching === "stitched"
        ? SHIPPING_POLICY.stitchedHandlingDays
        : SHIPPING_POLICY.unstitchedHandlingDays;

    const hasIdentifiers = Boolean(item.gtin || item.mpn);
    const availabilityValue =
      target === "meta" ? item.metaAvailability : item.availability;

    const additionalImgsXml = item.additionalImageLinks
      .map(
        (img) =>
          `      <g:additional_image_link>${escapeXml(img)}</g:additional_image_link>`,
      )
      .join("\n");

    return `    <item>
      <g:id>${escapeXml(item.id)}</g:id>
      <g:item_group_id>${escapeXml(item.itemGroupId)}</g:item_group_id>
      <title>${escapeXml(item.title)}</title>
      <description>${escapeXml(item.description)}</description>
      <link>${escapeXml(item.link)}</link>
      <g:image_link>${escapeXml(item.imageLink)}</g:image_link>
${additionalImgsXml ? `${additionalImgsXml}\n` : ""}      <g:availability>${escapeXml(availabilityValue)}</g:availability>
      <g:price>${item.regularPrice.toFixed(2)} ${CURRENCY}</g:price>
${
  item.salePrice != null
    ? `      <g:sale_price>${item.salePrice.toFixed(2)} ${CURRENCY}</g:sale_price>\n`
    : ""
}      <g:brand>${escapeXml(item.brand)}</g:brand>
${item.gtin ? `      <g:gtin>${escapeXml(item.gtin)}</g:gtin>\n` : ""}${
      item.mpn ? `      <g:mpn>${escapeXml(item.mpn)}</g:mpn>\n` : ""
    }${
      !hasIdentifiers
        ? `      <g:identifier_exists>no</g:identifier_exists>\n`
        : ""
    }      <g:condition>${item.condition}</g:condition>
      <g:google_product_category>${escapeXml(item.googleProductCategory)}</g:google_product_category>
      <g:product_type>${escapeXml(item.productType)}</g:product_type>
      <g:color>${escapeXml(item.color)}</g:color>
      <g:material>${escapeXml(item.material)}</g:material>
${item.size ? `      <g:size>${escapeXml(item.size)}</g:size>\n` : ""}      <g:gender>female</g:gender>
      <g:age_group>adult</g:age_group>
      <g:shipping>
        <g:country>${COUNTRY}</g:country>
        <g:service>${escapeXml(SHIPPING_POLICY.label)}</g:service>
        <g:price>${shippingRate.toFixed(2)} ${CURRENCY}</g:price>
        <g:min_handling_time>${handling.min}</g:min_handling_time>
        <g:max_handling_time>${handling.max}</g:max_handling_time>
        <g:min_transit_time>${SHIPPING_POLICY.transitDays.min}</g:min_transit_time>
        <g:max_transit_time>${SHIPPING_POLICY.transitDays.max}</g:max_transit_time>
      </g:shipping>
    </item>`;
  });

  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:g="http://base.google.com/ns/1.0">
  <channel>
    <title>${escapeXml(`${SITE_NAME} — Product Feed (${target.toUpperCase()})`)}</title>
    <link>${escapeXml(SITE_URL)}</link>
    <description>${escapeXml(SITE_DESCRIPTION_DEFAULT)}</description>
${itemXmlBlocks.join("\n")}
  </channel>
</rss>`;
}

