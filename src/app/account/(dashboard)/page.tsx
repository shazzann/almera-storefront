import { connection } from "next/server";
import { HomeScreen } from "@/components/account/home-screen";
import type { AccountAddress, AccountOrder } from "@/components/account/types";
import { ADDRESS_COLUMNS, ORDER_COLUMNS, accountProfile, requireAccount } from "@/lib/account.server";

export const instant = false;

export default async function Page() {
  await connection();
  const { supabase, user } = await requireAccount("/account");

  const [{ data: profile }, { data: orders, count }, { data: defaultAddress }] = await Promise.all([
    supabase.from("profiles").select("full_name, phone").eq("id", user.id).maybeSingle(),
    supabase
      .from("orders")
      .select(ORDER_COLUMNS, { count: "exact" })
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(5),
    supabase.from("customer_addresses").select(ADDRESS_COLUMNS).eq("user_id", user.id).eq("is_default", true).maybeSingle(),
  ]);

  return (
    <HomeScreen
      profile={accountProfile(user, profile)}
      orders={(orders ?? []) as unknown as AccountOrder[]}
      orderCount={count ?? 0}
      defaultAddress={defaultAddress as AccountAddress | null}
    />
  );
}
