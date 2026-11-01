import { connection } from "next/server";
import { ResetForm } from "@/components/account/auth-forms";
import { getCurrentUser } from "@/lib/auth.server";
import { hasPasswordRecovery } from "@/lib/recovery.server";

export const instant = false;

export default async function Page() {
  await connection();
  const user = await getCurrentUser();
  const linkValid = user ? await hasPasswordRecovery(user.id) : false;
  return <ResetForm linkValid={linkValid} email={user?.email ?? ""} name={user?.user_metadata?.full_name ?? ""} />;
}
