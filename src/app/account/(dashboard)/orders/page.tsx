import { connection } from "next/server";
import { OrdersScreen } from "@/components/account/orders-screen";
import type { AccountOrder } from "@/components/account/types";
import { ORDER_COLUMNS, requireAccount } from "@/lib/account.server";

export const instant = false;

export default async function Page() {
  await connection();
  const { supabase, user } = await requireAccount("/account/orders");

  const { data: orders } = await supabase
    .from("orders")
    .select(ORDER_COLUMNS)
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(100);

  return <OrdersScreen orders={(orders ?? []) as unknown as AccountOrder[]} />;
}
