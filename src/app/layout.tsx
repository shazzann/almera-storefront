import type { Metadata, Viewport } from "next";
import { Bodoni_Moda, Hanken_Grotesk } from "next/font/google";
import { CartDrawer } from "@/components/cart-drawer";
import { Footer } from "@/components/footer";
import { Header } from "@/components/header";
import { getAllCategories } from "@/lib/catalog.server";
import "./globals.css";

const bodoni = Bodoni_Moda({
  variable: "--font-bodoni",
  subsets: ["latin"],
  axes: ["opsz"],
  style: ["normal", "italic"],
});

const hanken = Hanken_Grotesk({
  variable: "--font-hanken",
  subsets: ["latin"],
});

const SITE_URL = "https://almera.lk";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default:
      "almera · The Desi Wardrobe | Pakistani lawn, shalwar kameez & lehengas in Sri Lanka",
    template: "%s · almera",
  },
  description:
    "Shop Pakistani lawn suits, ready-to-wear shalwar kameez and bridal lehengas online in Sri Lanka. Stitched or unstitched, with island-wide delivery and cash on delivery.",
  keywords: [
    "Pakistani lawn Sri Lanka",
    "lawn suits Colombo",
    "shalwar kameez Sri Lanka",
    "lehenga Sri Lanka",
    "unstitched suits",
    "desi wear Sri Lanka",
  ],
  openGraph: {
    type: "website",
    siteName: "almera",
    locale: "en_LK",
    images: [
      {
        url: "/brand/almera-logo.jpg",
        width: 1078,
        height: 1078,
        alt: "almera, the desi wardrobe",
      },
    ],
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
  return (
    <html lang="en-LK" className={`${bodoni.variable} ${hanken.variable} antialiased`}>
      <body className="flex min-h-dvh flex-col">
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
        <Footer categoryList={categoryList} />
        <CartDrawer />
      </body>
    </html>
  );
}
