import { NextResponse, type NextRequest } from "next/server";
import { SITE_URL } from "@/lib/seo/config";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ catchall: string[] }> },
) {
  const segments = (await params).catchall ?? [];
  return NextResponse.json(
    {
      error: "API endpoint not found",
      status: 404,
      path: `/api/${segments.join("/")}`,
      method: request.method,
      openapi: `${SITE_URL}/openapi.json`,
    },
    {
      status: 404,
      headers: {
        "X-Robots-Tag": "noindex",
      },
    },
  );
}

export const POST = GET;
export const PUT = GET;
export const DELETE = GET;
export const PATCH = GET;

