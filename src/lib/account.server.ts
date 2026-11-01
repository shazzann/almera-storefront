import "server-only";
import type { User } from "@supabase/supabase-js";
import { redirect } from "next/navigation";
import type { AccountProfile } from "@/components/account/types";
import { isAdminEmail } from "@/lib/admin-config";
import { getSupabaseAdmin } from "@/lib/supabase/admin.server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const ORDER_COLUMNS =
  "id, order_number, status, payment_method, total, subtotal, delivery_fee, discount_amount, coupon_code, advance_deposit, refund_amount, created_at, customer_name, phone, address, city, district, postal_code, notes, order_items(id, product_slug, product_name, stitching, size, unit_price, quantity, image_url)";

export const ADDRESS_COLUMNS = "id, label, recipient_name, phone, address, city, district, postal_code, is_default";

/** Each page checks the session itself, so a missed proxy rule can never expose someone's data. */
export async function requireAccount(nextPath: string) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(`/account/login?next=${encodeURIComponent(nextPath)}`);
  return { supabase, user };
}

/** Only a confirmed email proves ownership of the orders placed with it. */
export async function linkGuestOrders(user: User) {
  if (!user.email || !user.email_confirmed_at) return;
  try {
    await getSupabaseAdmin().rpc("link_guest_orders_to_user", { p_user_id: user.id, p_email: user.email });
  } catch {
    // Non-blocking: the confirmation trigger also links them.
  }
}

export function accountProfile(user: User, row?: { full_name?: string | null; phone?: string | null } | null): AccountProfile {
  const providers = user.identities?.map((identity) => identity.provider) ?? [];
  return {
    name: row?.full_name || user.user_metadata?.full_name || user.user_metadata?.name || "",
    email: user.email ?? "",
    phone: row?.phone || user.user_metadata?.phone || "",
    emailVerified: Boolean(user.email_confirmed_at),
    hasPassword: providers.includes("email"),
    viaGoogle: providers.includes("google"),
    lastSignIn: user.last_sign_in_at ?? null,
    isAdmin: isAdminEmail(user.email),
  };
}
