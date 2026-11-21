import { connection } from "next/server";
import { HomeScreen } from "@/components/account/home-screen";
import type { AccountAddress, AccountOrder } from "@/components/account/types";
import { ADDRESS_COLUMNS, accountProfile, listAccountOrders, requireAccount } from "@/lib/account.server";

export const instant = false;

export default async function Page() {
  await connection();
  const { supabase, user } = await requireAccount("/account");

  const [{ data: profile }, { orders, count }, { data: defaultAddress }] = await Promise.all([
    supabase.from("profiles").select("full_name, phone").eq("id", user.id).maybeSingle(),
    listAccountOrders(supabase, user.id, 5),
    supabase.from("customer_addresses").select(ADDRESS_COLUMNS).eq("user_id", user.id).eq("is_default", true).maybeSingle(),
  ]);

  return (
    <HomeScreen
      profile={accountProfile(user, profile)}
      orders={orders as unknown as AccountOrder[]}
      orderCount={count}
      defaultAddress={defaultAddress as AccountAddress | null}
    />
  );
}
