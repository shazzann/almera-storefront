import { NextResponse } from "next/server";
import { getAllCategories } from "@/lib/catalog.server";
import { SITE_URL } from "@/lib/seo/config";

export async function GET() {
  const categories = await getAllCategories();

  return NextResponse.json(
    {
      count: categories.length,
      categories: categories.map((c) => ({
        slug: c.slug,
        name: c.name,
        url: `${SITE_URL}/shop/${c.slug}`,
        description: c.blurb,
        subcategories: c.subcategories ?? [],
        group: c.group ?? null,
        image: c.image,
      })),
    },
    {
      status: 200,
      headers: {
        "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400",
      },
    },
  );
}

