import type { Metadata } from "next";
import { Suspense } from "react";
import { CheckoutForm } from "@/components/checkout-form";

export const metadata: Metadata = {
  title: "Checkout",
  robots: { index: false },
};

export default function CheckoutPage() {
  return (
    <Suspense fallback={<div className="min-h-[60vh]" />}>
      <CheckoutForm />
    </Suspense>
  );
}
