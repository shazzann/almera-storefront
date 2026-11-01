import { connection } from "next/server";
import { AddressesScreen } from "@/components/account/addresses-screen";
import type { AccountAddress } from "@/components/account/types";
import { ADDRESS_COLUMNS, accountProfile, requireAccount } from "@/lib/account.server";

export const instant = false;

export default async function Page() {
  await connection();
  const { supabase, user } = await requireAccount("/account/addresses");

  const [{ data: addresses }, { data: profile }] = await Promise.all([
    supabase
      .from("customer_addresses")
      .select(ADDRESS_COLUMNS)
      .eq("user_id", user.id)
      .order("is_default", { ascending: false })
      .order("created_at", { ascending: false }),
    supabase.from("profiles").select("full_name, phone").eq("id", user.id).maybeSingle(),
  ]);
  const { name, phone } = accountProfile(user, profile);

  return <AddressesScreen initial={(addresses ?? []) as AccountAddress[]} profileName={name} profilePhone={phone} />;
}
