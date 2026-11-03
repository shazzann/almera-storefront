"use client";

import { OrderItemPhoto } from "@/components/order-item-photo";
import Link from "next/link";
import { useState, type FormEvent } from "react";
import { lookupOrderAction, type TrackedOrderResult } from "@/actions/orders";
import { formatLKR } from "@/lib/catalog";
import {
  COD_DEPOSIT_BANK,
  COD_MIN_DEPOSIT,
  buildWhatsAppCodDepositUrl,
  getCodBalanceDue,
  requiresCodDeposit,
} from "@/lib/cod-deposit";
import { BANK_DETAILS, buildWhatsAppBankSlipUrl } from "@/lib/whatsapp";
import { WardrobeMark } from "./brand";
import { WhatsAppIcon } from "./icons";

const TIMELINE_STEPS = [
  { key: "placed", label: "Order placed" },
  { key: "confirmed", label: "Confirmed & preparing" },
  { key: "shipped", label: "Dispatched with courier" },
  { key: "delivered", label: "Delivered" },
] as const;

function getActiveStepIndex(status: string): number {
  switch (status) {
    case "delivered":
      return 3;
    case "shipped":
      return 2;
    case "confirmed":
      return 1;
    default:
      return 0;
  }
}

export function TrackOrderView() {
  const [orderNumber, setOrderNumber] = useState("");
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [order, setOrder] = useState<TrackedOrderResult | null>(null);
  const [searched, setSearched] = useState(false);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    setSearched(false);
    try {
      const res = await lookupOrderAction({ orderNumber, phone });
      setOrder(res);
      setSearched(true);
    } catch (err) {
      setOrder(null);
      setError(err instanceof Error ? err.message : "Could not look up your order.");
    } finally {
      setLoading(false);
    }
  };

  const needsCodDeposit = order
    ? requiresCodDeposit(order.payment_method, order.total)
    : false;
  const depositPaid = Number(order?.advance_deposit ?? 0);
  const balanceDue = order ? getCodBalanceDue(order) : 0;
  const stepIndex = order ? getActiveStepIndex(order.status) : 0;

  return (
    <div className="mx-auto max-w-2xl px-4 py-12 sm:px-6 sm:py-16">
      <div className="text-center">
        <WardrobeMark className="mx-auto h-16 w-auto text-gold" />
        <p className="eyebrow mt-5 text-gold-deep">Order Status</p>
        <h1 className="display mt-2 text-4xl sm:text-6xl">
          track your <em className="text-sage-deep">order</em>
        </h1>
        <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-ink/70">
          Enter your order number (e.g. <strong>ALM-10001</strong>) and the Sri Lankan mobile
          number used at checkout.
        </p>
      </div>

      <form
        onSubmit={onSubmit}
        className="mt-8 rounded-2xl border border-line bg-ivory p-5 sm:p-6"
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block">
            <span className="mb-1.5 block text-xs font-semibold tracking-wider text-ink/65 uppercase">
              Order Number
            </span>
            <input
              type="text"
              required
              placeholder="ALM-10001"
              value={orderNumber}
              onChange={(e) => setOrderNumber(e.target.value.toUpperCase())}
              className="field font-mono uppercase"
            />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-xs font-semibold tracking-wider text-ink/65 uppercase">
              Mobile Number
            </span>
            <input
              type="tel"
              required
              placeholder="077 123 4567"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="field"
            />
          </label>
        </div>
        {error && (
          <p role="alert" className="mt-3 text-sm font-medium text-bark">
            {error}
          </p>
        )}
        <button
          type="submit"
          disabled={loading}
          className="btn btn-primary mt-5 w-full disabled:opacity-60"
        >
          {loading ? "Checking wardrobe…" : "Track order"}
        </button>
      </form>

      {searched && !order && !error && (
        <div className="mt-8 rounded-2xl bg-ivory p-8 text-center">
          <p className="display text-3xl">no matching order found</p>
          <p className="mt-2 text-sm text-ink/65">
            Please double-check your order number and mobile number, or message us on WhatsApp if
            you need help.
          </p>
        </div>
      )}

      {order && (
        <div className="mt-8 space-y-6">
          {/* Status Card & Stepper */}
          <div className="rounded-2xl border border-line bg-ivory p-6">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line pb-4">
              <div>
                <p className="eyebrow text-gold-deep">Order {order.order_number}</p>
                <p className="mt-1 text-lg font-semibold">{order.customer_name}</p>
                <p className="text-xs text-ink/60">
                  Placed on{" "}
                  {new Date(order.created_at).toLocaleDateString("en-LK", {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                  })}{" "}
                  · Delivering to {order.city}, {order.district}
                </p>
              </div>
              <span className="rounded-full bg-sage-soft px-3.5 py-1.5 text-xs font-semibold tracking-wider text-ink uppercase">
                {order.status.replace(/_/g, " ")}
              </span>
            </div>

            {order.status === "cancelled" || order.status === "refunded" ? (
              <p className="mt-4 text-sm text-bark">
                This order has been marked as <strong>{order.status}</strong>.
              </p>
            ) : (
              <ol className="mt-6 grid gap-3 sm:grid-cols-4">
                {TIMELINE_STEPS.map((step, idx) => {
                  const done = idx <= stepIndex;
                  return (
                    <li
                      key={step.key}
                      className={`rounded-xl border p-3 text-xs ${
                        done
                          ? "border-gold bg-mist font-semibold text-ink"
                          : "border-line text-ink/45"
                      }`}
                    >
                      <span className="block text-[0.65rem] tracking-widest text-gold-deep uppercase">
                        Step {idx + 1}
                      </span>
                      <span className="mt-1 block">{step.label}</span>
                    </li>
                  );
                })}
              </ol>
            )}
          </div>

          {/* COD Advance Deposit Status or Bank Slip Instructions */}
          {needsCodDeposit && (
            <div className="rounded-2xl border border-gold/50 bg-ivory p-6">
              {depositPaid >= COD_MIN_DEPOSIT ? (
                <>
                  <p className="eyebrow text-sage-deep">Advance Deposit Recorded</p>
                  <p className="mt-2 text-sm leading-relaxed text-ink/75">
                    We have received your{" "}
                    <strong className="text-sage-deep">{formatLKR(depositPaid)}</strong> advance
                    deposit. Your remaining balance to pay the courier on delivery is{" "}
                    <strong>{formatLKR(balanceDue)}</strong>.
                  </p>
                </>
              ) : (
                <>
                  <p className="eyebrow text-gold-deep">
                    Advance Deposit Required (Min. {formatLKR(COD_MIN_DEPOSIT)})
                  </p>
                  <p className="mt-2 text-sm leading-relaxed text-ink/75">
                    Because your Cash on Delivery order is above Rs. 3,000, please transfer a
                    minimum <strong>{formatLKR(COD_MIN_DEPOSIT)} advance deposit</strong> to confirm
                    dispatch. You’ll pay the remaining{" "}
                    <strong>{formatLKR(Math.max(0, order.total - COD_MIN_DEPOSIT))}</strong> to the
                    courier on delivery.
                  </p>
                  <dl className="mt-4 grid grid-cols-[auto_1fr] gap-x-5 gap-y-1 text-sm">
                    <dt className="text-ink/60">Bank</dt>
                    <dd className="font-semibold">{COD_DEPOSIT_BANK.bank}</dd>
                    <dt className="text-ink/60">Account name</dt>
                    <dd className="font-semibold">{COD_DEPOSIT_BANK.accountName}</dd>
                    <dt className="text-ink/60">Account number</dt>
                    <dd className="font-mono font-semibold">{COD_DEPOSIT_BANK.accountNumber}</dd>
                    <dt className="text-ink/60">Reference</dt>
                    <dd className="font-mono font-semibold">{order.order_number}</dd>
                  </dl>
                  <a
                    href={buildWhatsAppCodDepositUrl(
                      order.order_number,
                      order.total,
                      order.customer_name,
                      COD_MIN_DEPOSIT,
                    )}
                    target="_blank"
                    rel="noreferrer"
                    className="btn btn-primary mt-5 w-full sm:w-auto"
                  >
                    <WhatsAppIcon className="size-4" /> Send {formatLKR(COD_MIN_DEPOSIT)} deposit
                    slip on WhatsApp
                  </a>
                </>
              )}
            </div>
          )}

          {order.payment_method === "card" && order.status === "payment_pending" && (
            <div className="rounded-2xl border border-gold/50 bg-ivory p-6">
              <p className="eyebrow text-gold-deep">Online Card Payment Pending</p>
              <p className="mt-2 text-sm leading-relaxed text-ink/75">
                We are awaiting payment confirmation from Payments.lk. If you just completed your payment, please allow a moment for the status to refresh automatically.
              </p>
            </div>
          )}

          {order.payment_method === "bank" && order.status === "awaiting_bank_slip" && (
            <div className="rounded-2xl border border-gold/40 bg-ivory p-6">
              <p className="eyebrow text-gold-deep">Bank Transfer Details</p>
              <dl className="mt-3 grid grid-cols-[auto_1fr] gap-x-5 gap-y-1 text-sm">
                <dt className="text-ink/60">Bank</dt>
                <dd className="font-semibold">{BANK_DETAILS.bankName}</dd>
                <dt className="text-ink/60">Account name</dt>
                <dd className="font-semibold">{BANK_DETAILS.accountName}</dd>
                <dt className="text-ink/60">Account number</dt>
                <dd className="font-mono font-semibold">{BANK_DETAILS.accountNumber}</dd>
                <dt className="text-ink/60">Reference</dt>
                <dd className="font-mono font-semibold">{order.order_number}</dd>
              </dl>
              <a
                href={buildWhatsAppBankSlipUrl(
                  order.order_number,
                  order.total,
                  order.customer_name,
                )}
                target="_blank"
                rel="noreferrer"
                className="btn btn-primary mt-5 w-full sm:w-auto"
              >
                <WhatsAppIcon className="size-4" /> Send payment slip on WhatsApp
              </a>
            </div>
          )}

          {/* Items & Payment Breakdown */}
          <div className="rounded-2xl border border-line bg-ivory p-6">
            <h2 className="eyebrow text-ink/60">Pieces in your order</h2>
            <ul className="mt-4 divide-y divide-line">
              {order.items.map((item) => (
                <li key={item.id} className="flex items-center gap-4 py-3">
                  <span className="relative h-16 w-12 shrink-0 overflow-hidden rounded-lg bg-sage-soft">
                    <OrderItemPhoto src={item.image_url} alt={item.product_name || ""} sizes="48px" compact />
                  </span>
                  <div className="min-w-0 flex-1 text-sm">
                    <Link
                      href={`/product/${item.product_slug}`}
                      className="font-medium hover:underline"
                    >
                      {item.quantity} × {item.product_name}
                    </Link>
                    <p className="text-xs text-ink/60 capitalize">
                      {item.stitching}
                      {item.size && item.size !== "-" ? ` · Size ${item.size}` : ""}
                    </p>
                  </div>
                  <span className="text-sm font-semibold">
                    {formatLKR(item.unit_price * item.quantity)}
                  </span>
                </li>
              ))}
            </ul>
            <div className="mt-4 space-y-1.5 border-t border-line pt-4 text-sm">
              <div className="flex justify-between text-ink/70">
                <span>Subtotal</span>
                <span>{formatLKR(order.subtotal)}</span>
              </div>
              {order.discount_amount > 0 && (
                <div className="flex justify-between text-sage-deep">
                  <span>Discount ({order.coupon_code})</span>
                  <span>−{formatLKR(order.discount_amount)}</span>
                </div>
              )}
              <div className="flex justify-between text-ink/70">
                <span>Delivery</span>
                <span>
                  {order.delivery_fee === 0 ? "Free" : formatLKR(order.delivery_fee)}
                </span>
              </div>
              <div className="flex justify-between pt-2 text-base font-semibold">
                <span>Order Total</span>
                <span>{formatLKR(order.total)}</span>
              </div>
              {depositPaid > 0 && (
                <div className="flex justify-between text-sage-deep">
                  <span>Advance Deposit Paid</span>
                  <span>−{formatLKR(depositPaid)}</span>
                </div>
              )}
              {order.payment_method === "cod" && (
                <div className="flex justify-between border-t border-line pt-2 font-semibold text-gold-deep">
                  <span>Balance to Pay Courier on Delivery</span>
                  <span>{formatLKR(balanceDue)}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

