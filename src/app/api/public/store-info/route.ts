import { NextResponse } from "next/server";
import { DISTRICTS } from "@/lib/catalog";
import {
  COUNTRY,
  COUNTRY_NAME,
  CURRENCY,
  DEFAULT_LOCALE,
  FOUNDING_DATE,
  LEGAL_NAME,
  LOGO_URL,
  POSTAL_ADDRESS,
  RETURN_POLICY,
  SHIPPING_POLICY,
  SITE_DESCRIPTION_DEFAULT,
  SITE_NAME,
  SITE_TAGLINE,
  SITE_URL,
  SOCIAL_PROFILES,
  STORE_OPENING_HOURS,
  SUPPORT_EMAIL,
  SUPPORT_PHONE,
} from "@/lib/seo/config";

export async function GET() {
  return NextResponse.json(
    {
      name: SITE_NAME,
      tagline: SITE_TAGLINE,
      legalName: LEGAL_NAME,
      url: SITE_URL,
      logo: LOGO_URL,
      description: SITE_DESCRIPTION_DEFAULT,
      foundingDate: FOUNDING_DATE,
      locale: DEFAULT_LOCALE,
      country: COUNTRY,
      countryName: COUNTRY_NAME,
      currency: CURRENCY,
      contact: {
        email: SUPPORT_EMAIL,
        phone: SUPPORT_PHONE,
        address: POSTAL_ADDRESS,
        openingHours: STORE_OPENING_HOURS,
        socialProfiles: SOCIAL_PROFILES,
      },
      shippingPolicy: {
        ...SHIPPING_POLICY,
        districtsServed: DISTRICTS,
      },
      returnPolicy: RETURN_POLICY,
      paymentMethods: [
        "Cash on Delivery (COD)",
        "Bank Transfer",
        "Visa / MasterCard (Payments.lk)",
      ],
      feeds: {
        sitemap: `${SITE_URL}/sitemap.xml`,
        googleMerchant: `${SITE_URL}/google-merchant-products.xml`,
        productsXml: `${SITE_URL}/products.xml`,
        metaCatalog: `${SITE_URL}/meta-catalog.xml`,
        llmsTxt: `${SITE_URL}/llms.txt`,
        llmsFullTxt: `${SITE_URL}/llms-full.txt`,
        openApi: `${SITE_URL}/openapi.json`,
      },
    },
    {
      status: 200,
      headers: {
        "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400",
      },
    },
  );
}

