import {
  DELIVERY,
  FREE_DELIVERY_FROM,
  SIZES,
  STITCHING_FEE,
  colourOptions,
  formatLKR,
  getCategory,
  getOptionStock,
  inCategory,
  nameWithColour,
  startingPrice,
  stitchingOptions,
  type Category,
  type Product,
} from "@/lib/catalog";
import { COD_DEPOSIT_THRESHOLD, COD_MIN_DEPOSIT } from "@/lib/cod-deposit";
import {
  COUNTRY_NAME,
  CURRENCY,
  INSTAGRAM_URL,
  LEGAL_NAME,
  RETURN_POLICY,
  SHIPPING_POLICY,
  SITE_DESCRIPTION_DEFAULT,
  SITE_NAME,
  SITE_TITLE_DEFAULT,
  SITE_URL,
  SUPPORT_EMAIL,
  SUPPORT_PHONE,
  WHATSAPP_COMMUNITY_URL,
} from "./config";
import { CATEGORY_SEO_CONTENT, HOME_FAQS, STORE_FAQS } from "./faq-content";

export function renderHomeMarkdown(
  products: Product[],
  categories: Category[],
): string {
  const newIn = products.filter((p) => p.tags.includes("new")).slice(0, 8);
  const featured = (newIn.length > 0 ? newIn : products).slice(0, 12);

  return `# ${SITE_TITLE_DEFAULT}

Canonical: ${SITE_URL}

${SITE_DESCRIPTION_DEFAULT}

## Categories (Drawers)
${categories
  .map(
    (c) =>
      `- [${c.name}](${SITE_URL}/shop/${c.slug}): ${c.blurb}${
        c.subcategories?.length ? ` (Subcategories: ${c.subcategories.join(", ")})` : ""
      }`,
  )
  .join("\n")}

## Featured & New Arrivals
${featured
  .map(
    (p) =>
      `- [${nameWithColour(p)}](${SITE_URL}/product/${p.slug}) — **${formatLKR(
        startingPrice(p),
      )}** (${CURRENCY}) | ${p.colour} · ${p.fabric} | ${
        p.stock > 0 ? `In Stock (${p.stock})` : "Out of Stock"
      }`,
  )
  .join("\n")}

## Delivery & Stitching Summary
- **Unstitched 3-Piece**: Ships in 1–2 working days.
- **Custom Stitched (M–XXL)**: Adds ${formatLKR(STITCHING_FEE)}; ready in 5–7 working days.
- **Island-wide Courier (${COUNTRY_NAME})**: ${DELIVERY.standard.eta} — ${formatLKR(
    DELIVERY.standard.firstPiece,
  )} first piece, ${formatLKR(DELIVERY.standard.extraPiece)} each additional piece, **Free over ${formatLKR(
    FREE_DELIVERY_FROM,
  )}**.
- **Return Policy**: ${RETURN_POLICY.summary}

## Frequently Asked Questions
${HOME_FAQS.map((f) => `### ${f.q}\n${f.a}`).join("\n\n")}
`;
}

export function renderCategoryMarkdown({
  category,
  products,
  allCategories,
}: {
  category?: Category;
  products: Product[];
  allCategories: Category[];
}): string {
  const items = category
    ? products.filter((p) => inCategory(p, category.slug))
    : products;
  const copy = CATEGORY_SEO_CONTENT[category?.slug ?? "all"] ?? CATEGORY_SEO_CONTENT.all;
  const canonical = category
    ? `${SITE_URL}/shop/${category.slug}`
    : `${SITE_URL}/shop`;
  const title = category
    ? `${category.name} in ${COUNTRY_NAME} | ${SITE_NAME}`
    : `Shop the Wardrobe | ${SITE_NAME}`;

  return `# ${title}

Canonical: ${canonical}
Total Pieces: ${items.length}

${category ? category.blurb : SITE_DESCRIPTION_DEFAULT}

## ${copy.heading}
${copy.paragraphs.join("\n\n")}

## Products
${
  items.length === 0
    ? "_No pieces currently available in this drawer._"
    : items
        .map((p) => {
          const opts = stitchingOptions(p);
          const priceNote = opts
            .map((o) => `${o}: ${formatLKR(p.price[o] ?? startingPrice(p))}`)
            .join(", ");
          return `- [${nameWithColour(p)}](${SITE_URL}/product/${p.slug}) — **${priceNote}** | ${p.colour} · ${p.fabric}${
            p.subcategory ? ` · ${p.subcategory}` : ""
          } | ${p.stock > 0 ? `In Stock (${p.stock})` : "Sold Out"}`;
        })
        .join("\n")
}

## Frequently Asked Questions
${copy.faqs.map((f) => `### ${f.q}\n${f.a}`).join("\n\n")}

## Other Categories
${allCategories.map((c) => `- [${c.name}](${SITE_URL}/shop/${c.slug})`).join("\n")}
`;
}

export function renderProductMarkdown(
  product: Product,
  allProducts: Product[],
  categories: Category[],
): string {
  const displayName = nameWithColour(product);
  const canonical = `${SITE_URL}/product/${product.slug}`;
  const catSlug = product.categories[0];
  const category =
    categories.find((c) => c.slug === catSlug) ??
    (catSlug ? getCategory(catSlug) : undefined) ?? {
      slug: catSlug ?? "lawns",
      name: catSlug ?? "Shop",
    };

  const options = stitchingOptions(product);
  const sizes = product.sizes && product.sizes.length > 0 ? product.sizes : [...SIZES];
  const colours = colourOptions(product, allProducts);
  const related = allProducts
    .filter(
      (x) =>
        x.categories[0] === product.categories[0] &&
        x.slug !== product.slug &&
        !colours.some((c) => c.slug === x.slug),
    )
    .slice(0, 4);

  const pricingLines: string[] = [];
  if (product.price.unstitched != null) {
    const was = product.wasPrice?.unstitched
      ? ` (was ${formatLKR(product.wasPrice.unstitched)})`
      : "";
    const stock = getOptionStock(product, "unstitched");
    pricingLines.push(
      `- **Unstitched**: ${formatLKR(product.price.unstitched)}${was} — ${
        stock > 0 ? `In Stock (${stock} available)` : "Out of Stock"
      }`,
    );
  }
  if (product.price.stitched != null) {
    const was = product.wasPrice?.stitched
      ? ` (was ${formatLKR(product.wasPrice.stitched)})`
      : "";
    const sizeBreakdown = sizes
      .map((sz) => `${sz}: ${getOptionStock(product, "stitched", sz)}`)
      .join(", ");
    pricingLines.push(
      `- **Stitched**: ${formatLKR(product.price.stitched)}${was} — Sizes (${sizeBreakdown})`,
    );
  }

  return `# ${displayName} Price in ${COUNTRY_NAME} | 100% Original | ${SITE_NAME}

Canonical: ${canonical}
Breadcrumb: Home > Shop > ${category.name}${product.subcategory ? ` > ${product.subcategory}` : ""} > ${displayName}
Brand: ${SITE_NAME}
Category: ${category.name}${product.subcategory ? ` / ${product.subcategory}` : ""}
Colour: ${product.colour}
Fabric: ${product.fabric}
Format: ${options.length === 2 ? "Stitched or Unstitched" : options[0] === "stitched" ? "Ready to Wear" : "Unstitched"}
Overall Availability: ${product.stock > 0 ? `In Stock (${product.stock} total units)` : "Out of Stock"}

## Description
${product.description}

## Pricing & Live Availability (${CURRENCY})
${pricingLines.join("\n")}

## What's Included
${product.pieces.map((piece) => `- ${piece}`).join("\n")}

## Fabric & Care
${product.fabric}. ${
    product.care ??
    "Dry clean for the first wash. After that, hand wash cold, separately, and dry in the shade. Iron on the reverse side."
  }

## Images
${product.images.map((img, i) => `- Photo ${i + 1}: ${img}`).join("\n")}

${
  colours.length > 0
    ? `## Other Colours of This Piece\n${colours
        .map(
          (c) =>
            `- [${c.colour} — ${nameWithColour(c)}](${SITE_URL}/product/${c.slug}) (${
              c.stock > 0 ? "In Stock" : "Sold Out"
            })`,
        )
        .join("\n")}\n`
    : ""
}## Delivery & Order Policy
- **Courier**: ${SHIPPING_POLICY.label} (${SHIPPING_POLICY.etaText}). Stitched orders take 5–7 days before dispatch.
- **Shipping Rate**: ${formatLKR(SHIPPING_POLICY.firstPieceRateLkr)} for the first piece, ${formatLKR(
    SHIPPING_POLICY.extraPieceRateLkr,
  )} per extra piece. Free island-wide delivery on orders over ${formatLKR(
    SHIPPING_POLICY.freeShippingThresholdLkr,
  )}.
- **Order Policy**: ${RETURN_POLICY.summary}

${
  related.length > 0
    ? `## Related Pieces in ${category.name}\n${related
        .map(
          (r) =>
            `- [${nameWithColour(r)}](${SITE_URL}/product/${r.slug}) — ${formatLKR(
              startingPrice(r),
            )}`,
        )
        .join("\n")}\n`
    : ""
}`;
}

export function renderAboutMarkdown(): string {
  return `# Our Story — About ${SITE_NAME}

Canonical: ${SITE_URL}/about

Every beautiful journey begins with a dream. Founded in 2024 in Colombo, Sri Lanka, ${SITE_NAME} (${LEGAL_NAME}) brings together carefully selected Indian and Pakistani dress collections — from breathable everyday cotton, rayon, and muslin suits to semi-rich hakoba ensembles and bridal lehengas for the nikah, mehndi, and walima.

## Our Values
- Passion
- Quality
- Affordability
- A personal connection with every customer

## Shop the Wardrobe
- [Browse All Pieces](${SITE_URL}/shop)
- [Help, Sizing & Delivery](${SITE_URL}/help)
- [Contact Us](${SITE_URL}/contact)
`;
}

export function renderHelpMarkdown(): string {
  return `# Delivery, Size Guide, Payment & Order Policy | ${SITE_NAME}

Canonical: ${SITE_URL}/help

## Delivery Across ${COUNTRY_NAME}
- **Courier**: ${DELIVERY.standard.label} (${DELIVERY.standard.eta} across all 25 districts)
- **Rate**: ${formatLKR(DELIVERY.standard.firstPiece)} for the first piece + ${formatLKR(
    DELIVERY.standard.extraPiece,
  )} for each extra piece
- **Free Delivery**: Orders over ${formatLKR(FREE_DELIVERY_FROM)}
- **Custom Stitching Dispatch**: 5–7 working days before courier dispatch (${formatLKR(
    STITCHING_FEE,
  )} stitching fee)

## Payment Options
- **Cash on Delivery (COD)**: Pay the courier when your parcel arrives. For COD orders above ${formatLKR(
    COD_DEPOSIT_THRESHOLD,
  )}, a minimum ${formatLKR(
    COD_MIN_DEPOSIT,
  )} advance commitment deposit via bank transfer is required to confirm dispatch.
- **Bank Transfer**: Transfer the full order total and share your slip on WhatsApp.
- **Online Card Payment**: Visa & MasterCard via Payments.lk.

## Order Policy
**All sales are final.** We do not offer exchanges, returns, or refunds. Please check the size guide and product details carefully, or message us on Instagram or WhatsApp before ordering.

## Frequently Asked Questions
${STORE_FAQS.map((f) => `### ${f.q}\n${f.a}`).join("\n\n")}
`;
}

export function renderContactMarkdown(): string {
  return `# Contact ${SITE_NAME}

Canonical: ${SITE_URL}/contact

Questions about a colour, your size, or an order? We reply Monday to Saturday, 10:00 AM to 8:00 PM (Sri Lanka Standard Time).

- **Instagram**: [@almera.lk](${INSTAGRAM_URL})
- **WhatsApp Community**: [Join the group](${WHATSAPP_COMMUNITY_URL})
- **Phone / WhatsApp**: ${SUPPORT_PHONE}
- **Email**: ${SUPPORT_EMAIL}
`;
}

export function renderNotFoundMarkdown(requestedPath: string): string {
  return `# 404 — Page Not Found | ${SITE_NAME}

Requested Path: \`${requestedPath}\`

The page or piece you are looking for has moved or sold out.

## Key Links
- [Home](${SITE_URL}/)
- [Shop All New Arrivals](${SITE_URL}/shop)
- [Delivery, Sizing & FAQ](${SITE_URL}/help)
- [Contact Us](${SITE_URL}/contact)
`;
}

