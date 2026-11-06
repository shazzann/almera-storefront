import { NextResponse, type NextRequest } from "next/server";
import { nameWithColour, startingPrice } from "@/lib/catalog";
import { getProductBySlug } from "@/lib/catalog.server";
import { CURRENCY, RETURN_POLICY, SHIPPING_POLICY, SITE_NAME, SITE_URL } from "@/lib/seo/config";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  const p = await getProductBySlug(slug.toLowerCase());

  if (!p) {
    return NextResponse.json(
      {
        error: "Product not found",
        status: 404,
        slug,
        docs: `${SITE_URL}/openapi.json`,
      },
      { status: 404, headers: { "X-Robots-Tag": "noindex" } },
    );
  }

  return NextResponse.json(
    {
      slug: p.slug,
      name: nameWithColour(p),
      url: `${SITE_URL}/product/${p.slug}`,
      brand: SITE_NAME,
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
      unstitchedStock: p.unstitchedStock ?? null,
      sizeStock: p.sizeStock ?? null,
      sizes: p.sizes ?? [],
      pieces: p.pieces,
      care: p.care ?? null,
      images: p.images,
      description: p.description,
      shippingPolicy: SHIPPING_POLICY,
      returnPolicy: RETURN_POLICY,
      updatedAt: p.updatedAt ?? null,
    },
    {
      status: 200,
      headers: {
        "Cache-Control": "public, s-maxage=300, stale-while-revalidate=3600",
      },
    },
  );
}

