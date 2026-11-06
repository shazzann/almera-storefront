import type { Metadata, Viewport } from "next";
import { Bodoni_Moda, Hanken_Grotesk } from "next/font/google";
import { Footer } from "@/components/footer";
import { Header } from "@/components/header";
import { LazyCartDrawer } from "@/components/lazy-cart-drawer";
import { AnalyticsScripts } from "@/components/seo/analytics-scripts";
import { JsonLd } from "@/components/seo/json-ld";
import { StoreOnly } from "@/components/store-only";
import { getAllCategories } from "@/lib/catalog.server";
import { getCdnHost } from "@/lib/image-url";
import {
  DEFAULT_LOCALE,
  DEFAULT_OG_IMAGE,
  HTML_LANG,
  SITE_DESCRIPTION_DEFAULT,
  SITE_NAME,
  SITE_TITLE_DEFAULT,
  SITE_URL,
} from "@/lib/seo/config";
import { buildSiteGraphSchema } from "@/lib/seo/schema";
import "./globals.css";

const bodoni = Bodoni_Moda({
  variable: "--font-bodoni",
  subsets: ["latin"],
  axes: ["opsz"],
  style: ["normal", "italic"],
  display: "swap",
});

const hanken = Hanken_Grotesk({
  variable: "--font-hanken",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: SITE_TITLE_DEFAULT,
    template: `%s | ${SITE_NAME}`,
  },
  description: SITE_DESCRIPTION_DEFAULT,
  applicationName: SITE_NAME,
  authors: [{ name: SITE_NAME, url: SITE_URL }],
  creator: SITE_NAME,
  publisher: SITE_NAME,
  keywords: [
    "Pakistani lawn Sri Lanka",
    "lawn suits Colombo",
    "shalwar kameez Sri Lanka",
    "lehenga Sri Lanka",
    "unstitched suits Sri Lanka",
    "desi wear Sri Lanka",
    "almera",
  ],
  formatDetection: {
    telephone: false,
    email: false,
    address: false,
  },
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/icon.svg", type: "image/svg+xml" },
    ],
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
  },
  manifest: "/manifest.webmanifest",
  alternates: {
    types: {
      "application/openapi+json": `${SITE_URL}/openapi.json`,
      "application/rss+xml": `${SITE_URL}/products.xml`,
    },
  },
  openGraph: {
    type: "website",
    siteName: SITE_NAME,
    locale: DEFAULT_LOCALE,
    url: SITE_URL,
    title: SITE_TITLE_DEFAULT,
    description: SITE_DESCRIPTION_DEFAULT,
    images: [
      {
        url: DEFAULT_OG_IMAGE.url,
        width: DEFAULT_OG_IMAGE.width,
        height: DEFAULT_OG_IMAGE.height,
        alt: DEFAULT_OG_IMAGE.alt,
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: SITE_TITLE_DEFAULT,
    description: SITE_DESCRIPTION_DEFAULT,
    images: [DEFAULT_OG_IMAGE.url],
  },
};

export const viewport: Viewport = {
  themeColor: "#eef1e9",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const categoryList = await getAllCategories();
  const cdnOrigin = getCdnHost();
  const siteGraph = buildSiteGraphSchema();

  return (
    <html lang={HTML_LANG} className={`${bodoni.variable} ${hanken.variable} antialiased`}>
      <head>
        <link rel="preconnect" href={cdnOrigin} crossOrigin="anonymous" />
        <link rel="dns-prefetch" href={cdnOrigin} />
        <link
          rel="alternate"
          type="application/openapi+json"
          href={`${SITE_URL}/openapi.json`}
          title={`${SITE_NAME} Public Catalog OpenAPI 3.1 Spec`}
        />
      </head>
      <body className="flex min-h-dvh flex-col">
        <JsonLd data={siteGraph} />
        <a
          href="#main"
          className="sr-only z-[70] rounded-full bg-ink px-4 py-2 text-ivory focus:not-sr-only focus:fixed focus:top-3 focus:left-3"
        >
          Skip to content
        </a>
        <Header categoryList={categoryList} />
        <main id="main" className="flex-1">
          {children}
        </main>
        <StoreOnly hideOnAccount>
          <Footer categoryList={categoryList} />
        </StoreOnly>
        <StoreOnly>
          <LazyCartDrawer />
        </StoreOnly>
        <AnalyticsScripts />
      </body>
    </html>
  );
}
