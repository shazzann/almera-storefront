import { notFound } from "next/navigation";
import { connection } from "next/server";
import { OrderDetailScreen } from "@/components/account/order-detail";
import type { AccountOrder } from "@/components/account/types";
import { getAccountOrderByNumber, requireAccount } from "@/lib/account.server";

export const instant = false;

export default async function Page({ params }: { params: Promise<{ orderNumber: string }> }) {
  await connection();
  const { orderNumber } = await params;
  const { supabase, user } = await requireAccount(`/account/orders/${encodeURIComponent(orderNumber)}`);

  // Matching on the owner as well means another customer's order number simply isn't found.
  const order = await getAccountOrderByNumber(supabase, user.id, orderNumber);

  if (!order) notFound();
  return <OrderDetailScreen order={order as unknown as AccountOrder} />;
}
