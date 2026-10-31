import type { Metadata } from "next";
import { TrackOrderView } from "@/components/track-order-view";

export const metadata: Metadata = {
  title: "Track your order",
  description:
    "Check the live status, advance deposit receipt, and courier balance of your almera order.",
  alternates: { canonical: "/track-order" },
};

export default function TrackOrderPage() {
  return <TrackOrderView />;
}

