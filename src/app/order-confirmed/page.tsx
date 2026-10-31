import type { Metadata } from "next";
import { Suspense } from "react";
import { OrderConfirmation } from "@/components/order-confirmation";

export const metadata: Metadata = {
  title: "Order placed",
  robots: { index: false },
};

export default function OrderConfirmedPage() {
  return (
    <Suspense fallback={<div className="min-h-[60vh]" />}>
      <OrderConfirmation />
    </Suspense>
  );
}
