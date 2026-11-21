import "server-only";
import type { User } from "@supabase/supabase-js";
import { redirect } from "next/navigation";
import type { AccountProfile } from "@/components/account/types";
import { getSupabaseAdmin } from "@/lib/supabase/admin.server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const LEGACY_ORDER_COLUMNS =
  "id, order_number, status, payment_method, total, subtotal, delivery_fee, discount_amount, coupon_code, advance_deposit, refund_amount, created_at, customer_name, phone, address, city, district, postal_code, notes, order_items(id, product_slug, product_name, stitching, size, unit_price, quantity, image_url)";

export const ORDER_COLUMNS =
  `${LEGACY_ORDER_COLUMNS}, hold_expires_at, payment_proof_path, payment_proof_mime, bank_slip_reference, payment_proof_confirmed_at, payment_proof_purged_at`;

export const ADDRESS_COLUMNS = "id, label, recipient_name, phone, address, city, district, postal_code, is_default";

/** Each page checks the session itself, so a missed proxy rule can never expose someone's data. */
export async function requireAccount(nextPath: string) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(`/account/login?next=${encodeURIComponent(nextPath)}`);
  await linkGuestOrders(user);
  return { supabase, user };
}

export async function listAccountOrders(
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>,
  userId: string,
  limit = 100,
) {
  const res = await supabase
    .from("orders")
    .select(ORDER_COLUMNS, { count: "exact" })
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (res.error?.code === "42703") {
    const fallback = await supabase
      .from("orders")
      .select(LEGACY_ORDER_COLUMNS, { count: "exact" })
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(limit);
    return { orders: fallback.data ?? [], count: fallback.count ?? 0 };
  }
  return { orders: res.data ?? [], count: res.count ?? 0 };
}

export async function getAccountOrderByNumber(
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>,
  userId: string,
  orderNumber: string,
) {
  const normalized = orderNumber.toUpperCase();
  const res = await supabase
    .from("orders")
    .select(ORDER_COLUMNS)
    .eq("order_number", normalized)
    .eq("user_id", userId)
    .maybeSingle();

  if (res.error?.code === "42703") {
    const fallback = await supabase
      .from("orders")
      .select(LEGACY_ORDER_COLUMNS)
      .eq("order_number", normalized)
      .eq("user_id", userId)
      .maybeSingle();
    return fallback.data ?? null;
  }
  return res.data ?? null;
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
  };
}
