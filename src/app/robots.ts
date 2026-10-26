import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: "*", allow: "/", disallow: ["/checkout", "/order-confirmed"] },
    sitemap: "https://almera.lk/sitemap.xml",
  };
}
