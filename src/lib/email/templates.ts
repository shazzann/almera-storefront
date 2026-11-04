import { formatLKR } from "@/lib/catalog";
import {
  COD_MIN_DEPOSIT,
  buildWhatsAppCodDepositUrl,
  getCodBalanceDue,
  requiresCodDeposit,
} from "@/lib/cod-deposit";
import { BANK_DETAILS, buildWhatsAppBankSlipUrl } from "@/lib/whatsapp";

export type EmailContent = { subject: string; html: string; text: string };

export type EmailOrder = {
  order_number: string;
  customer_name: string;
  phone: string;
  address?: string | null;
  city?: string | null;
  district?: string | null;
  payment_method: string;
  subtotal: number | string;
  delivery_fee: number | string;
  discount_amount?: number | string | null;
  coupon_code?: string | null;
  total: number | string;
  advance_deposit?: number | string | null;
  refund_amount?: number | string | null;
  bank_slip_reference?: string | null;
  advance_deposit_note?: string | null;
};

export type EmailOrderItem = { product_name: string; quantity: number | string; unit_price: number | string };

const INK = "#1f231e";
const MUTED = "#5b6058";
const GOLD = "#8c6f39";
const PANEL = "#f4efe6";
const LINE = "#e6dfd5";
const IVORY = "#fbf8f2";
const SANS = "-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif";

function escapeHtml(raw: unknown): string {
  return String(raw ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

const firstName = (name: string) => name.trim().split(/\s+/)[0] || "there";

function button(label: string, url: string) {
  return `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:24px 0 8px;"><tr><td style="border-radius:999px;background:${INK};"><a href="${escapeHtml(url)}" style="display:inline-block;padding:14px 28px;font-family:${SANS};font-size:15px;font-weight:600;color:${IVORY};text-decoration:none;border-radius:999px;">${escapeHtml(label)}</a></td></tr></table>`;
}

const paragraph = (html: string) =>
  `<p style="margin:0 0 14px;font-family:${SANS};font-size:15px;line-height:1.6;color:${MUTED};">${html}</p>`;

const panel = (html: string, accent = false) =>
  `<div style="margin:20px 0;padding:18px;background:${PANEL};border-radius:14px;${accent ? `border:1px solid #d4b97c;` : ""}">${html}</div>`;

const panelTitle = (text: string) =>
  `<p style="margin:0 0 10px;font-family:${SANS};font-size:15px;font-weight:700;color:${INK};">${escapeHtml(text)}</p>`;

function row(label: string, value: string, options: { strong?: boolean; tint?: string } = {}) {
  const size = options.strong ? "16px" : "14px";
  const weight = options.strong ? "700" : "400";
  const colour = options.tint ?? INK;
  return `<tr><td style="padding:4px 0;font-family:${SANS};font-size:${size};font-weight:${weight};color:${colour};">${escapeHtml(label)}</td><td style="padding:4px 0 4px 12px;font-family:${SANS};font-size:${size};font-weight:${options.strong ? "700" : "600"};color:${colour};text-align:right;white-space:nowrap;">${escapeHtml(value)}</td></tr>`;
}

const rows = (html: string) =>
  `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;">${html}</table>`;

/** Inline styles and tables, because that is all most email apps reliably support. */
function layout(options: { eyebrow: string; title: string; preview: string; body: string; siteUrl: string }) {
  const { eyebrow, title, preview, body, siteUrl } = options;
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light"><title>${escapeHtml(title)}</title></head>
<body style="margin:0;padding:0;background:#eef1e9;">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;">${escapeHtml(preview)}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#eef1e9;"><tr><td align="center" style="padding:24px 12px;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;">
<tr><td align="center" style="padding:4px 0 18px;"><a href="${escapeHtml(siteUrl)}" style="font-family:Georgia,'Times New Roman',serif;font-size:30px;color:${INK};text-decoration:none;">almera</a><div style="margin-top:2px;font-family:${SANS};font-size:9px;letter-spacing:3px;color:#4f6e5f;text-transform:uppercase;">The Desi Wardrobe</div></td></tr>
<tr><td style="background:${IVORY};border-radius:20px;padding:28px 24px;">
<p style="margin:0 0 8px;font-family:${SANS};font-size:11px;font-weight:600;letter-spacing:2px;color:${GOLD};text-transform:uppercase;">${escapeHtml(eyebrow)}</p>
<h1 style="margin:0 0 16px;font-family:Georgia,'Times New Roman',serif;font-size:27px;font-weight:400;line-height:1.25;color:${INK};">${escapeHtml(title)}</h1>
${body}
</td></tr>
<tr><td align="center" style="padding:18px 12px 4px;font-family:${SANS};font-size:12px;line-height:1.6;color:${MUTED};">almera · Island-wide delivery across Sri Lanka<br><a href="https://www.instagram.com/almera.lk/" style="color:${MUTED};">@almera.lk</a></td></tr>
</table></td></tr></table></body></html>`;
}

const text = (...lines: (string | false | null | undefined)[]) => lines.filter((l) => l !== false && l != null).join("\n");

export function signupConfirmationEmail(input: { name: string; url: string; siteUrl: string }): EmailContent {
  const title = `Welcome, ${firstName(input.name)}`;
  return {
    subject: "Confirm your almera account",
    html: layout({
      eyebrow: "Confirm your email",
      title,
      preview: "One tap to activate your almera account.",
      siteUrl: input.siteUrl,
      body:
        paragraph("Please confirm this email address to activate your account. You'll then be able to follow your orders and check out faster.") +
        button("Confirm my email", input.url) +
        paragraph(`<span style="font-size:13px;">This link works once and expires soon. If you didn't create an almera account, you can ignore this email.</span>`),
    }),
    text: text(title, "", "Confirm your email to activate your almera account:", input.url, "", "This link works once and expires soon. If you didn't create an almera account, you can ignore this email."),
  };
}

