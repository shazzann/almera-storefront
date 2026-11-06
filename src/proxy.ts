import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { isAdminEmail } from "@/lib/admin-config";
import { categories as defaultCategories } from "@/lib/catalog";
import { SITE_HOST, SITE_URL } from "@/lib/seo/config";
import {
  LEGACY_CATEGORY_SLUGS,
  LEGACY_PRODUCT_SLUGS,
  isNoindexPath,
  prefersMarkdown,
  supportsMarkdownNegotiation,
} from "@/lib/seo/redirects";

let cachedSlugs: {
  products: Set<string>;
  categories: Set<string>;
  expiresAt: number;
} | null = null;

async function getActiveSlugSets(): Promise<{
  products: Set<string>;
  categories: Set<string>;
} | null> {
  const now = Date.now();
  if (cachedSlugs && cachedSlugs.expiresAt > now) {
    return cachedSlugs;
  }

  const supabaseUrl =
    process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  if (!supabaseUrl || !supabaseKey || supabaseUrl.includes("your-project-id")) {
    return null;
  }

  try {
    const headers = {
      apikey: supabaseKey,
      Authorization: `Bearer ${supabaseKey}`,
    };
    const [prodRes, catRes] = await Promise.all([
      fetch(
        `${supabaseUrl}/rest/v1/products?select=slug&is_active=eq.true`,
        { headers, next: { revalidate: 60 } },
      ),
      fetch(
        `${supabaseUrl}/rest/v1/categories?select=slug&is_active=eq.true`,
        { headers, next: { revalidate: 60 } },
      ),
    ]);

    if (!prodRes.ok) return null;
    const prodRows = (await prodRes.json()) as { slug: string }[];
    const catRows = catRes.ok
      ? ((await catRes.json()) as { slug: string }[])
      : [];

    const products = new Set(prodRows.map((r) => r.slug.toLowerCase()));
    const categories = new Set([
      ...defaultCategories.map((c) => c.slug.toLowerCase()),
      ...catRows.map((c) => c.slug.toLowerCase()),
    ]);

    cachedSlugs = {
      products,
      categories,
      expiresAt: now + 60_000,
    };
    return cachedSlugs;
  } catch {
    return null;
  }
}

