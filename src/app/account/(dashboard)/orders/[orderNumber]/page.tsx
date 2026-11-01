import { notFound } from "next/navigation";
import { connection } from "next/server";
import { OrderDetailScreen } from "@/components/account/order-detail";
import type { AccountOrder } from "@/components/account/types";
import { ORDER_COLUMNS, requireAccount } from "@/lib/account.server";

export const instant = false;

export default async function Page({ params }: { params: Promise<{ orderNumber: string }> }) {
  await connection();
  const { orderNumber } = await params;
  const { supabase, user } = await requireAccount(`/account/orders/${encodeURIComponent(orderNumber)}`);

  // Matching on the owner as well means another customer's order number simply isn't found.
  const { data: order } = await supabase
    .from("orders")
    .select(ORDER_COLUMNS)
    .eq("order_number", orderNumber.toUpperCase())
    .eq("user_id", user.id)
    .maybeSingle();

  if (!order) notFound();
  return <OrderDetailScreen order={order as unknown as AccountOrder} />;
}
