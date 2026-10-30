import { NextResponse, type NextRequest } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin.server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

function sanitizeNextUrl(raw?: string | null): string {
  if (!raw) return "/account";
  const trimmed = raw.trim();
  if (trimmed.startsWith("/") && !trimmed.startsWith("//") && !trimmed.startsWith("/\\")) {
    return trimmed;
  }
  return "/account";
}

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const next = sanitizeNextUrl(requestUrl.searchParams.get("next"));

  if (code) {
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error && data?.user?.email) {
      try {
        const admin = getSupabaseAdmin();
        await admin.rpc("link_guest_orders_to_user", {
          p_user_id: data.user.id,
          p_email: data.user.email,
        });
      } catch {
        // non-blocking
      }
    }
  }

  return NextResponse.redirect(new URL(next, requestUrl.origin));
}

