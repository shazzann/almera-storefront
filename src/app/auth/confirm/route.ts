import { NextResponse, type NextRequest } from "next/server";
import { linkGuestOrders } from "@/lib/account.server";
import { markPasswordRecovery } from "@/lib/recovery.server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

/** Opens the links in our own sign-up and password reset emails, on any device or email app. */
export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const tokenHash = url.searchParams.get("token_hash");
  const type = url.searchParams.get("type");
  const failed = NextResponse.redirect(new URL("/account/login?error=link", url.origin));

  if (!tokenHash || (type !== "signup" && type !== "recovery")) return failed;

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type });
  if (error || !data.user) return failed;

  await linkGuestOrders(data.user);
  if (type === "recovery") {
    await markPasswordRecovery(data.user.id);
    return NextResponse.redirect(new URL("/account/reset-password", url.origin));
  }
  return NextResponse.redirect(new URL("/account", url.origin));
}