export async function proxy(request: NextRequest) {
  const hostHeader = request.headers.get("host") || request.nextUrl.host;
  const rawPathname = request.nextUrl.pathname;
  const search = request.nextUrl.search;

  // 1. Canonical www -> apex 301 redirect
  if (/^www\./i.test(hostHeader)) {
    const bareHost = hostHeader.replace(/^www\./i, "");
    const targetOrigin =
      bareHost.startsWith("localhost") || bareHost.startsWith("127.0.0.1")
        ? `http://${bareHost}`
        : bareHost.toLowerCase() === SITE_HOST.toLowerCase()
          ? SITE_URL
          : `https://${bareHost}`;
    return NextResponse.redirect(`${targetOrigin}${rawPathname}${search}`, {
      status: 301,
    });
  }

  // 2. Duplicate slash stripping & lowercase path normalization (301)
  const collapsedPath = rawPathname.replace(/\/{2,}/g, "/");
  const isCaseSensitiveRoute =
    collapsedPath.startsWith("/api/") ||
    collapsedPath.startsWith("/auth/") ||
    collapsedPath.startsWith("/_next/");
  const normalizedPath = isCaseSensitiveRoute
    ? collapsedPath
    : collapsedPath.toLowerCase();

  if (normalizedPath !== rawPathname) {
    const target = new URL(`${normalizedPath}${search}`, request.url);
    return NextResponse.redirect(target, { status: 301 });
  }

  // 3. Legacy product & category slug redirects (301)
  if (normalizedPath.startsWith("/product/")) {
    const slug = normalizedPath.slice("/product/".length).split("/")[0];
    const mapped = slug ? LEGACY_PRODUCT_SLUGS[slug] : undefined;
    if (mapped) {
      return NextResponse.redirect(
        new URL(`/product/${mapped}${search}`, request.url),
        { status: 301 },
      );
    }
  } else if (normalizedPath.startsWith("/shop/")) {
    const catSlug = normalizedPath.slice("/shop/".length).split("/")[0];
    const mapped = catSlug ? LEGACY_CATEGORY_SLUGS[catSlug] : undefined;
    if (mapped) {
      return NextResponse.redirect(
        new URL(`/shop/${mapped}${search}`, request.url),
        { status: 301 },
      );
    }
  }

  // 4. Markdown content negotiation (`Accept: text/markdown` with q >= html q)
  const acceptHeader = request.headers.get("accept");
  if (
    request.method === "GET" &&
    supportsMarkdownNegotiation(normalizedPath) &&
    prefersMarkdown(acceptHeader)
  ) {
    const mdTarget =
      normalizedPath === "/" ? "/api/md/home" : `/api/md${normalizedPath}`;
    const rewriteUrl = new URL(`${mdTarget}${search}`, request.url);
    const response = NextResponse.rewrite(rewriteUrl);
    response.headers.set("Vary", "Accept");
    return response;
  }

  // 5. Real HTTP 404 check for missing products/categories/brands before PPR streaming starts
  const productMatch = normalizedPath.match(/^\/product\/([^/]+)$/);
  const categoryMatch = normalizedPath.match(/^\/shop\/([^/]+)$/);
  const brandMatch = normalizedPath.match(/^\/brand\/([^/]+)$/);

  if (brandMatch && brandMatch[1] !== "almera") {
    const res = NextResponse.rewrite(new URL("/_not-found", request.url), {
      status: 404,
    });
    res.headers.set("X-Robots-Tag", "noindex, follow");
    return res;
  }

  if (productMatch || categoryMatch) {
    const slugSets = await getActiveSlugSets();
    if (slugSets) {
      const missingProduct =
        productMatch && !slugSets.products.has(productMatch[1]);
      const missingCategory =
        categoryMatch && !slugSets.categories.has(categoryMatch[1]);
      if (missingProduct || missingCategory) {
        const res = NextResponse.rewrite(new URL("/_not-found", request.url), {
          status: 404,
        });
        res.headers.set("X-Robots-Tag", "noindex, follow");
        return res;
      }
    }
  }

  // Helper to apply SEO headers (`X-Robots-Tag`, `Vary`) before returning any response
  const applySeoHeaders = (res: NextResponse): NextResponse => {
    const sp = request.nextUrl.searchParams;
    const hasFacetNoindexParam =
      (normalizedPath === "/shop" || normalizedPath.startsWith("/shop/")) &&
      (sp.has("sort") ||
        sp.has("priceBand") ||
        sp.has("inStockOnly") ||
        sp.has("page") ||
        sp.has("q"));

    if (isNoindexPath(normalizedPath) || hasFacetNoindexParam) {
      res.headers.set("X-Robots-Tag", "noindex, follow");
    }

    if (supportsMarkdownNegotiation(normalizedPath)) {
      const existingVary = res.headers.get("Vary");
      if (!existingVary) {
        res.headers.set("Vary", "Accept");
      } else if (!existingVary.toLowerCase().includes("accept")) {
        res.headers.set("Vary", `${existingVary}, Accept`);
      }
    }
    return res;
  };

  let supabaseResponse = NextResponse.next({
    request,
  });

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) return applySeoHeaders(supabaseResponse);

  const isProtectedPath =
    normalizedPath === "/admin" ||
    normalizedPath.startsWith("/admin/") ||
    normalizedPath === "/account" ||
    normalizedPath.startsWith("/account/");

  if (!isProtectedPath) {
    return applySeoHeaders(supabaseResponse);
  }

  const supabase = createServerClient(url, key, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) =>
          request.cookies.set(name, value),
        );
        supabaseResponse = NextResponse.next({
          request,
        });
        cookiesToSet.forEach(({ name, value, options }) =>
          supabaseResponse.cookies.set(name, value, options),
        );
      },
    },
  });

  const path = normalizedPath;

  // Carry over any refreshed session cookies, or the redirect would lose them.
  const redirectTo = (target: string) => {
    const response = NextResponse.redirect(new URL(target, request.url));
    supabaseResponse.cookies
      .getAll()
      .forEach((cookie) => response.cookies.set(cookie));
    return applySeoHeaders(response);
  };

  if (path === "/admin" || path.startsWith("/admin/")) {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      const loginUrl = new URL("/account/login", request.url);
      loginUrl.searchParams.set("next", `${path}${request.nextUrl.search}`);
      return applySeoHeaders(NextResponse.redirect(loginUrl));
    }

    if (!isAdminEmail(user.email)) {
      return applySeoHeaders(NextResponse.redirect(new URL("/", request.url)));
    }
  }

  // Protect customer account routes: /account, /account/orders, /account/profile, etc.
  // Exclude auth pages: /account/login, /account/signup, /account/forgot-password, /account/reset-password
  const isAuthPage =
    path === "/account/login" ||
    path === "/account/signup" ||
    path === "/account/forgot-password" ||
    path === "/account/reset-password";

  if (path === "/account" || path.startsWith("/account/")) {
    if (!isAuthPage) {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        const loginUrl = new URL("/account/login", request.url);
        loginUrl.searchParams.set("next", `${path}${request.nextUrl.search}`);
        return applySeoHeaders(NextResponse.redirect(loginUrl));
      }

      // The admin has no customer dashboard, only the admin console.
      if (isAdminEmail(user.email)) {
        return redirectTo("/admin");
      }
    } else if (path === "/account/login" || path === "/account/signup") {
      // If user is already authenticated and visits login/signup, redirect to their dashboard
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user) {
        return redirectTo(isAdminEmail(user.email) ? "/admin" : "/account");
      }
    }
  }

  return applySeoHeaders(supabaseResponse);
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - static media files
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|avif)$).*)",
  ],
};
