import { ImageResponse } from "next/og";
import { getCategory } from "@/lib/catalog";
import { getAllCategories } from "@/lib/catalog.server";
import { SITE_NAME, SITE_TAGLINE } from "@/lib/seo/config";
import { fetchRemoteImageAsDataUri, getBrandLogoDataUri } from "@/lib/seo/og-helper";

export const alt = "almera Category Collection in Sri Lanka";
export const size = {
  width: 1200,
  height: 630,
};
export const contentType = "image/png";

export default async function CategoryOpenGraphImage({
  params,
}: {
  params: Promise<{ category: string }>;
}) {
  const { category: slug } = await params;
  const allCats = await getAllCategories();
  const cat = allCats.find((c) => c.slug === slug) ?? getCategory(slug);

  const title = cat ? `${cat.name} in Sri Lanka` : "The Desi Wardrobe";
  const blurb =
    cat?.blurb ??
    "Shop Pakistani lawn suits, ready-to-wear shalwar kameez and bridal lehengas online in Sri Lanka.";

  const [photoSrc, logoSrc] = await Promise.all([
    fetchRemoteImageAsDataUri(cat?.image, 440, 540),
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
            maxWidth: "640px",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "14px",
            }}
          >
            {logoSrc && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={logoSrc}
                alt={SITE_NAME}
                width={54}
                height={54}
                style={{ borderRadius: "12px", objectFit: "cover" }}
              />
            )}
            <div
              style={{
                display: "flex",
                flexDirection: "column",
              }}
            >
              <span
                style={{
                  fontSize: 24,
                  fontWeight: 700,
                  color: "#1f241f",
                }}
              >
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

          <div style={{ display: "flex", flexDirection: "column", gap: "18px" }}>
            <div
              style={{
                fontSize: 64,
                fontWeight: 700,
                lineHeight: 1.06,
                color: "#1f241f",
              }}
            >
              {title}
            </div>
            <div
              style={{
                fontSize: 25,
                lineHeight: 1.4,
                color: "#434c43",
              }}
            >
              {blurb.slice(0, 145)}
            </div>
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
            <span>almera.lk/shop/{cat?.slug ?? ""}</span>
            <span>·</span>
            <span>100% Original</span>
            <span>·</span>
            <span>Island-wide Delivery</span>
          </div>
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: "390px",
            height: "510px",
            borderRadius: "195px 195px 24px 24px",
            background: "#c8d0be",
            border: "2px solid #b59758",
            overflow: "hidden",
          }}
        >
          {photoSrc ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={photoSrc}
              alt={title}
              width={390}
              height={510}
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
            <div style={{ fontSize: 48, fontWeight: 700 }}>{title}</div>
          )}
        </div>
      </div>
    ),
    {
      ...size,
    },
  );
}

