import type { Metadata } from "next";
import { TrackOrderView } from "@/components/track-order-view";
import { buildMetadata } from "@/lib/seo/metadata";

export const metadata: Metadata = buildMetadata({
  title: "Track Your Order",
  description:
    "Check the live status, advance deposit receipt, and courier balance of your almera order.",
  path: "/track-order",
  noindex: true,
});

export default function TrackOrderPage() {
  return <TrackOrderView />;
}