export function passwordResetEmail(input: { url: string; siteUrl: string }): EmailContent {
  return {
    subject: "Reset your almera password",
    html: layout({
      eyebrow: "Password reset",
      title: "Set a new password",
      preview: "Use this link to set a new password for your almera account.",
      siteUrl: input.siteUrl,
      body:
        paragraph("We received a request to reset the password for your almera account. Tap below to choose a new one.") +
        button("Reset my password", input.url) +
        paragraph(`<span style="font-size:13px;">This link works once and expires soon. If you didn't ask for this, you can ignore this email and your password won't change.</span>`),
    }),
    text: text("Set a new password", "", "Use this link to reset your almera password:", input.url, "", "This link works once and expires soon. If you didn't ask for this, you can ignore this email and your password won't change."),
  };
}

function itemsTable(items: EmailOrderItem[]) {
  return rows(
    items
      .map(
        (item) =>
          `<tr><td style="padding:10px 0;border-bottom:1px solid ${LINE};font-family:${SANS};font-size:14px;line-height:1.45;color:${INK};">${escapeHtml(item.product_name)}<br><span style="color:${MUTED};font-size:13px;">Qty ${Number(item.quantity)}</span></td><td style="padding:10px 0 10px 12px;border-bottom:1px solid ${LINE};font-family:${SANS};font-size:14px;font-weight:600;color:${INK};text-align:right;vertical-align:top;white-space:nowrap;">${formatLKR(Number(item.unit_price) * Number(item.quantity))}</td></tr>`,
      )
      .join(""),
  );
}

function totals(order: EmailOrder) {
  const discount = Number(order.discount_amount ?? 0);
  const delivery = Number(order.delivery_fee);
  return rows(
    row("Subtotal", formatLKR(Number(order.subtotal))) +
      (discount > 0 ? row(`Discount${order.coupon_code ? ` (${order.coupon_code})` : ""}`, `−${formatLKR(discount)}`, { tint: "#4a6b53" }) : "") +
      row("Delivery", delivery === 0 ? "Free" : formatLKR(delivery)) +
      row("Total", formatLKR(Number(order.total)), { strong: true }),
  );
}

const bankRows = (reference: string) =>
  rows(
    row("Bank", BANK_DETAILS.bankName) +
      row("Account name", BANK_DETAILS.accountName) +
      row("Account number", BANK_DETAILS.accountNumber) +
      row("Branch", BANK_DETAILS.branch) +
      row("Reference", reference),
  );

