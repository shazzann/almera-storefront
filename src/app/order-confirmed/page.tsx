import type { Metadata } from "next";
import { OrderConfirmation } from "@/components/order-confirmation";

export const metadata: Metadata = {
  title: "Order placed",
  robots: { index: false },
};

export default function OrderConfirmedPage() {
  return <OrderConfirmation />;
}
