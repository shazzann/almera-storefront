import { ImageResponse } from "next/og";
import { SITE_NAME, SITE_TAGLINE, SITE_TITLE_DEFAULT } from "@/lib/seo/config";
import { getBrandLogoDataUri } from "@/lib/seo/og-helper";

export const alt = SITE_TITLE_DEFAULT;
export const size = {
  width: 1200,
  height: 630,
};
export const contentType = "image/png";

export default async function OpenGraphImage() {
  const logoSrc = await getBrandLogoDataUri();

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
          padding: "64px 76px",
          fontFamily: "serif",
        }}
      >
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            height: "100%",
            maxWidth: "660px",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "14px",
              fontSize: 20,
              letterSpacing: "0.3em",
              textTransform: "uppercase",
              color: "#8f7540",
            }}
          >
            <span>{SITE_NAME}</span>
            <span>·</span>
            <span>{SITE_TAGLINE}</span>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "18px" }}>
            <div
              style={{
                fontSize: 68,
                fontWeight: 700,
                lineHeight: 1.06,
                color: "#1f241f",
              }}
            >
              Pakistani Lawn, Shalwar Kameez &amp; Lehengas
            </div>
            <div
              style={{
                fontSize: 26,
                lineHeight: 1.4,
                color: "#434c43",
              }}
            >
              100% original pieces, stitched or unstitched. Delivered island-wide across Sri Lanka.
            </div>
          </div>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "20px",
              fontSize: 20,
              color: "#556455",
            }}
          >
            <span>almera.lk</span>
            <span>·</span>
            <span>Island-wide Courier</span>
            <span>·</span>
            <span>Cash on Delivery</span>
          </div>
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: "340px",
            height: "440px",
            borderRadius: "170px 170px 28px 28px",
            background: "#c8d0be",
            border: "2px solid #b59758",
            overflow: "hidden",
          }}
        >
          {logoSrc ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={logoSrc}
              alt={SITE_NAME}
              width={320}
              height={320}
              style={{ borderRadius: "24px", objectFit: "cover" }}
            />
          ) : (
            <div style={{ fontSize: 64, fontWeight: 700, color: "#1f241f" }}>
              {SITE_NAME}
            </div>
          )}
        </div>
      </div>
    ),
    {
      ...size,
    },
  );
}