const bankText = (reference: string) =>
  text(
    `Bank: ${BANK_DETAILS.bankName}`,
    `Account name: ${BANK_DETAILS.accountName}`,
    `Account number: ${BANK_DETAILS.accountNumber}`,
    `Branch: ${BANK_DETAILS.branch}`,
    `Reference: ${reference}`,
  );

function deliveryAddress(order: EmailOrder) {
  return [order.address, order.city, order.district].filter(Boolean).join(", ");
}

export function orderPlacedEmail(input: { order: EmailOrder; items: EmailOrderItem[]; siteUrl: string }): EmailContent {
  const { order, items, siteUrl } = input;
  const total = Number(order.total);
  const number = order.order_number;
  const needsDeposit = requiresCodDeposit(order.payment_method, total);
  const balanceAfterDeposit = Math.max(0, total - COD_MIN_DEPOSIT);

  let paymentHtml: string;
  let paymentText: string;
  if (needsDeposit) {
    const whatsapp = buildWhatsAppCodDepositUrl(number, total, order.customer_name, COD_MIN_DEPOSIT);
    paymentHtml = panel(
      panelTitle(`Action needed: pay ${formatLKR(COD_MIN_DEPOSIT)} advance`) +
        paragraph(`Your order is over Rs. 3,000, so we need a <strong>${formatLKR(COD_MIN_DEPOSIT)} advance</strong> before we can dispatch it. Your order will wait until we receive it.`) +
        rows(row("Pay now by bank transfer", formatLKR(COD_MIN_DEPOSIT), { strong: true }) + row("Pay the courier on delivery", formatLKR(balanceAfterDeposit))) +
        `<div style="height:14px;"></div>` +
        bankRows(number) +
        button("Send my slip on WhatsApp", whatsapp),
      true,
    );
    paymentText = text(
      `ACTION NEEDED: PAY ${formatLKR(COD_MIN_DEPOSIT)} ADVANCE`,
      "Your order is over Rs. 3,000, so we need this advance before we can dispatch it.",
      `Pay now by bank transfer: ${formatLKR(COD_MIN_DEPOSIT)}`,
      `Pay the courier on delivery: ${formatLKR(balanceAfterDeposit)}`,
      "",
      bankText(number),
      "",
      `Send your slip on WhatsApp: ${whatsapp}`,
    );
  } else if (order.payment_method === "bank") {
    const whatsapp = buildWhatsAppBankSlipUrl(number, total, order.customer_name);
    paymentHtml = panel(
      panelTitle(`Action needed: transfer ${formatLKR(total)}`) +
        paragraph("Please transfer the full amount and send us the slip. We'll confirm your order once we receive it.") +
        bankRows(number) +
        button("Send my slip on WhatsApp", whatsapp),
      true,
    );
    paymentText = text(`ACTION NEEDED: TRANSFER ${formatLKR(total)}`, "", bankText(number), "", `Send your slip on WhatsApp: ${whatsapp}`);
  } else if (order.payment_method === "card") {
    paymentHtml = panel(panelTitle("Paid by card") + paragraph(`We've received your payment of <strong>${formatLKR(total)}</strong>. There's nothing more to pay.`));
    paymentText = `Paid by card: ${formatLKR(total)}. There's nothing more to pay.`;
  } else {
    paymentHtml = panel(panelTitle("Cash on delivery") + paragraph(`Please pay the courier <strong>${formatLKR(total)}</strong> when your parcel arrives.`));
    paymentText = `Cash on delivery: please pay the courier ${formatLKR(total)} when your parcel arrives.`;
  }

  const lead = "We've received your order and set your pieces aside. Here is your receipt.";
  return {
    subject: needsDeposit ? `Order ${number}: pay ${formatLKR(COD_MIN_DEPOSIT)} advance to confirm` : `Your almera order ${number}`,
    html: layout({
      eyebrow: `Order ${number}`,
      title: `Thank you, ${firstName(order.customer_name)}`,
      preview: needsDeposit ? `Pay ${formatLKR(COD_MIN_DEPOSIT)} advance to confirm order ${number}.` : `Your receipt for order ${number}.`,
      siteUrl,
      body:
        paragraph(lead) +
        paymentHtml +
        itemsTable(items) +
        `<div style="height:12px;"></div>` +
        totals(order) +
        panel(panelTitle("Delivering to") + paragraph(`${escapeHtml(order.customer_name)}<br>${escapeHtml(deliveryAddress(order))}<br>${escapeHtml(order.phone)}`)) +
        button("Track my order", `${siteUrl}/track-order`),
    }),
    text: text(
      `Thank you, ${firstName(order.customer_name)}`,
      `Order ${number}`,
      "",
      lead,
      "",
      paymentText,
      "",
      ...items.map((item) => `${Number(item.quantity)} x ${item.product_name}: ${formatLKR(Number(item.unit_price) * Number(item.quantity))}`),
      "",
      `Subtotal: ${formatLKR(Number(order.subtotal))}`,
      Number(order.discount_amount ?? 0) > 0 && `Discount: -${formatLKR(Number(order.discount_amount))}`,
      `Delivery: ${Number(order.delivery_fee) === 0 ? "Free" : formatLKR(Number(order.delivery_fee))}`,
      `Total: ${formatLKR(total)}`,
      "",
      `Delivering to: ${order.customer_name}, ${deliveryAddress(order)}, ${order.phone}`,
      "",
      `Track your order: ${siteUrl}/track-order`,
    ),
  };
}

