import { connection } from "next/server";
import { ProfileScreen } from "@/components/account/profile-screen";
import { accountProfile, requireAccount } from "@/lib/account.server";

export const instant = false;

export default async function Page() {
  await connection();
  const { supabase, user } = await requireAccount("/account/profile");
  const { data: profile } = await supabase.from("profiles").select("full_name, phone").eq("id", user.id).maybeSingle();

  return <ProfileScreen profile={accountProfile(user, profile)} />;
}
