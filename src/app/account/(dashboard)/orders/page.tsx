import { connection } from "next/server";
import { OrdersScreen } from "@/components/account/orders-screen";
import type { AccountOrder } from "@/components/account/types";
import { listAccountOrders, requireAccount } from "@/lib/account.server";

export const instant = false;

export default async function Page() {
  await connection();
  const { supabase, user } = await requireAccount("/account/orders");

  const { orders } = await listAccountOrders(supabase, user.id, 100);

  return <OrdersScreen orders={orders as unknown as AccountOrder[]} />;
}