/** Only cash on delivery orders still have money to collect at the door. */
function balanceToPay(order: EmailOrder) {
  return order.payment_method === "cod" ? getCodBalanceDue(order) : 0;
}

export function orderShippedEmail(input: { order: EmailOrder; siteUrl: string }): EmailContent {
  const { order, siteUrl } = input;
  const number = order.order_number;
  const balance = balanceToPay(order);
  const deposit = Number(order.advance_deposit ?? 0);
  const lead = "Your parcel has left us and is with the courier. It should reach you in 2–4 working days.";
  return {
    subject: `Your almera order ${number} is on its way`,
    html: layout({
      eyebrow: `Order ${number}`,
      title: "It's on its way",
      preview: "Your parcel is with the courier and should arrive in 2–4 working days.",
      siteUrl,
      body:
        paragraph(lead) +
        panel(panelTitle("Delivering to") + paragraph(`${escapeHtml(order.customer_name)}<br>${escapeHtml(deliveryAddress(order))}<br>${escapeHtml(order.phone)}`)) +
        (balance > 0
          ? panel(
              panelTitle("Please have this ready") +
                rows(
                  row("Order total", formatLKR(Number(order.total))) +
                    (deposit > 0 ? row("Advance paid", `−${formatLKR(deposit)}`, { tint: "#4a6b53" }) : "") +
                    row("Pay the courier", formatLKR(balance), { strong: true }),
                ),
            )
          : "") +
        button("Track my order", `${siteUrl}/track-order`),
    }),
    text: text(
      `Order ${number} is on its way`,
      "",
      lead,
      "",
      `Delivering to: ${order.customer_name}, ${deliveryAddress(order)}, ${order.phone}`,
      balance > 0 && `Pay the courier: ${formatLKR(balance)}`,
      "",
      `Track your order: ${siteUrl}/track-order`,
    ),
  };
}

export function orderDeliveredEmail(input: { order: EmailOrder; siteUrl: string }): EmailContent {
  const { order, siteUrl } = input;
  const number = order.order_number;
  const lead = "Your parcel has been delivered. We hope you love wearing it as much as we loved putting it together.";
  return {
    subject: `Your almera order ${number} has been delivered`,
    html: layout({
      eyebrow: `Order ${number}`,
      title: "It's arrived",
      preview: "Your almera parcel has been delivered.",
      siteUrl,
      body:
        paragraph(lead) +
        paragraph(`We'd love to see you in it. Tag us on Instagram at <a href="https://www.instagram.com/almera.lk/" style="color:${GOLD};">@almera.lk</a>.`) +
        button("Shop new arrivals", `${siteUrl}/shop`),
    }),
    text: text(`Order ${number} has been delivered`, "", lead, "", `Shop new arrivals: ${siteUrl}/shop`),
  };
}

