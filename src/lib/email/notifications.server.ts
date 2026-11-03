import "server-only";
import { getSupabaseAdmin, isSupabaseAdminConfigured } from "@/lib/supabase/admin.server";
import { getSiteUrl, isEmailConfigured, sendEmail } from "./mailer.server";
import {
  adminRefundNeededEmail,
  depositReceiptEmail,
  orderPlacedEmail,
  orderStatusEmail,
  type EmailOrderItem,
} from "./templates";

async function loadOrder(orderId: string) {
  if (!isSupabaseAdminConfigured() || !isEmailConfigured()) return null;
  const { data: order } = await getSupabaseAdmin().from("orders").select("*").eq("id", orderId).maybeSingle();
  return order?.email ? order : null;
}

export async function notifyOrderPlaced(orderId: string): Promise<void> {
  const order = await loadOrder(orderId);
  if (!order) return;
  const { data: items } = await getSupabaseAdmin().from("order_items").select("*").eq("order_id", orderId);
  await sendEmail(order.email, orderPlacedEmail({ order, items: (items ?? []) as EmailOrderItem[], siteUrl: getSiteUrl() }));
}

export async function notifyCodDepositReceived(orderId: string): Promise<void> {
  const order = await loadOrder(orderId);
  if (order) await sendEmail(order.email, depositReceiptEmail({ order, siteUrl: getSiteUrl() }));
}

export async function notifyOrderStatus(orderId: string, status: string): Promise<void> {
  const order = await loadOrder(orderId);
  if (!order) return;
  const content = orderStatusEmail({ order, status, siteUrl: getSiteUrl() });
  if (content) await sendEmail(order.email, content);
}

export async function notifyAdminRefundNeeded(
  orderId: string,
  paymentId: string,
  reason: string,
): Promise<void> {
  const supabase = getSupabaseAdmin();
  const { data: order } = await supabase
    .from("orders")
    .select("*")
    .eq("id", orderId)
    .maybeSingle();

  // Audit log entry
  try {
    await supabase.from("audit_log").insert({
      action: "refund_needed",
      entity_type: "order",
      entity_id: orderId,
      details: {
        order_number: order?.order_number ?? orderId,
        payment_id: paymentId,
        reason,
        total: order?.total,
        customer_name: order?.customer_name,
        customer_phone: order?.phone,
        customer_email: order?.email,
      },
    });
  } catch (err) {
    console.error("[notifyAdminRefundNeeded] Failed to write audit log:", err);
  }

  await sendEmail(
    process.env.ADMIN_EMAIL || "almeralk26@gmail.com",
    adminRefundNeededEmail({
      orderNumber: order?.order_number ?? orderId,
      paymentId,
      reason,
      total: Number(order?.total ?? 0),
      customer: order?.customer_name ?? "",
      phone: order?.phone ?? "",
      email: order?.email ?? "N/A",
      siteUrl: getSiteUrl(),
    }),
  );
}
