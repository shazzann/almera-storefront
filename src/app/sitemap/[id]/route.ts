import { NextResponse, type NextRequest } from "next/server";
import { getSitemapCatalogData } from "@/lib/catalog.server";
import { SITE_URL, STATIC_BUILD_DATE } from "@/lib/seo/config";

const MAX_URLS_PER_SITEMAP = 45000;

function escapeXml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const rawId = (await params).id.replace(/\.xml$/i, "").toLowerCase();
    const { products, categories } = await getSitemapCatalogData();

    const headers = {
      "Content-Type": "application/xml; charset=utf-8",
      "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400",
    };

    if (rawId === "index") {
      const productChunkCount = Math.max(
        1,
        Math.ceil(products.length / MAX_URLS_PER_SITEMAP),
      );
      const sitemaps = [
        `${SITE_URL}/sitemap/static.xml`,
        `${SITE_URL}/sitemap/categories.xml`,
        ...(productChunkCount === 1
          ? [`${SITE_URL}/sitemap/products.xml`]
          : Array.from(
              { length: productChunkCount },
              (_, i) => `${SITE_URL}/sitemap/products-${i}.xml`,
            )),
      ];

      const xml = `<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${sitemaps
  .map(
    (loc) => `  <sitemap>
    <loc>${escapeXml(loc)}</loc>
    <lastmod>${STATIC_BUILD_DATE}</lastmod>
  </sitemap>`,
  )
  .join("\n")}
</sitemapindex>`;
      return new NextResponse(xml, { status: 200, headers });
    }

    if (rawId === "static") {
      const staticPaths = ["", "/shop", "/brand/almera", "/about", "/help", "/contact"];
      const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${staticPaths
  .map(
    (p) => `  <url>
    <loc>${escapeXml(`${SITE_URL}${p}`)}</loc>
    <lastmod>${STATIC_BUILD_DATE}</lastmod>
  </url>`,
  )
  .join("\n")}
</urlset>`;
      return new NextResponse(xml, { status: 200, headers });
    }

    if (rawId === "categories") {
      const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${categories
  .map(
    (c) => `  <url>
    <loc>${escapeXml(`${SITE_URL}/shop/${c.slug}`)}</loc>
    <lastmod>${escapeXml(c.updatedAt || STATIC_BUILD_DATE)}</lastmod>
  </url>`,
  )
  .join("\n")}
</urlset>`;
      return new NextResponse(xml, { status: 200, headers });
    }

    if (rawId === "products" || rawId.startsWith("products-")) {
      const chunkIdx = rawId.startsWith("products-")
        ? Number.parseInt(rawId.slice("products-".length), 10) || 0
        : 0;
      const start = chunkIdx * MAX_URLS_PER_SITEMAP;
      const slice = products.slice(start, start + MAX_URLS_PER_SITEMAP);

      const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">
${slice
  .map((p) => {
    const imgs = p.images
      .filter(Boolean)
      .map(
        (img) =>
          `    <image:image><image:loc>${escapeXml(
            img.startsWith("http") ? img : `${SITE_URL}${img}`,
          )}</image:loc></image:image>`,
      )
      .join("\n");
    return `  <url>
    <loc>${escapeXml(`${SITE_URL}/product/${p.slug}`)}</loc>
    <lastmod>${escapeXml(p.updatedAt || p.createdAt || STATIC_BUILD_DATE)}</lastmod>
${imgs}
  </url>`;
  })
  .join("\n")}
</urlset>`;
      return new NextResponse(xml, { status: 200, headers });
    }

    return new NextResponse("Not Found", { status: 404 });
  } catch (err) {
    return new NextResponse(
      `Sitemap generation failed: ${err instanceof Error ? err.message : "Unknown error"}`,
      { status: 503 },
    );
  }
}

