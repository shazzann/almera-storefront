import { NextResponse, type NextRequest } from "next/server";
import { linkGuestOrders } from "@/lib/account.server";
import { markPasswordRecovery } from "@/lib/recovery.server";
import { safeNextPath } from "@/lib/safe-redirect";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const next = safeNextPath(requestUrl.searchParams.get("next"));

  if (!code) {
    return NextResponse.redirect(new URL("/account/login?error=link", requestUrl.origin));
  }

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.exchangeCodeForSession(code);

  if (error || !data?.user) {
    return NextResponse.redirect(new URL("/account/login?error=link", requestUrl.origin));
  }

  await linkGuestOrders(data.user);
  if (next === "/account/reset-password") await markPasswordRecovery(data.user.id);

  return NextResponse.redirect(new URL(next, requestUrl.origin));
}