export function depositReceiptEmail(input: { order: EmailOrder; siteUrl: string }): EmailContent {
  const { order, siteUrl } = input;
  const number = order.order_number;
  const deposit = Number(order.advance_deposit ?? 0);
  const balance = getCodBalanceDue(order);
  const lead = `Thank you, ${firstName(order.customer_name)}. We've received your advance and your order is confirmed for dispatch.`;
  return {
    subject: `We received your advance for order ${number}`,
    html: layout({
      eyebrow: `Receipt · ${number}`,
      title: "Advance received",
      preview: `Your advance of ${formatLKR(deposit)} has been received.`,
      siteUrl,
      body:
        paragraph(escapeHtml(lead)) +
        panel(
          rows(
            row("Order total", formatLKR(Number(order.total))) +
              row("Advance paid", `−${formatLKR(deposit)}`, { tint: "#4a6b53" }) +
              (order.bank_slip_reference ? row("Slip reference", order.bank_slip_reference) : "") +
              row("Pay the courier on delivery", formatLKR(balance), { strong: true }),
          ),
        ),
    }),
    text: text(lead, "", `Order total: ${formatLKR(Number(order.total))}`, `Advance paid: ${formatLKR(deposit)}`, `Pay the courier on delivery: ${formatLKR(balance)}`),
  };
}

const OTHER_STATUS: Record<string, { subject: string; title: string; lead: string }> = {
  confirmed: { subject: "is confirmed", title: "Your order is confirmed", lead: "We've confirmed your order and are preparing it now. We'll email you when it's with the courier." },
  cancelled: { subject: "has been cancelled", title: "Your order was cancelled", lead: "Your order has been cancelled. If this doesn't look right, please reply to this email or message us on WhatsApp." },
  refunded: { subject: "has been refunded", title: "Your refund is on its way", lead: "Your order has been refunded. If you have any questions, please reply to this email or message us on WhatsApp." },
};

/** Returns null for statuses customers aren't told about. */
export function orderStatusEmail(input: { order: EmailOrder; status: string; siteUrl: string }): EmailContent | null {
  const { order, status, siteUrl } = input;
  if (status === "shipped") return orderShippedEmail({ order, siteUrl });
  if (status === "delivered") return orderDeliveredEmail({ order, siteUrl });
  const copy = OTHER_STATUS[status];
  if (!copy) return null;
  return {
    subject: `Your almera order ${order.order_number} ${copy.subject}`,
    html: layout({
      eyebrow: `Order ${order.order_number}`,
      title: copy.title,
      preview: copy.lead,
      siteUrl,
      body: paragraph(copy.lead) + button("Track my order", `${siteUrl}/track-order`),
    }),
    text: text(copy.title, `Order ${order.order_number}`, "", copy.lead),
  };
}

export function adminRefundNeededEmail(input: {
  orderNumber: string;
  paymentId: string;
  reason: string;
  total: number;
  customer: string;
  phone: string;
  email: string;
  siteUrl: string;
}): EmailContent {
  const { orderNumber, paymentId, reason, total, customer, phone, email, siteUrl } = input;
  const lead = "A customer paid after their stock hold expired, and the items sold out before the payment arrived. Please refund them in your Payments.lk dashboard or contact them to arrange a replacement.";
  return {
    subject: `[Action needed] Manual refund for ${orderNumber}`,
    html: layout({
      eyebrow: "Refund needed",
      title: "A customer needs a refund",
      preview: `Manual refund needed for ${orderNumber}.`,
      siteUrl,
      body:
        paragraph(lead) +
        panel(
          rows(
            row("Order", orderNumber) +
              row("Payment ID", paymentId) +
              row("Amount paid", formatLKR(total), { strong: true }) +
              row("Customer", customer) +
              row("Phone", phone) +
              row("Email", email),
          ) + `<div style="height:10px;"></div>` + paragraph(escapeHtml(reason)),
        ),
    }),
    text: text(lead, "", `Order: ${orderNumber}`, `Payment ID: ${paymentId}`, `Amount paid: ${formatLKR(total)}`, `Customer: ${customer}, ${phone}, ${email}`, `Reason: ${reason}`),
  };
}
