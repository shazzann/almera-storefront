import "server-only";
import nodemailer from "nodemailer";
import { formatLKR } from "@/lib/catalog";
import {
  COD_DEPOSIT_BANK,
  COD_MIN_DEPOSIT,
  buildWhatsAppCodDepositUrl,
  getCodBalanceDue,
  requiresCodDeposit,
} from "@/lib/cod-deposit";
import { getSupabaseAdmin, isSupabaseAdminConfigured } from "@/lib/supabase/admin.server";
import { BANK_DETAILS, buildWhatsAppBankSlipUrl } from "@/lib/whatsapp";

function escapeHtml(raw: unknown): string {
  return String(raw ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function createTransporter() {
  const host = process.env.SMTP_HOST;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASSWORD;
  if (!host || !user || !pass || pass === "re_your_api_key") {
    return null;
  }
  const port = Number(process.env.SMTP_PORT || "587");
  const secure = process.env.SMTP_SECURE === "true";
  return nodemailer.createTransport({
    host,
    port,
    secure,
    auth: { user, pass },
  });
}

export async function notifyOrderPlaced(orderId: string): Promise<void> {
  if (!isSupabaseAdminConfigured()) return;
  const transporter = createTransporter();
  if (!transporter) return;

  const supabase = getSupabaseAdmin();
  const { data: order } = await supabase
    .from("orders")
    .select("*")
    .eq("id", orderId)
    .maybeSingle();

  if (!order || !order.email) return;

  const { data: items } = await supabase
    .from("order_items")
    .select("*")
    .eq("order_id", orderId);

  const fromName = process.env.MAIL_FROM_NAME || "almera";
  const fromEmail = process.env.MAIL_FROM || "orders@almera.lk";
  const orderTotal = Number(order.total);
  const needsCodDeposit = requiresCodDeposit(order.payment_method, orderTotal);
  const waBankUrl = buildWhatsAppBankSlipUrl(
    order.order_number,
    orderTotal,
    order.customer_name,
  );
  const waCodDepositUrl = buildWhatsAppCodDepositUrl(
    order.order_number,
    orderTotal,
    order.customer_name,
    COD_MIN_DEPOSIT,
  );

  const itemsHtml = (items ?? [])
    .map(
      (item: any) =>
        `<tr>
          <td style="padding:8px 0;border-bottom:1px solid #e6dfd5;">${Number(item.quantity)} × ${escapeHtml(item.product_name)}</td>
          <td style="padding:8px 0;border-bottom:1px solid #e6dfd5;text-align:right;font-weight:600;">${formatLKR(Number(item.unit_price) * Number(item.quantity))}</td>
        </tr>`,
    )
    .join("");

  const paymentBlock =
    order.payment_method === "bank"
      ? `<div style="margin-top:20px;padding:16px;background:#f4efe6;border-radius:12px;">
          <p style="margin:0 0 8px;font-weight:600;">Bank Transfer Details</p>
          <p style="margin:2px 0;font-size:14px;">Bank: <strong>${escapeHtml(BANK_DETAILS.bankName)}</strong></p>
          <p style="margin:2px 0;font-size:14px;">Account Name: <strong>${escapeHtml(BANK_DETAILS.accountName)}</strong></p>
          <p style="margin:2px 0;font-size:14px;">Account Number: <strong>${escapeHtml(BANK_DETAILS.accountNumber)}</strong></p>
          <p style="margin:2px 0;font-size:14px;">Branch: <strong>${escapeHtml(BANK_DETAILS.branch)}</strong></p>
          <p style="margin:2px 0;font-size:14px;">Reference: <strong>${escapeHtml(order.order_number)}</strong></p>
          <p style="margin:12px 0 0;"><a href="${escapeHtml(waBankUrl)}" style="display:inline-block;padding:10px 18px;background:#1f231e;color:#fbf8f2;text-decoration:none;border-radius:999px;font-size:13px;">Send Payment Slip on WhatsApp</a></p>
        </div>`
      : needsCodDeposit
        ? `<div style="margin-top:20px;padding:16px;background:#f4efe6;border:1px solid #d4b97c;border-radius:12px;">
            <p style="margin:0 0 8px;font-weight:600;color:#8c6f39;">COD Advance Deposit Required (Min. ${formatLKR(COD_MIN_DEPOSIT)})</p>
            <p style="margin:0 0 10px;font-size:13px;line-height:1.5;color:#4a4e48;">Because your Cash on Delivery order exceeds Rs. 3,000, please transfer a minimum <strong>${formatLKR(COD_MIN_DEPOSIT)} advance deposit</strong> to confirm dispatch. You will pay the remaining <strong>${formatLKR(Math.max(0, orderTotal - COD_MIN_DEPOSIT))}</strong> in cash to the courier upon delivery.</p>
            <p style="margin:2px 0;font-size:14px;">Bank: <strong>${escapeHtml(COD_DEPOSIT_BANK.bank)}</strong></p>
            <p style="margin:2px 0;font-size:14px;">Account Name: <strong>${escapeHtml(COD_DEPOSIT_BANK.accountName)}</strong></p>
            <p style="margin:2px 0;font-size:14px;">Account Number: <strong>${escapeHtml(COD_DEPOSIT_BANK.accountNumber)}</strong></p>
            <p style="margin:2px 0;font-size:14px;">Branch: <strong>${escapeHtml(COD_DEPOSIT_BANK.branch)}</strong></p>
            <p style="margin:2px 0;font-size:14px;">Reference: <strong>${escapeHtml(order.order_number)}</strong></p>
            <p style="margin:12px 0 0;"><a href="${escapeHtml(waCodDepositUrl)}" style="display:inline-block;padding:10px 18px;background:#1f231e;color:#fbf8f2;text-decoration:none;border-radius:999px;font-size:13px;">Send ${formatLKR(COD_MIN_DEPOSIT)} Deposit Slip on WhatsApp</a></p>
          </div>`
        : "";

  await transporter.sendMail({
    from: `"${fromName}" <${fromEmail}>`,
    to: order.email,
    subject: `Order Received — ${order.order_number} · almera`,
    html: `
      <div style="font-family:Georgia,serif;max-width:560px;margin:0 auto;padding:28px;color:#1f231e;background:#fbf8f2;">
        <p style="text-transform:uppercase;letter-spacing:0.15em;font-size:11px;color:#8c6f39;">Order ${escapeHtml(order.order_number)}</p>
        <h1 style="font-weight:400;font-size:28px;margin:8px 0 16px;">Thank you, ${escapeHtml(order.customer_name)}</h1>
        <p style="font-size:15px;line-height:1.6;color:#4a4e48;">We’ve received your order and set your pieces aside in the wardrobe. We will call or WhatsApp you on <strong>${escapeHtml(order.phone)}</strong> within one working day.</p>
        <table style="width:100%;border-collapse:collapse;margin-top:20px;font-size:14px;">
          ${itemsHtml}
        </table>
        <div style="margin-top:16px;font-size:14px;">
          <p style="margin:4px 0;">Subtotal: <strong>${formatLKR(Number(order.subtotal))}</strong></p>
          ${Number(order.discount_amount) > 0 ? `<p style="margin:4px 0;color:#4a6b53;">Discount (${escapeHtml(order.coupon_code)}): <strong>−${formatLKR(Number(order.discount_amount))}</strong></p>` : ""}
          <p style="margin:4px 0;">Delivery: <strong>${Number(order.delivery_fee) === 0 ? "Free" : formatLKR(Number(order.delivery_fee))}</strong></p>
          <p style="margin:8px 0 0;font-size:16px;">Total: <strong>${formatLKR(orderTotal)}</strong></p>
        </div>
        ${paymentBlock}
      </div>
    `,
  });
}

export async function notifyCodDepositReceived(orderId: string): Promise<void> {
  if (!isSupabaseAdminConfigured()) return;
  const transporter = createTransporter();
  if (!transporter) return;

  const supabase = getSupabaseAdmin();
  const { data: order } = await supabase
    .from("orders")
    .select("*")
    .eq("id", orderId)
    .maybeSingle();

  if (!order || !order.email) return;

  const fromName = process.env.MAIL_FROM_NAME || "almera";
  const fromEmail = process.env.MAIL_FROM || "orders@almera.lk";
  const depositPaid = Number(order.advance_deposit ?? 0);
  const balanceDue = getCodBalanceDue(order);

  await transporter.sendMail({
    from: `"${fromName}" <${fromEmail}>`,
    to: order.email,
    subject: `Advance Deposit Receipt — ${order.order_number} · almera`,
    html: `
      <div style="font-family:Georgia,serif;max-width:560px;margin:0 auto;padding:28px;color:#1f231e;background:#fbf8f2;">
        <p style="text-transform:uppercase;letter-spacing:0.15em;font-size:11px;color:#8c6f39;">Deposit Receipt · ${escapeHtml(order.order_number)}</p>
        <h1 style="font-weight:400;font-size:26px;margin:8px 0 16px;">Advance Deposit Received</h1>
        <p style="font-size:15px;line-height:1.6;color:#4a4e48;">Thank you, ${escapeHtml(order.customer_name)}. We have recorded your advance deposit for order <strong>${escapeHtml(order.order_number)}</strong> and confirmed your parcel for dispatch.</p>
        <div style="margin-top:18px;padding:16px;background:#f4efe6;border-radius:12px;font-size:14px;">
          <p style="margin:4px 0;">Order Total: <strong>${formatLKR(Number(order.total))}</strong></p>
          <p style="margin:4px 0;color:#4a6b53;">Advance Deposit Paid: <strong>−${formatLKR(depositPaid)}</strong>${order.bank_slip_reference ? ` (Ref: ${escapeHtml(order.bank_slip_reference)})` : ""}</p>
          ${order.advance_deposit_note ? `<p style="margin:4px 0;font-size:13px;color:#555;">Note: ${escapeHtml(order.advance_deposit_note)}</p>` : ""}
          <p style="margin:10px 0 0;padding-top:8px;border-top:1px solid #dcd4c6;font-size:16px;">Balance to Pay Courier on Delivery: <strong>${formatLKR(balanceDue)}</strong></p>
        </div>
      </div>
    `,
  });
}

export async function notifyOrderStatus(orderId: string, status: string): Promise<void> {
  if (!isSupabaseAdminConfigured()) return;
  const transporter = createTransporter();
  if (!transporter) return;

  const supabase = getSupabaseAdmin();
  const { data: order } = await supabase
    .from("orders")
    .select("*")
    .eq("id", orderId)
    .maybeSingle();

  if (!order || !order.email) return;

  const fromName = process.env.MAIL_FROM_NAME || "almera";
  const fromEmail = process.env.MAIL_FROM || "orders@almera.lk";
  const balanceDue = getCodBalanceDue(order);
  const depositPaid = Number(order.advance_deposit ?? 0);

  const statusHeadline: Record<string, string> = {
    confirmed: "Your order has been confirmed and is being prepared.",
    shipped: "Your parcel is on its way via island-wide courier (2–4 working days).",
    delivered: "Your parcel has been delivered. We hope you love wearing it!",
    cancelled: "Your order has been cancelled.",
    refunded: "Your order has been refunded.",
  };

  await transporter.sendMail({
    from: `"${fromName}" <${fromEmail}>`,
    to: order.email,
    subject: `Order Update (${status.replace(/_/g, " ")}) — ${order.order_number} · almera`,
    html: `
      <div style="font-family:Georgia,serif;max-width:560px;margin:0 auto;padding:28px;color:#1f231e;background:#fbf8f2;">
        <p style="text-transform:uppercase;letter-spacing:0.15em;font-size:11px;color:#8c6f39;">Order ${escapeHtml(order.order_number)}</p>
        <h1 style="font-weight:400;font-size:26px;margin:8px 0 16px;">Status: ${escapeHtml(status.replace(/_/g, " ").toUpperCase())}</h1>
        <p style="font-size:15px;line-height:1.6;color:#4a4e48;">${escapeHtml(statusHeadline[status] ?? `Your order status is now ${status}.`)}</p>
        ${
          status === "confirmed" || status === "shipped"
            ? `<div style="margin-top:16px;padding:14px;background:#f4efe6;border-radius:10px;font-size:14px;">
                <p style="margin:3px 0;">Order Total: <strong>${formatLKR(Number(order.total))}</strong></p>
                ${depositPaid > 0 ? `<p style="margin:3px 0;color:#4a6b53;">Advance Deposit Paid: <strong>−${formatLKR(depositPaid)}</strong></p>` : ""}
                <p style="margin:6px 0 0;font-size:15px;">Balance to Collect on Delivery: <strong>${formatLKR(balanceDue)}</strong></p>
              </div>`
            : ""
        }
      </div>
    `,
  });
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

  const transporter = createTransporter();
  if (!transporter) return;

  const adminEmail = process.env.ADMIN_EMAIL || "almeralk26@gmail.com";
  const fromName = process.env.MAIL_FROM_NAME || "almera";
  const fromEmail = process.env.MAIL_FROM || "orders@almera.lk";

  try {
    await transporter.sendMail({
      from: `"${fromName}" <${fromEmail}>`,
      to: adminEmail,
      subject: `[ACTION REQUIRED] Manual Refund Needed — ${order?.order_number ?? orderId} · payments.lk`,
      html: `
        <div style="font-family:Georgia,serif;max-width:560px;margin:0 auto;padding:28px;color:#1f231e;background:#fbf8f2;">
          <p style="text-transform:uppercase;letter-spacing:0.15em;font-size:11px;color:#a5432f;font-weight:bold;">Refund Required</p>
          <h1 style="font-weight:400;font-size:24px;margin:8px 0 16px;">Customer Paid After Hold Expired</h1>
          <p style="font-size:15px;line-height:1.6;color:#4a4e48;">
            An order was completed on Payments.lk, but the customer took longer than the 15-minute reservation window. The inventory hold expired and one or more items sold out before payment completed.
          </p>
          <div style="margin-top:16px;padding:16px;background:#f4efe6;border-radius:10px;font-size:14px;line-height:1.6;">
            <p style="margin:4px 0;"><strong>Order:</strong> ${escapeHtml(order?.order_number ?? orderId)}</p>
            <p style="margin:4px 0;"><strong>Payment ID:</strong> <span style="font-family:monospace;">${escapeHtml(paymentId)}</span></p>
            <p style="margin:4px 0;"><strong>Total Paid:</strong> ${formatLKR(Number(order?.total ?? 0))}</p>
            <p style="margin:4px 0;"><strong>Customer:</strong> ${escapeHtml(order?.customer_name ?? "")} (${escapeHtml(order?.phone ?? "")})</p>
            <p style="margin:4px 0;"><strong>Email:</strong> ${escapeHtml(order?.email ?? "N/A")}</p>
            <p style="margin:4px 0;"><strong>Reason:</strong> ${escapeHtml(reason)}</p>
          </div>
          <p style="margin-top:16px;font-size:14px;color:#4a4e48;">
            Please open your <strong>Payments.lk dashboard</strong> and issue a refund for payment <code>${escapeHtml(paymentId)}</code>, or contact the customer to arrange a replacement item.
          </p>
        </div>
      `,
    });
  } catch (mailErr) {
    console.error("[notifyAdminRefundNeeded] Failed to send email to admin:", mailErr);
  }
}
