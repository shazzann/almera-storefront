import { NextResponse } from "next/server";
import {
  COUNTRY_NAME,
  FOUNDING_DATE,
  LEGAL_NAME,
  LOGO_URL,
  SITE_DESCRIPTION_DEFAULT,
  SITE_NAME,
  SITE_TAGLINE,
  SITE_URL,
} from "@/lib/seo/config";

export async function GET() {
  return NextResponse.json(
    {
      count: 1,
      brands: [
        {
          slug: "almera",
          name: SITE_NAME,
          tagline: SITE_TAGLINE,
          legalName: LEGAL_NAME,
          url: `${SITE_URL}/brand/almera`,
          logo: LOGO_URL,
          foundingDate: FOUNDING_DATE,
          country: COUNTRY_NAME,
          description: SITE_DESCRIPTION_DEFAULT,
        },
      ],
    },
    {
      status: 200,
      headers: {
        "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400",
      },
    },
  );
}

