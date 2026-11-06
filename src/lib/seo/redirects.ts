/**
 * Legacy product & category slug mappings for 301 canonical redirects.
 * Add old slugs here when a product or category slug is renamed.
 */
export const LEGACY_PRODUCT_SLUGS: Record<string, string> = {
  "emerald-lawn-suit": "emerald-garden-lawn",
  "plum-jacquard": "plum-jacquard-lawn",
};

export const LEGACY_CATEGORY_SLUGS: Record<string, string> = {
  lawn: "lawns",
  "lawn-suits": "lawns",
  bridal: "occasion",
  lehengas: "occasion",
  "everyday-wear": "day-to-day",
  rtw: "ready-to-wear",
  denim: "western",
};

/**
 * Routes that must never be indexed (`noindex, follow` + `X-Robots-Tag: noindex, follow`).
 */
export const NOINDEX_PATH_PREFIXES = [
  "/checkout",
  "/cart",
  "/order-confirmed",
  "/track-order",
  "/account",
  "/account-preview",
  "/admin",
  "/admin-preview",
  "/auth",
  "/login",
  "/signup",
  "/register",
  "/forgot-password",
  "/reset-password",
] as const;

export function isNoindexPath(pathname: string): boolean {
  const lower = pathname.toLowerCase();
  return NOINDEX_PATH_PREFIXES.some(
    (prefix) => lower === prefix || lower.startsWith(`${prefix}/`),
  );
}

/**
 * Public routes that support `Accept: text/markdown` content negotiation.
 */
export function supportsMarkdownNegotiation(pathname: string): boolean {
  if (
    pathname === "/" ||
    pathname === "/shop" ||
    pathname === "/about" ||
    pathname === "/help" ||
    pathname === "/contact"
  ) {
    return true;
  }
  return (
    pathname.startsWith("/shop/") ||
    pathname.startsWith("/product/") ||
    pathname.startsWith("/brand/") ||
    pathname.startsWith("/category/")
  );
}

/**
 * Parses an HTTP `Accept` header and returns true when the client explicitly
 * requests `text/markdown` (or `text/x-markdown`) with a quality factor >= `text/html`.
 */
export function prefersMarkdown(acceptHeader: string | null): boolean {
  if (!acceptHeader) return false;
  const lower = acceptHeader.toLowerCase();
  if (!lower.includes("text/markdown") && !lower.includes("text/x-markdown")) {
    return false;
  }

  let mdQ = -1;
  let htmlQ = 0;

  for (const part of lower.split(",")) {
    const segments = part.trim().split(";");
    const mime = segments[0]?.trim();
    if (!mime) continue;

    let q = 1.0;
    for (let i = 1; i < segments.length; i++) {
      const m = segments[i]?.trim().match(/^q\s*=\s*([0-9.]+)$/);
      if (m) {
        const parsed = Number.parseFloat(m[1]);
        if (!Number.isNaN(parsed)) q = Math.max(0, Math.min(1, parsed));
      }
    }

    if (mime === "text/markdown" || mime === "text/x-markdown") {
      mdQ = Math.max(mdQ, q);
    } else if (mime === "text/html" || mime === "application/xhtml+xml") {
      htmlQ = Math.max(htmlQ, q);
    }
  }

  return mdQ > 0 && mdQ >= htmlQ;
}

