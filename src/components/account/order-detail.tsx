"use client";

import Image from "@/components/image";
import Link from "next/link";
import { CopyIcon } from "@/components/admin/admin-icons";
import { CheckIcon, ChevronIcon, WhatsAppIcon } from "@/components/icons";
import { formatLKR } from "@/lib/catalog";
import { COD_MIN_DEPOSIT, getCodBalanceDue } from "@/lib/cod-deposit";
import { BANK_DETAILS, buildWhatsAppBankSlipUrl, buildWhatsAppCodDepositUrl } from "@/lib/whatsapp";
import { useAccount } from "./context";
import { StatusBadge } from "./order-card";
import { ORDER_STEPS, currentStep, formatDate, num, paymentNeeded, statusOf } from "./order-status";
import type { AccountOrder } from "./types";

const PAYMENT_LABEL: Record<string, string> = { cod: "Cash on delivery", bank: "Bank transfer", card: "Card" };
const WHATSAPP = (process.env.NEXT_PUBLIC_WHATSAPP_NUMBER ?? "94771234567").replace(/\D/g, "");

const cardClass = "rounded-[1.25rem] border border-line bg-ivory p-4";

export function OrderDetailScreen({ order }: { order: AccountOrder }) {
  const { base } = useAccount();
  const help = `https://wa.me/${WHATSAPP}?text=${encodeURIComponent(`Hi almera, I have a question about my order ${order.order_number}.`)}`;

  return (
    <>
      <div className="flex items-center gap-1 px-2 pt-3 lg:px-0 lg:pt-0">
        <Link href={`${base}/orders`} aria-label="Back to orders" className="grid size-12 shrink-0 place-items-center rounded-full">
          <ChevronIcon className="size-6 rotate-180" />
        </Link>
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-lg leading-tight font-semibold tabular-nums">{order.order_number}</h1>
          <p className="text-[0.85rem] text-ink/60">Placed {formatDate(order.created_at)}</p>
        </div>
        <span className="pr-2"><StatusBadge status={order.status} /></span>
      </div>

      <div className="mt-2 space-y-3 px-4 lg:px-0">
        <Journey order={order} />
        <PaymentAction order={order} />

        <section className={`${cardClass} !p-0 divide-y divide-line`}>
          {order.order_items.map((it) => (
            <Link key={it.id} href={`/product/${it.product_slug}`} className="flex gap-3 p-3.5">
              <span className="arch-soft relative h-20 w-16 shrink-0 overflow-hidden bg-sage-soft">
                <Image src={it.image_url || "/placeholder.svg"} alt={it.product_name || ""} fill sizes="64px" className="object-cover" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block leading-snug font-medium">{it.product_name}</span>
                <span className="mt-1 block text-[0.88rem] text-ink/60 tabular-nums">Qty {num(it.quantity)}</span>
              </span>
              <span className="font-semibold tabular-nums">{formatLKR(num(it.unit_price) * num(it.quantity))}</span>
            </Link>
          ))}
        </section>

        <section className={cardClass}>
          <div className="flex items-center justify-between gap-3">
            <h2 className="font-semibold">Payment</h2>
            <span className="text-[0.9rem] text-ink/65">{PAYMENT_LABEL[order.payment_method] ?? order.payment_method}</span>
          </div>
          <dl className="mt-3 space-y-1.5 text-[0.95rem] tabular-nums">
            <Row label="Subtotal" value={formatLKR(num(order.subtotal))} />
            {num(order.discount_amount) > 0 && <Row label={`Discount${order.coupon_code ? ` (${order.coupon_code})` : ""}`} value={`−${formatLKR(num(order.discount_amount))}`} />}
            <Row label="Delivery" value={num(order.delivery_fee) === 0 ? "Free" : formatLKR(num(order.delivery_fee))} />
            <Row label="Total" value={formatLKR(num(order.total))} strong />
            {num(order.advance_deposit) > 0 && <Row label="Deposit paid" value={`−${formatLKR(num(order.advance_deposit))}`} />}
            {num(order.refund_amount) > 0 && <Row label="Refunded" value={`−${formatLKR(num(order.refund_amount))}`} />}
          </dl>
          {order.payment_method === "cod" && !["cancelled", "refunded"].includes(order.status) && (
            <div className="mt-3 flex items-center justify-between rounded-xl bg-sage-soft/60 px-3.5 py-3">
              <span className="font-medium">To pay on delivery</span>
              <span className="text-lg font-semibold tabular-nums">{formatLKR(getCodBalanceDue(order))}</span>
            </div>
          )}
        </section>

        <section className={cardClass}>
          <h2 className="font-semibold">Delivering to</h2>
          <p className="mt-2 font-medium">{order.customer_name}</p>
          <p className="mt-0.5 leading-snug text-ink/70">{order.address}, {order.city}, {order.district} {order.postal_code ?? ""}</p>
          <p className="mt-0.5 text-ink/70 tabular-nums">{order.phone}</p>
          {order.notes && <p className="mt-3 rounded-xl bg-mist px-3.5 py-2.5 text-[0.92rem] leading-snug"><strong className="font-semibold">Note:</strong> {order.notes}</p>}
        </section>

        <a href={help} target="_blank" rel="noreferrer" className="flex min-h-14 items-center justify-center gap-2.5 rounded-[1.25rem] border border-line bg-ivory font-medium">
          <WhatsAppIcon className="size-5" /> Ask about this order
        </a>
      </div>
    </>
  );
}

