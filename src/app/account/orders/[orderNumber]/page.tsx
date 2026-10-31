import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { connection } from "next/server";
import { AccountNav } from "@/components/account-nav";
import { WhatsAppIcon } from "@/components/icons";
import { formatLKR } from "@/lib/catalog";
import {
  COD_DEPOSIT_BANK,
  COD_MIN_DEPOSIT,
  buildWhatsAppCodDepositUrl,
  getCodBalanceDue,
  requiresCodDeposit,
} from "@/lib/cod-deposit";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { BANK_DETAILS, buildWhatsAppBankSlipUrl } from "@/lib/whatsapp";

export const metadata: Metadata = {
  title: "Order Details · almera",
  robots: { index: false },
};

export const instant = false;

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

export default async function AccountOrderDetailPage({
  params,
}: {
  params: Promise<{ orderNumber: string }>;
}) {
  await connection();
  const { orderNumber } = await params;
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/account/login?next=/account/orders/${orderNumber}`);
  }

  const { data: order, error } = await supabase
    .from("orders")
    .select("*, order_items(*)")
    .eq("order_number", orderNumber.toUpperCase())
    .eq("user_id", user.id)
    .maybeSingle();

  if (error || !order) {
    notFound();
  }

  const orderTotal = Number(order.total ?? 0);
  const depositPaid = Number(order.advance_deposit ?? 0);
  const balanceDue = getCodBalanceDue(order);
  const needsCodDeposit = requiresCodDeposit(order.payment_method, orderTotal);
  const stepIndex = getActiveStepIndex(order.status);
  const items = order.order_items ?? [];

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 sm:py-12">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <nav aria-label="Breadcrumb" className="text-xs text-ink/55">
            <Link href="/account" className="hover:text-ink">
              Account
            </Link>{" "}
            <span className="mx-1">/</span>{" "}
            <Link href="/account/orders" className="hover:text-ink">
              Orders
            </Link>{" "}
            <span className="mx-1">/</span> <span>{order.order_number}</span>
          </nav>
          <h1 className="display mt-2 text-3xl sm:text-4xl">order {order.order_number}</h1>
        </div>
        <span className="rounded-full bg-sage-soft px-3.5 py-1 text-xs font-semibold tracking-wider text-ink uppercase">
          {order.status.replace(/_/g, " ")}
        </span>
      </div>

      <AccountNav />

      <div className="mt-8 space-y-6">
        {/* Timeline Stepper */}
        <div className="rounded-2xl border border-line bg-ivory p-6">
          <p className="eyebrow text-gold-deep">Fulfillment Status</p>
          {order.status === "cancelled" || order.status === "refunded" ? (
            <p className="mt-3 text-sm text-[#a5432f]">
              This order has been marked as <strong>{order.status}</strong>.
            </p>
          ) : (
            <ol className="mt-4 grid gap-3 sm:grid-cols-4">
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

        {/* COD Advance Deposit or Bank Slip Notice */}
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
                  Because your Cash on Delivery order is above Rs. 3,000, please transfer a minimum{" "}
                  <strong>{formatLKR(COD_MIN_DEPOSIT)} advance deposit</strong> to confirm dispatch.
                  You will pay the remaining <strong>{formatLKR(Math.max(0, orderTotal - COD_MIN_DEPOSIT))}</strong>{" "}
                  in cash to the courier upon delivery.
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
                    orderTotal,
                    order.customer_name,
                    COD_MIN_DEPOSIT,
                  )}
                  target="_blank"
                  rel="noreferrer"
                  className="btn btn-primary mt-5 inline-flex items-center gap-2"
                >
                  <WhatsAppIcon className="size-4" /> Send {formatLKR(COD_MIN_DEPOSIT)} deposit slip
                  on WhatsApp
                </a>
              </>
            )}
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
              href={buildWhatsAppBankSlipUrl(order.order_number, orderTotal, order.customer_name)}
              target="_blank"
              rel="noreferrer"
              className="btn btn-primary mt-5 inline-flex items-center gap-2"
            >
              <WhatsAppIcon className="size-4" /> Send payment slip on WhatsApp
            </a>
          </div>
        )}

        {/* Pieces & Summary */}
        <div className="rounded-2xl border border-line bg-ivory p-6">
          <h2 className="eyebrow text-ink/60">Pieces in this order</h2>
          <ul className="mt-4 divide-y divide-line">
            {items.map((item: any) => (
              <li key={item.id} className="flex items-center gap-4 py-3">
                {item.image_url && (
                  <span className="relative h-16 w-12 shrink-0 overflow-hidden rounded-lg bg-sage-soft">
                    <Image
                      src={item.image_url}
                      alt=""
                      fill
                      sizes="48px"
                      loading="lazy"
                      className="object-cover"
                    />
                  </span>
                )}
                <div className="min-w-0 flex-1 text-sm">
                  <Link href={`/product/${item.product_slug}`} className="font-medium hover:underline">
                    {item.quantity} × {item.product_name}
                  </Link>
                  <p className="text-xs text-ink/60 capitalize">
                    {item.stitching}
                    {item.size && item.size !== "-" ? ` · Size ${item.size}` : ""}
                  </p>
                </div>
                <span className="text-sm font-semibold tabular-nums">
                  {formatLKR(Number(item.unit_price) * Number(item.quantity))}
                </span>
              </li>
            ))}
          </ul>

          <div className="mt-5 space-y-1.5 border-t border-line pt-4 text-sm">
            <div className="flex justify-between text-ink/70">
              <span>Subtotal</span>
              <span>{formatLKR(Number(order.subtotal))}</span>
            </div>
            {Number(order.discount_amount ?? 0) > 0 && (
              <div className="flex justify-between text-sage-deep">
                <span>Discount ({order.coupon_code})</span>
                <span>−{formatLKR(Number(order.discount_amount))}</span>
              </div>
            )}
            <div className="flex justify-between text-ink/70">
              <span>Delivery</span>
              <span>{Number(order.delivery_fee) === 0 ? "Free" : formatLKR(Number(order.delivery_fee))}</span>
            </div>
            <div className="flex justify-between pt-2 text-base font-semibold">
              <span>Order Total</span>
              <span>{formatLKR(orderTotal)}</span>
            </div>
            {depositPaid > 0 && (
              <div className="flex justify-between text-sage-deep">
                <span>Advance Deposit Paid</span>
                <span>−{formatLKR(depositPaid)}</span>
              </div>
            )}
            {order.payment_method === "cod" && (
              <div className="flex justify-between border-t border-line pt-2 font-semibold text-gold-deep">
                <span>Balance Due on Delivery</span>
                <span>{formatLKR(balanceDue)}</span>
              </div>
            )}
          </div>
        </div>

        {/* Shipping Address */}
        <div className="rounded-2xl border border-line bg-ivory p-6 text-sm">
          <h2 className="eyebrow text-ink/60">Delivery Address</h2>
          <div className="mt-3 text-xs leading-relaxed text-ink/80">
            <p className="font-semibold text-ink">{order.customer_name}</p>
            <p>{order.address}</p>
            <p>
              {order.city}, {order.district} {order.postal_code || ""}
            </p>
            <p className="mt-1">Phone: {order.phone}</p>
            {order.notes && (
              <p className="mt-2 rounded-lg bg-mist p-2.5">
                <strong>Delivery Note:</strong> {order.notes}
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

