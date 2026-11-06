import type { Metadata } from "next";
import { Suspense } from "react";
import { CheckoutForm } from "@/components/checkout-form";
import { buildMetadata } from "@/lib/seo/metadata";

export const metadata: Metadata = buildMetadata({
  title: "Checkout",
  description: "Complete your almera order with island-wide courier delivery across Sri Lanka.",
  path: "/checkout",
  noindex: true,
});

export default function CheckoutPage() {
  return (
    <Suspense fallback={<div className="min-h-[60vh]" />}>
      <CheckoutForm />
    </Suspense>
  );
}
