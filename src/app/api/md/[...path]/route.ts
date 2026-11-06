import { NextResponse, type NextRequest } from "next/server";
import { getCategory } from "@/lib/catalog";
import {
  getAllCategories,
  getAllProducts,
  getProductBySlug,
} from "@/lib/catalog.server";
import {
  renderAboutMarkdown,
  renderCategoryMarkdown,
  renderContactMarkdown,
  renderHelpMarkdown,
  renderHomeMarkdown,
  renderNotFoundMarkdown,
  renderProductMarkdown,
} from "@/lib/seo/markdown";

const MD_HEADERS = {
  "Content-Type": "text/markdown; charset=utf-8",
  Vary: "Accept",
  "Cache-Control": "public, s-maxage=300, stale-while-revalidate=3600",
};

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> },
) {
  const segments = (await params).path ?? [];
  const joined = segments.join("/").toLowerCase();

  // 1. Home
  if (segments.length === 0 || joined === "home") {
    const [products, categories] = await Promise.all([
      getAllProducts(),
      getAllCategories(),
    ]);
    return new NextResponse(renderHomeMarkdown(products, categories), {
      status: 200,
      headers: MD_HEADERS,
    });
  }

  // 2. Shop All (/shop)
  if (joined === "shop") {
    const [products, allCategories] = await Promise.all([
      getAllProducts(),
      getAllCategories(),
    ]);
    return new NextResponse(
      renderCategoryMarkdown({ products, allCategories }),
      { status: 200, headers: MD_HEADERS },
    );
  }

  // 3. Category (/shop/[category] or /category/[category])
  if (
    (segments[0] === "shop" || segments[0] === "category") &&
    segments.length === 2
  ) {
    const catSlug = segments[1].toLowerCase();
    const [products, allCategories] = await Promise.all([
      getAllProducts(),
      getAllCategories(),
    ]);
    const category =
      allCategories.find((c) => c.slug === catSlug) ?? getCategory(catSlug);
    if (!category) {
      return new NextResponse(renderNotFoundMarkdown(`/${joined}`), {
        status: 404,
        headers: { ...MD_HEADERS, "X-Robots-Tag": "noindex" },
      });
    }
    return new NextResponse(
      renderCategoryMarkdown({ category, products, allCategories }),
      { status: 200, headers: MD_HEADERS },
    );
  }

  // 4. Brand (/brand/[slug])
  if (segments[0] === "brand" && segments.length === 2) {
    const brandSlug = segments[1].toLowerCase();
    if (brandSlug !== "almera") {
      return new NextResponse(renderNotFoundMarkdown(`/${joined}`), {
        status: 404,
        headers: { ...MD_HEADERS, "X-Robots-Tag": "noindex" },
      });
    }
    const [products, allCategories] = await Promise.all([
      getAllProducts(),
      getAllCategories(),
    ]);
    return new NextResponse(
      renderCategoryMarkdown({ products, allCategories }),
      { status: 200, headers: MD_HEADERS },
    );
  }

  // 5. Product Detail (/product/[slug])
  if (segments[0] === "product" && segments.length === 2) {
    const slug = segments[1].toLowerCase();
    const [product, allProducts, categories] = await Promise.all([
      getProductBySlug(slug),
      getAllProducts(),
      getAllCategories(),
    ]);
    if (!product) {
      return new NextResponse(renderNotFoundMarkdown(`/product/${slug}`), {
        status: 404,
        headers: { ...MD_HEADERS, "X-Robots-Tag": "noindex" },
      });
    }
    return new NextResponse(
      renderProductMarkdown(product, allProducts, categories),
      { status: 200, headers: MD_HEADERS },
    );
  }

  // 6. Static Policy & Story pages
  if (joined === "about") {
    return new NextResponse(renderAboutMarkdown(), {
      status: 200,
      headers: MD_HEADERS,
    });
  }
  if (joined === "help") {
    return new NextResponse(renderHelpMarkdown(), {
      status: 200,
      headers: MD_HEADERS,
    });
  }
  if (joined === "contact") {
    return new NextResponse(renderContactMarkdown(), {
      status: 200,
      headers: MD_HEADERS,
    });
  }

  return new NextResponse(renderNotFoundMarkdown(`/${joined}`), {
    status: 404,
    headers: { ...MD_HEADERS, "X-Robots-Tag": "noindex" },
  });
}

