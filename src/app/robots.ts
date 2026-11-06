import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/seo/config";

const PUBLIC_ALLOW = [
  "/",
  "/api/public/",
  "/llms.txt",
  "/llms-full.txt",
  "/products.xml",
  "/google-merchant-products.xml",
  "/meta-catalog.xml",
  "/openapi.json",
];

const PRIVATE_DISALLOW = [
  "/admin",
  "/admin/",
  "/admin-preview",
  "/account",
  "/account/",
  "/account-preview",
  "/checkout",
  "/cart",
  "/auth",
  "/auth/",
  "/login",
  "/signup",
  "/register",
  "/forgot-password",
  "/reset-password",
  "/order-confirmed",
  "/track-order",
  "/api/",
  "/*?*sort=",
  "/*?*priceBand=",
  "/*?*inStockOnly=",
  "/*?*page=",
];

const SEARCH_ENGINE_BOTS = [
  "Googlebot",
  "Googlebot-Image",
  "Bingbot",
  "Slurp",
  "DuckDuckBot",
  "Applebot",
  "YandexBot",
];

const AI_LLM_BOTS = [
  "GPTBot",
  "OAI-SearchBot",
  "ChatGPT-User",
  "ClaudeBot",
  "Claude-Web",
  "anthropic-ai",
  "PerplexityBot",
  "Google-Extended",
  "Applebot-Extended",
  "Meta-ExternalAgent",
  "Amazonbot",
  "CCBot",
];

const SOCIAL_PREVIEW_BOTS = [
  "facebookexternalhit",
  "Twitterbot",
  "LinkedInBot",
  "WhatsApp",
  "Slackbot",
  "TelegramBot",
  "Discordbot",
];

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: PUBLIC_ALLOW,
        disallow: PRIVATE_DISALLOW,
      },
      {
        userAgent: SEARCH_ENGINE_BOTS,
        allow: PUBLIC_ALLOW,
        disallow: PRIVATE_DISALLOW,
      },
      {
        userAgent: AI_LLM_BOTS,
        allow: PUBLIC_ALLOW,
        disallow: PRIVATE_DISALLOW,
      },
      {
        userAgent: SOCIAL_PREVIEW_BOTS,
        allow: ["/", "/product/", "/shop/", "/brand/", "/api/public/"],
        disallow: ["/admin", "/account", "/checkout", "/order-confirmed", "/track-order"],
      },
    ],
    host: SITE_URL,
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
