import { NextResponse, type NextRequest } from "next/server";
import { inCategory, nameWithColour, startingPrice, type CategorySlug } from "@/lib/catalog";
import { getAllProducts } from "@/lib/catalog.server";
import { CURRENCY, SITE_NAME, SITE_URL } from "@/lib/seo/config";

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const category = searchParams.get("category")?.toLowerCase() as CategorySlug | null;
  const q = searchParams.get("q")?.trim().toLowerCase() || "";
  const inStockOnly = searchParams.get("in_stock") === "true";

  const all = await getAllProducts();
  const filtered = all.filter((p) => {
    if (category && !inCategory(p, category)) return false;
    if (inStockOnly && p.stock <= 0) return false;
    if (q) {
      const hay = `${p.name} ${p.colour} ${p.fabric} ${p.subcategory ?? ""} ${p.description}`.toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  });

  return NextResponse.json(
    {
      brand: SITE_NAME,
      currency: CURRENCY,
      count: filtered.length,
      products: filtered.map((p) => ({
        slug: p.slug,
        name: nameWithColour(p),
        url: `${SITE_URL}/product/${p.slug}`,
        categories: p.categories,
        subcategory: p.subcategory ?? null,
        colour: p.colour,
        fabric: p.fabric,
        price: p.price,
        wasPrice: p.wasPrice ?? null,
        startingPrice: startingPrice(p),
        currency: CURRENCY,
        inStock: p.stock > 0,
        stock: p.stock,
        sizes: p.sizes ?? [],
        pieces: p.pieces,
        images: p.images,
        description: p.description,
        updatedAt: p.updatedAt ?? null,
      })),
    },
    {
      status: 200,
      headers: {
        "Cache-Control": "public, s-maxage=300, stale-while-revalidate=3600",
      },
    },
  );
}