function Journey({ order }: { order: AccountOrder }) {
  const step = currentStep(order.status);
  const { note } = statusOf(order.status);

  return (
    <section className={cardClass}>
      {note && <p className="leading-snug text-ink/75">{note}</p>}
      {step !== null && (
        <ol className="mt-4">
          {ORDER_STEPS.map((label, i) => {
            const done = i < step || (i === step && i === ORDER_STEPS.length - 1);
            const current = i === step && !done;
            return (
              <li key={label} className="relative flex min-h-11 gap-3" aria-current={current ? "step" : undefined}>
                {i < ORDER_STEPS.length - 1 && <span aria-hidden className={`absolute top-6 bottom-0 left-[0.6875rem] w-0.5 ${i < step ? "bg-sage-deep" : "bg-ink/10"}`} />}
                <span className={`relative grid size-6 shrink-0 place-items-center rounded-full ${done ? "bg-sage-deep text-ivory" : current ? "bg-gold text-ivory" : "bg-ink/10"}`}>
                  {done && <CheckIcon className="size-3.5" />}
                  {current && <span className="size-2 rounded-full bg-ivory" />}
                </span>
                <span className={`pt-0.5 ${done || current ? "font-medium" : "text-ink/50"}`}>{label}</span>
              </li>
            );
          })}
        </ol>
      )}
    </section>
  );
}

function PaymentAction({ order }: { order: AccountOrder }) {
  const need = paymentNeeded(order);
  if (!need) return null;

  const total = num(order.total);
  const deposit = need === "deposit";
  const slipUrl = deposit
    ? buildWhatsAppCodDepositUrl(order.order_number, total, order.customer_name, COD_MIN_DEPOSIT)
    : buildWhatsAppBankSlipUrl(order.order_number, total, order.customer_name);

  return (
    <section className="rounded-[1.25rem] border border-gold/50 bg-gold/10 p-4">
      <h2 className="font-semibold">{deposit ? `Send a ${formatLKR(COD_MIN_DEPOSIT)} deposit` : `Transfer ${formatLKR(total)}`}</h2>
      <p className="mt-1 text-[0.92rem] leading-snug text-ink/75">
        {deposit
          ? `This confirms your order. You pay the remaining ${formatLKR(Math.max(0, total - COD_MIN_DEPOSIT))} to the courier.`
          : "Then send us the slip, and we’ll start preparing your order."}
      </p>
      <dl className="mt-3 divide-y divide-line rounded-xl bg-ivory px-3.5">
        <CopyRow label="Bank" value={BANK_DETAILS.bankName} />
        <CopyRow label="Account name" value={BANK_DETAILS.accountName} />
        <CopyRow label="Account number" value={BANK_DETAILS.accountNumber} copy />
        <CopyRow label="Reference" value={order.order_number} copy />
      </dl>
      <a href={slipUrl} target="_blank" rel="noreferrer" className="btn btn-primary mt-3 w-full text-[0.8rem]">
        <WhatsAppIcon className="size-4" /> Send slip on WhatsApp
      </a>
    </section>
  );
}

function CopyRow({ label, value, copy }: { label: string; value: string; copy?: boolean }) {
  const { toast } = useAccount();

  async function copyValue() {
    try {
      await navigator.clipboard.writeText(value);
      toast(`${label} copied`);
    } catch {
      toast("Couldn’t copy on this phone. Press and hold the text instead.", "err");
    }
  }

  return (
    <div className="flex min-h-14 items-center justify-between gap-3 py-2">
      <div className="min-w-0">
        <dt className="text-[0.8rem] text-ink/60">{label}</dt>
        <dd className="font-medium break-words tabular-nums">{value}</dd>
      </div>
      {copy && (
        <button type="button" onClick={copyValue} aria-label={`Copy ${label.toLowerCase()}`} className="grid size-11 shrink-0 place-items-center rounded-full bg-mist">
          <CopyIcon className="size-5" />
        </button>
      )}
    </div>
  );
}

function Row({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className={`flex justify-between gap-4 ${strong ? "border-t border-line pt-1.5 font-semibold" : ""}`}>
      <dt className={strong ? "" : "text-ink/65"}>{label}</dt>
      <dd>{value}</dd>
    </div>
  );
}
