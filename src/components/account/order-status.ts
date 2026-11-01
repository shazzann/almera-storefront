import { COD_MIN_DEPOSIT, requiresCodDeposit } from "@/lib/cod-deposit";
import type { AccountOrder } from "./types";

export const num = (v: unknown) => Number(v ?? 0) || 0;

const TONE = {
  waiting: "bg-gold/15 text-gold-deep",
  moving: "bg-sage-soft text-sage-deep",
  done: "bg-ink text-ivory",
  stopped: "bg-[#a5432f]/10 text-[#a5432f]",
};

export const ORDER_STATUS: Record<string, { label: string; tone: string; note: string }> = {
  pending: { label: "Order received", tone: TONE.moving, note: "We’ve got your order and will confirm it soon." },
  awaiting_bank_slip: { label: "Waiting for payment", tone: TONE.waiting, note: "Send your payment slip so we can start preparing your order." },
  payment_pending: { label: "Payment not finished", tone: TONE.waiting, note: "Your card payment wasn’t completed. Your pieces are held for a short time." },
  payment_processing: { label: "Checking payment", tone: TONE.waiting, note: "We’re confirming your card payment with the bank." },
  paid: { label: "Paid", tone: TONE.moving, note: "Your payment is in. We’ll start preparing your order soon." },
  confirmed: { label: "Being prepared", tone: TONE.moving, note: "We’re preparing your pieces for dispatch." },
  shipped: { label: "On the way", tone: TONE.moving, note: "Your order is with the courier." },
  delivered: { label: "Delivered", tone: TONE.done, note: "Your order has arrived. Enjoy wearing it." },
  cancelled: { label: "Cancelled", tone: TONE.stopped, note: "This order was cancelled." },
  processing_failed: { label: "Payment failed", tone: TONE.stopped, note: "Your payment didn’t go through, so this order wasn’t placed." },
  partially_refunded: { label: "Partly refunded", tone: TONE.done, note: "Part of this order has been refunded." },
  refunded: { label: "Refunded", tone: TONE.stopped, note: "This order has been refunded." },
};

export const statusOf = (status: string) =>
  ORDER_STATUS[status] ?? { label: status.replace(/_/g, " "), tone: "bg-mist text-ink/65", note: "" };

export const ORDER_STEPS = ["Placed", "Preparing", "On the way", "Delivered"];

const STOPPED = ["cancelled", "processing_failed", "refunded", "partially_refunded"];

/** Null for orders that have left the normal journey. */
export function currentStep(status: string) {
  if (STOPPED.includes(status)) return null;
  if (status === "delivered") return 3;
  if (status === "shipped") return 2;
  if (status === "confirmed" || status === "paid") return 1;
  return 0;
}

export const isActiveOrder = (o: AccountOrder) => o.status !== "delivered" && !STOPPED.includes(o.status);

/** What the customer needs to do next, if anything. */
export function paymentNeeded(o: AccountOrder): "deposit" | "bank" | null {
  if (o.payment_method === "bank" && o.status === "awaiting_bank_slip") return "bank";
  const waiting = o.status === "pending" || o.status === "awaiting_bank_slip";
  if (waiting && requiresCodDeposit(o.payment_method, num(o.total)) && num(o.advance_deposit) < COD_MIN_DEPOSIT) return "deposit";
  return null;
}

const dateFormat = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "Asia/Colombo" });
export const formatDate = (iso: string) => dateFormat.format(new Date(iso));

export const pieceCount = (o: AccountOrder) => o.order_items.reduce((sum, it) => sum + num(it.quantity), 0);
