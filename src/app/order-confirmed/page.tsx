import type { Metadata } from "next";
import { Suspense } from "react";
import { OrderConfirmation } from "@/components/order-confirmation";
import { buildMetadata } from "@/lib/seo/metadata";

export const metadata: Metadata = buildMetadata({
  title: "Order Confirmed",
  description: "Your almera order confirmation and payment details.",
  path: "/order-confirmed",
  noindex: true,
});

export default function OrderConfirmedPage() {
  return (
    <Suspense fallback={<div className="min-h-[60vh]" />}>
      <OrderConfirmation />
    </Suspense>
  );
}
