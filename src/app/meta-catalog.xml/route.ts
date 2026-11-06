import { NextResponse } from "next/server";
import { getSitemapCatalogData } from "@/lib/catalog.server";
import { buildMerchantFeedXml } from "@/lib/seo/feeds";

export async function GET() {
  try {
    const { products, categories } = await getSitemapCatalogData();
    const xml = buildMerchantFeedXml({ products, categories, target: "meta" });

    return new NextResponse(xml, {
      status: 200,
      headers: {
        "Content-Type": "application/xml; charset=utf-8",
        "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400",
      },
    });
  } catch (err) {
    return new NextResponse(
      `<?xml version="1.0" encoding="UTF-8"?><error>${
        err instanceof Error ? err.message.replace(/[<>&]/g, "") : "Service Unavailable"
      }</error>`,
      {
        status: 503,
        headers: {
          "Content-Type": "application/xml; charset=utf-8",
          "Cache-Control": "no-store",
        },
      },
    );
  }
}

