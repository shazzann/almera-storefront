import { ImageResponse } from "next/og";
import { formatLKR, nameWithColour, startingPrice } from "@/lib/catalog";
import { getProductBySlug } from "@/lib/catalog.server";
import { SITE_NAME, SITE_TAGLINE } from "@/lib/seo/config";
import { fetchRemoteImageAsDataUri, getBrandLogoDataUri } from "@/lib/seo/og-helper";

export const alt = "almera Product in Sri Lanka";
export const size = {
  width: 1200,
  height: 630,
};
export const contentType = "image/png";

export default async function ProductOpenGraphImage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const product = await getProductBySlug(slug);

  const displayName = product ? nameWithColour(product) : "almera — The Desi Wardrobe";
  const priceText = product ? formatLKR(startingPrice(product)) : "";
  const subtitle = product
    ? `${product.colour} · ${product.fabric}`
    : "Pakistani Lawn, Shalwar Kameez & Lehengas in Sri Lanka";

  const [photoSrc, logoSrc] = await Promise.all([
    fetchRemoteImageAsDataUri(product?.images[0], 410, 520),
    getBrandLogoDataUri(),
  ]);

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          background: "#eef1e9",
          color: "#1f241f",
          padding: "56px 68px",
          fontFamily: "serif",
        }}
      >
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            height: "100%",
            maxWidth: "630px",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
            {logoSrc && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={logoSrc}
                alt={SITE_NAME}
                width={56}
                height={56}
                style={{ borderRadius: "12px", objectFit: "cover" }}
              />
            )}
            <div style={{ display: "flex", flexDirection: "column" }}>
              <span style={{ fontSize: 24, fontWeight: 700, color: "#1f241f" }}>
                {SITE_NAME}
              </span>
              <span
                style={{
                  fontSize: 13,
                  letterSpacing: "0.24em",
                  textTransform: "uppercase",
                  color: "#8f7540",
                }}
              >
                {SITE_TAGLINE}
              </span>
            </div>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            <div
              style={{
                fontSize: 56,
                fontWeight: 700,
                lineHeight: 1.08,
                color: "#1f241f",
              }}
            >
              {displayName}
            </div>
            <div style={{ fontSize: 24, color: "#556455" }}>{subtitle}</div>
            {priceText && (
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "14px",
                  marginTop: "8px",
                }}
              >
                <span
                  style={{
                    fontSize: 38,
                    fontWeight: 700,
                    color: "#1f241f",
                    background: "#f8f6f0",
                    padding: "10px 24px",
                    borderRadius: "999px",
                    border: "1px solid #b59758",
                  }}
                >
                  {priceText}
                </span>
                <span style={{ fontSize: 20, color: "#8f7540" }}>100% Original</span>
              </div>
            )}
          </div>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "16px",
              fontSize: 19,
              color: "#556455",
            }}
          >
            <span>almera.lk</span>
            <span>·</span>
            <span>Island-wide Delivery in Sri Lanka</span>
            <span>·</span>
            <span>Cash on Delivery</span>
          </div>
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: "400px",
            height: "515px",
            borderRadius: "200px 200px 24px 24px",
            background: "#c8d0be",
            border: "2px solid #b59758",
            overflow: "hidden",
          }}
        >
          {photoSrc ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={photoSrc}
              alt={displayName}
              width={400}
              height={515}
              style={{ width: "100%", height: "100%", objectFit: "cover" }}
            />
          ) : logoSrc ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={logoSrc}
              alt={SITE_NAME}
              width={280}
              height={280}
              style={{ borderRadius: "24px", objectFit: "cover" }}
            />
          ) : (
            <div style={{ fontSize: 42, fontWeight: 700 }}>{displayName}</div>
          )}
        </div>
      </div>
    ),
    {
      ...size,
    },
  );
}

