import { buildImageUrl } from "@/lib/image-url";
import { NextResponse, type NextRequest } from "next/server";

type RouteParams = {
  params: Promise<{ path?: string[] }>;
};

/**
 * Zero-downtime redirect shim for legacy proxy URLs (/api/public/image/...).
 * Issues an HTTP 308 Permanent Redirect directly to the Cloudflare Edge CDN.
 */
export async function GET(request: NextRequest, segmentData: RouteParams) {
  const { path } = await segmentData.params;
  const filePath = (path ?? []).join("/");

  if (!filePath) {
    return new NextResponse("Not Found", { status: 404 });
  }

  const cdnUrl = buildImageUrl(filePath);

  return NextResponse.redirect(cdnUrl, {
    status: 308,
    headers: {
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });
}

export async function HEAD(request: NextRequest, segmentData: RouteParams) {
  return GET(request, segmentData);
}

