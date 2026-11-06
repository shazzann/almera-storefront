import { DELIVERY, FREE_DELIVERY_FROM, STITCHING_FEE } from "@/lib/catalog";
import { COD_DEPOSIT_THRESHOLD, COD_MIN_DEPOSIT } from "@/lib/cod-deposit";

function normalizeSiteUrl(raw?: string): string {
  const fallback = "https://almera.lk";
  if (!raw || !raw.trim()) return fallback;
  try {
    const parsed = new URL(raw.trim());
    if (
      parsed.hostname === "localhost" ||
      parsed.hostname === "127.0.0.1" ||
      parsed.hostname.endsWith(".localhost")
    ) {
      return fallback;
    }
    parsed.protocol = "https:";
    const cleanHost = parsed.hostname.replace(/^www\./i, "");
    return `https://${cleanHost}`;
  } catch {
    return fallback;
  }
}

export const SITE_URL = normalizeSiteUrl(
  process.env.NEXT_PUBLIC_SITE_URL || process.env.SITE_URL,
);

export const SITE_HOST = new URL(SITE_URL).hostname;

export const SITE_NAME = "almera";
export const SITE_TAGLINE = "The Desi Wardrobe";
export const SITE_TITLE_DEFAULT =
  "almera — The Desi Wardrobe | Pakistani Lawn, Shalwar Kameez & Lehengas in Sri Lanka";
export const SITE_DESCRIPTION_DEFAULT =
  "Shop 100% original Pakistani lawn suits, ready-to-wear shalwar kameez and bridal lehengas online in Sri Lanka. Stitched or unstitched, with island-wide delivery and cash on delivery.";

export const LEGAL_NAME =
  process.env.NEXT_PUBLIC_BANK_ACCOUNT_NAME || "ALMERA APPAREL (PVT) LTD";

export const DEFAULT_LOCALE = "en_LK";
export const HTML_LANG = "en";
export const CURRENCY = "LKR";
export const COUNTRY = "LK";
export const COUNTRY_NAME = "Sri Lanka";

const rawWhatsApp = (process.env.NEXT_PUBLIC_WHATSAPP_NUMBER || "94771234567").replace(
  /[^\d]/g,
  "",
);
export const SUPPORT_PHONE = `+${rawWhatsApp}`;
export const SUPPORT_EMAIL = process.env.MAIL_FROM || "orders@almera.lk";

export const INSTAGRAM_URL = "https://www.instagram.com/almera.lk/";
export const WHATSAPP_COMMUNITY_URL =
  process.env.NEXT_PUBLIC_WHATSAPP_COMMUNITY_URL ||
  "https://chat.whatsapp.com/G5xidVIQxc3Cw0bEEpnach";

export const SOCIAL_PROFILES = [INSTAGRAM_URL, WHATSAPP_COMMUNITY_URL] as const;

export const LOGO_PATH = "/brand/almera-logo-new.jpeg";
export const LOGO_URL = `${SITE_URL}${LOGO_PATH}`;

export const DEFAULT_OG_IMAGE = {
  url: `${SITE_URL}/opengraph-image`,
  width: 1200,
  height: 630,
  alt: SITE_TITLE_DEFAULT,
  type: "image/png",
} as const;

export const FOUNDING_DATE = "2024";

/** Fixed release timestamp for static routes in sitemaps (never use `new Date()` per request). */
export const STATIC_BUILD_DATE = "2026-11-01T00:00:00.000Z";

export const POSTAL_ADDRESS = {
  streetAddress: "Colombo 03",
  addressLocality: "Colombo",
  addressRegion: "Western Province",
  postalCode: "00300",
  addressCountry: COUNTRY,
} as const;

export const STORE_GEO = {
  latitude: 6.9061,
  longitude: 79.856,
} as const;

export const STORE_OPENING_HOURS = {
  dayOfWeek: [
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
  ] as const,
  opens: "10:00",
  closes: "20:00",
} as const;

/**
 * Shipping & Return policy constants derived directly from the catalog/delivery config.
 * Never duplicate magic numbers.
 */
export const SHIPPING_POLICY = {
  label: DELIVERY.standard.label,
  etaText: DELIVERY.standard.eta,
  firstPieceRateLkr: DELIVERY.standard.firstPiece,
  extraPieceRateLkr: DELIVERY.standard.extraPiece,
  freeShippingThresholdLkr: FREE_DELIVERY_FROM,
  stitchingFeeLkr: STITCHING_FEE,
  codDepositThresholdLkr: COD_DEPOSIT_THRESHOLD,
  codMinDepositLkr: COD_MIN_DEPOSIT,
  unstitchedHandlingDays: { min: 1, max: 2 } as const,
  stitchedHandlingDays: { min: 5, max: 7 } as const,
  transitDays: { min: 2, max: 4 } as const,
  destinationCountry: COUNTRY,
  currency: CURRENCY,
} as const;

export const RETURN_POLICY = {
  applicableCountry: COUNTRY,
  /** All sales are final per store policy (/help#policy). */
  returnPolicyCategory: "https://schema.org/MerchantReturnNotPermitted" as const,
  summary:
    "All sales are final: almera does not offer exchanges, returns or refunds. Customers can request unedited daylight photos, videos, and sizing guidance via Instagram or WhatsApp before ordering.",
} as const;

/** Deterministic priceValidUntil for structured data Offer nodes. */
export const OFFER_PRICE_VALID_UNTIL = "2027-12-31";
