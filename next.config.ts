import type { NextConfig } from "next";

const rawSiteUrl =
  process.env.NEXT_PUBLIC_SITE_URL || process.env.SITE_URL || "https://almera.lk";
const siteHost = (() => {
  try {
    return new URL(rawSiteUrl).hostname.replace(/^www\./i, "");
  } catch {
    return "almera.lk";
  }
})();
const canonicalOrigin = `https://${siteHost}`;

const supabaseHost = process.env.NEXT_PUBLIC_SUPABASE_URL
  ? new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).hostname
  : null;

const cdnUrl =
  process.env.NEXT_PUBLIC_CDN_URL ||
  process.env.NEXT_PUBLIC_STORAGE_CDN_URL ||
  process.env.STORAGE_CDN_URL ||
  process.env.NEXT_PUBLIC_SUPABASE_CDN_URL ||
  "https://cdn.almera.lk";

const cdnHost = cdnUrl ? new URL(cdnUrl).hostname : "cdn.almera.lk";

const cspReportOnly = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://www.googletagmanager.com https://connect.facebook.net",
  "style-src 'self' 'unsafe-inline'",
  `img-src 'self' data: blob: https://${cdnHost} https://images.unsplash.com https://*.supabase.co`,
  "font-src 'self' data:",
  `connect-src 'self' https://${cdnHost} https://*.supabase.co https://www.google-analytics.com https://region1.google-analytics.com`,
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "object-src 'none'",
].join("; ");

const securityHeaders = [
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    value: "geolocation=(), microphone=(), camera=(), browsing-topics=(), payment=(self)",
  },
  {
    key: "Content-Security-Policy",
    value: "frame-ancestors 'none'; base-uri 'self'; object-src 'none'",
  },
  {
    key: "Content-Security-Policy-Report-Only",
    value: cspReportOnly,
  },
];

const remotePatterns: NonNullable<NonNullable<NextConfig["images"]>["remotePatterns"]> = [
  { protocol: "https", hostname: cdnHost, pathname: "/**" },
  { protocol: "https", hostname: "images.unsplash.com", pathname: "/**" },
];

if (supabaseHost && supabaseHost !== cdnHost) {
  remotePatterns.push({
    protocol: "https",
    hostname: supabaseHost,
    pathname: "/storage/v1/object/public/**",
  });
}

const nextConfig: NextConfig = {
  cacheComponents: true,
  trailingSlash: false,
  poweredByHeader: false,
  experimental: {
    serverActions: {
      bodySizeLimit: "20mb",
    },
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: securityHeaders,
      },
      {
        source: "/_next/static/:path*",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=31536000, immutable",
          },
        ],
      },
      {
        source: "/brand/:path*\\.(jpg|jpeg|png|webp|svg|ico)",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=31536000, immutable",
          },
        ],
      },
      {
        source: "/(shop|product|brand|about|help|contact)/:path*",
        headers: [
          {
            key: "Vary",
            value: "Accept",
          },
        ],
      },
      {
        source: "/",
        headers: [
          {
            key: "Vary",
            value: "Accept",
          },
        ],
      },
      {
        source:
          "/(checkout|cart|order-confirmed|track-order|account|account-preview|admin|admin-preview|auth)/:path*",
        headers: [
          {
            key: "X-Robots-Tag",
            value: "noindex, follow",
          },
        ],
      },
    ];
  },
  async redirects() {
    return [
      {
        source: "/:path*",
        has: [{ type: "host", value: `www.${siteHost}` }],
        destination: `${canonicalOrigin}/:path*`,
        statusCode: 301,
      },
      {
        source: "/products",
        destination: "/shop",
        statusCode: 301,
      },
      {
        source: "/products/:slug",
        destination: "/product/:slug",
        statusCode: 301,
      },
      {
        source: "/collections",
        destination: "/shop",
        statusCode: 301,
      },
      {
        source: "/collections/:category",
        destination: "/shop/:category",
        statusCode: 301,
      },
      {
        source: "/category/:slug",
        destination: "/shop/:slug",
        statusCode: 301,
      },
      {
        source: "/categories/:slug",
        destination: "/shop/:slug",
        statusCode: 301,
      },
      {
        source: "/faq",
        destination: "/help#faq",
        statusCode: 301,
      },
      {
        source: "/shipping",
        destination: "/help#delivery",
        statusCode: 301,
      },
      {
        source: "/returns",
        destination: "/help#policy",
        statusCode: 301,
      },
      {
        source: "/size-guide",
        destination: "/help#sizing",
        statusCode: 301,
      },
      {
        source: "/login",
        destination: "/account/login",
        statusCode: 301,
      },
      {
        source: "/register",
        destination: "/account/signup",
        statusCode: 301,
      },
      {
        source: "/signup",
        destination: "/account/signup",
        statusCode: 301,
      },
      {
        source: "/forgot-password",
        destination: "/account/forgot-password",
        statusCode: 301,
      },
      {
        source: "/reset-password",
        destination: "/account/reset-password",
        statusCode: 301,
      },
    ];
  },
  partialPrefetching: true,
  images: {
    remotePatterns,
    // A short list of widths keeps each photo to a handful of resized copies.
    deviceSizes: [640, 960, 1200],
    imageSizes: [96, 160, 320],
    // Uploaded photos get a new name each time, so a resized copy never goes out of date.
    minimumCacheTTL: 2678400,
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
