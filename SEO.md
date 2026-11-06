# Technical SEO Architecture (`SEO.md`)

This document describes the production technical SEO, structured data, crawl/index control, shopping feeds, and AI/agent (GEO) architecture for **almera** (`https://almera.lk`).

---

## 1. File Map & Responsibilities

| Area | Path | Purpose |
|------|------|---------|
| **SEO Config** | `src/lib/seo/config.ts` | Single source of truth for `SITE_URL`, `SITE_NAME`, `LEGAL_NAME`, `DEFAULT_LOCALE`, `HTML_LANG`, `CURRENCY`, `COUNTRY`, contact details, `DEFAULT_OG_IMAGE`, `STATIC_BUILD_DATE`, `SHIPPING_POLICY` (imported from `src/lib/catalog.ts` & `src/lib/cod-deposit.ts`), and `RETURN_POLICY`. |
| **Metadata Helpers** | `src/lib/seo/metadata.ts` | `buildMetadata`, `buildProductMetadata`, `buildCategoryMetadata`, `buildCanonicalUrl`, and `truncateMetaDescription` (Markdown/HTML stripped, ~155 chars at word boundary). |
| **JSON-LD Builders** | `src/lib/seo/schema.ts` | `buildSiteGraphSchema` (`Organization` + `WebSite` `@graph`), `buildHomeStoreSchema` (`ClothingStore`), `buildProductSchema` (`ProductGroup` & `Product`), `buildBundleSchema`, `buildOfferSchema`, `buildCollectionPageSchema`, `buildItemListSchema`, `buildBreadcrumbSchema`, `buildFaqSchema`, and `serializeJsonLd` (`\u003c` XSS escaping). |
| **JSON-LD Component** | `src/components/seo/json-ld.tsx` | Server component `<JsonLd data={...} />` rendering `<script type="application/ld+json">`. |
| **Breadcrumbs UI** | `src/components/seo/breadcrumbs.tsx` | Accessible `<nav aria-label="Breadcrumb"><ol>...</ol></nav>` matching `BreadcrumbList` JSON-LD on every public page. |
| **PLP SEO & FAQ Copy** | `src/lib/seo/faq-content.ts`<br>`src/components/seo/category-seo-section.tsx` | Category-specific editorial intros, internal category/brand links, and visible FAQ accordions paired with `FAQPage` JSON-LD. |
| **Redirects & GEO** | `src/lib/seo/redirects.ts`<br>`src/proxy.ts`<br>`next.config.ts` | `www.` → apex 301 redirect, lowercase path normalization, duplicate slash stripping, legacy path/slug 301 redirects, `X-Robots-Tag: noindex, follow` on private/filter routes, `Vary: Accept`, and `Accept: text/markdown` content negotiation. |
| **Sitemap & Robots** | `src/app/sitemap.ts`<br>`src/app/sitemap/[id]/route.ts`<br>`src/app/robots.ts` | Dynamic XML sitemap with real `updated_at`, full product gallery images, 45k-URL split sitemap support (`/sitemap/index.xml`, `/sitemap/products.xml`), and granular `robots.txt` rules for search engines, AI/LLM bots, and social preview bots. |
| **Merchant Feeds** | `src/lib/seo/feeds.ts`<br>`src/app/products.xml/route.ts`<br>`src/app/google-merchant-products.xml/route.ts`<br>`src/app/meta-catalog.xml/route.ts` | Google Merchant Center & Meta Catalog RSS 2.0 XML feeds (`xmlns:g`) with variant expansion (`g:item_group_id`), `g:sale_price`, shipping/handling times, and `503` error handling. |
| **AI / Agent GEO** | `public/llms.txt`<br>`public/llms-full.txt`<br>`src/lib/seo/markdown.ts`<br>`src/app/api/md/[...path]/route.ts`<br>`src/app/openapi.json/route.ts`<br>`src/app/api/public/**` | LLM discovery files, token-efficient Markdown content negotiation (`Accept: text/markdown`), OpenAPI 3.1.0 spec (`/openapi.json`), and read-only JSON APIs. |
| **Dynamic OG Images** | `src/lib/seo/og-helper.ts`<br>`src/app/opengraph-image.tsx`<br>`src/app/shop/[category]/opengraph-image.tsx`<br>`src/app/product/[slug]/opengraph-image.tsx` | Dynamic 1200×630 `ImageResponse` OpenGraph cards for root, categories, and PDPs (with WebP-to-JPEG conversion via `sharp`). |
| **Schema Unit Tests** | `src/lib/seo/__tests__/schema.test.ts`<br>`src/lib/seo/__tests__/product-schema.snapshot.json` | Zod validation against Google Rich Results requirements + deterministic PDP JSON-LD snapshot (`npm test`). |

---

## 2. How to Extend for New Page Types

### A. Adding a New Public Content or Landing Page
1. Export `metadata` (or `generateMetadata`) using `buildMetadata` from `src/lib/seo/metadata.ts`:
   ```ts
   import { buildMetadata } from "@/lib/seo/metadata";

   export const metadata = buildMetadata({
     title: "Festive Eid Edit in Sri Lanka",
     description: "Explore our curated Eid lawn and occasion wear collection...",
     path: "/eid-edit",
   });
   ```
2. Render `<Breadcrumbs items={...} />` and `<JsonLd data={buildBreadcrumbSchema(items)} />` at the top of the page.
3. Ensure the page has **exactly one `<h1>`** and uses `<h2>`/`<h3>` for subsections.
4. If the page includes a visible FAQ section, pass the same Q&A array to `<JsonLd data={buildFaqSchema(faqs)} />`.
5. Add the static path to `STATIC_ROUTES` in `src/app/sitemap.ts` and `supportsMarkdownNegotiation` in `src/lib/seo/redirects.ts` (plus a renderer in `src/lib/seo/markdown.ts`).

### B. Adding a New Collection / Bundle Page
1. Fetch the bundle and included products using a function wrapped with React `cache()` and `"use cache"` in `src/lib/catalog.server.ts`.
2. Call `notFound()` if the slug does not exist so Next.js returns a real HTTP `404`.
3. Render `<JsonLd data={buildBundleSchema({ ... })} />` alongside `<JsonLd data={buildBreadcrumbSchema(...)} />`.

### C. Adding a New Private / Authenticated Route
1. Export `metadata = buildMetadata({ title: "...", path: "/...", noindex: true })`.
2. Ensure its path prefix is listed in `NOINDEX_PATH_PREFIXES` in `src/lib/seo/redirects.ts` and `PRIVATE_DISALLOW` in `src/app/robots.ts` so both `X-Robots-Tag: noindex, follow` and `robots.txt` cover it automatically.

### D. Renaming a Product or Category Slug
Add the old slug to `LEGACY_PRODUCT_SLUGS` or `LEGACY_CATEGORY_SLUGS` in `src/lib/seo/redirects.ts` to issue an automatic `301` permanent redirect to the new canonical URL.

