"use client";

import Link from "next/link";
import { useSyncExternalStore } from "react";
import { DELIVERY, formatLKR } from "@/lib/catalog";
import {
  COD_DEPOSIT_BANK,
  COD_MIN_DEPOSIT,
  buildWhatsAppCodDepositUrl,
  requiresCodDeposit,
} from "@/lib/cod-deposit";
import { BANK_DETAILS, buildWhatsAppBankSlipUrl } from "@/lib/whatsapp";
import { WardrobeMark } from "./brand";
import type { PlacedOrder } from "./checkout-form";
import { WhatsAppIcon } from "./icons";

const read = () => {
  try {
    return sessionStorage.getItem("almera.lastOrder");
  } catch {
    return null;
  }
};

export function OrderConfirmation() {
  const raw = useSyncExternalStore(() => () => {}, read, () => undefined);
  if (raw === undefined) return <div className="min-h-[60vh]" />;
  const order: PlacedOrder | null = raw ? JSON.parse(raw) : null;

  if (!order) {
    return (
      <div className="mx-auto max-w-md px-6 py-24 text-center">
        <h1 className="display text-4xl">no recent order</h1>
        <p className="mt-3 text-ink/65">Orders you place in this browser will show up here.</p>
        <Link href="/shop" className="btn btn-primary mt-8">
          Shop new arrivals
        </Link>
      </div>
    );
  }

  const first = order.name.split(" ")[0];
  const needsCodDeposit = requiresCodDeposit(order.payment, order.total);
  const codRemainingBalance = Math.max(0, order.total - COD_MIN_DEPOSIT);
  const waSlipUrl = buildWhatsAppBankSlipUrl(order.number, order.total, order.name);
  const waCodDepositUrl = buildWhatsAppCodDepositUrl(
    order.number,
    order.total,
    order.name,
    COD_MIN_DEPOSIT,
  );

  const steps = [
    {
      title: "We’ll confirm with you",
      body: `Expect a call or WhatsApp on ${order.phone} within one working day.`,
    },
    order.payment === "bank"
      ? {
          title: "Send your payment slip",
          body: "Transfer to our bank account below and share your slip on WhatsApp so we can dispatch your parcel.",
        }
      : needsCodDeposit
        ? {
            title: `Send your ${formatLKR(COD_MIN_DEPOSIT)} advance deposit slip`,
            body: `Transfer a minimum ${formatLKR(COD_MIN_DEPOSIT)} commitment deposit to our bank account below and share the slip on WhatsApp. You’ll pay the remaining ${formatLKR(codRemainingBalance)} in cash to the courier on delivery.`,
          }
        : {
            title: "Keep cash ready",
            body: `Pay ${formatLKR(order.total)} to the courier when your parcel arrives.`,
          },
    {
      title: "Your parcel is on its way",
      body: `${DELIVERY.standard.label} to ${order.district}: ${DELIVERY.standard.eta.toLowerCase()}.`,
    },
  ];

  return (
    <div className="mx-auto max-w-2xl px-4 py-14 sm:px-6 sm:py-20">
      <div className="text-center">
        <WardrobeMark className="mx-auto h-24 w-auto animate-rise text-gold" />
        <p className="eyebrow mt-8 text-gold-deep">Order {order.number}</p>
        <h1 className="display mt-3 text-5xl sm:text-6xl">
          thank you, <em className="text-sage-deep">{first.toLowerCase()}</em>
        </h1>
        <p className="mx-auto mt-4 max-w-md leading-relaxed text-ink/70">
          Your order has been placed. We’re setting it aside in the wardrobe for you now.
        </p>
      </div>

      {order.payment === "bank" && (
        <div className="mt-10 rounded-2xl border border-gold/40 bg-ivory p-6">
          <p className="eyebrow text-gold-deep">Bank transfer instructions</p>
          <dl className="mt-3 grid grid-cols-[auto_1fr] gap-x-5 gap-y-1.5 text-sm">
            <dt className="text-ink/60">Bank</dt>
            <dd className="font-semibold">{BANK_DETAILS.bankName}</dd>
            <dt className="text-ink/60">Account name</dt>
            <dd className="font-semibold">{BANK_DETAILS.accountName}</dd>
            <dt className="text-ink/60">Account number</dt>
            <dd className="font-mono font-semibold">{BANK_DETAILS.accountNumber}</dd>
            <dt className="text-ink/60">Branch</dt>
            <dd className="font-semibold">{BANK_DETAILS.branch}</dd>
            <dt className="text-ink/60">Reference</dt>
            <dd className="font-mono font-semibold">{order.number}</dd>
          </dl>
          <a
            href={waSlipUrl}
            target="_blank"
            rel="noreferrer"
            className="btn btn-primary mt-5 w-full sm:w-auto"
          >
            <WhatsAppIcon className="size-4" /> Send payment slip on WhatsApp
          </a>
        </div>
      )}

      {needsCodDeposit && (
        <div className="mt-10 rounded-2xl border border-gold/50 bg-ivory p-6">
          <p className="eyebrow text-gold-deep">
            COD Advance Deposit Instructions (Min. {formatLKR(COD_MIN_DEPOSIT)})
          </p>
          <p className="mt-2 text-sm leading-relaxed text-ink/75">
            Because your Cash on Delivery order is above Rs. 3,000, please transfer a minimum{" "}
            <strong>{formatLKR(COD_MIN_DEPOSIT)} advance commitment deposit</strong> to confirm
            dispatch. The remaining{" "}
            <strong className="text-sage-deep">{formatLKR(codRemainingBalance)}</strong> will be
            collected in cash by the courier upon delivery.
          </p>
          <dl className="mt-4 grid grid-cols-[auto_1fr] gap-x-5 gap-y-1.5 text-sm">
            <dt className="text-ink/60">Bank</dt>
            <dd className="font-semibold">{COD_DEPOSIT_BANK.bank}</dd>
            <dt className="text-ink/60">Account name</dt>
            <dd className="font-semibold">{COD_DEPOSIT_BANK.accountName}</dd>
            <dt className="text-ink/60">Account number</dt>
            <dd className="font-mono font-semibold">{COD_DEPOSIT_BANK.accountNumber}</dd>
            <dt className="text-ink/60">Branch</dt>
            <dd className="font-semibold">{COD_DEPOSIT_BANK.branch}</dd>
            <dt className="text-ink/60">Reference</dt>
            <dd className="font-mono font-semibold">{order.number}</dd>
            <dt className="text-ink/60">Minimum deposit now</dt>
            <dd className="font-semibold text-gold-deep">{formatLKR(COD_MIN_DEPOSIT)}</dd>
            <dt className="text-ink/60">Balance on delivery</dt>
            <dd className="font-semibold text-sage-deep">{formatLKR(codRemainingBalance)}</dd>
          </dl>
          <a
            href={waCodDepositUrl}
            target="_blank"
            rel="noreferrer"
            className="btn btn-primary mt-5 w-full sm:w-auto"
          >
            <WhatsAppIcon className="size-4" /> Send {formatLKR(COD_MIN_DEPOSIT)} deposit slip on
            WhatsApp
          </a>
        </div>
      )}

      <ol className="mt-10 space-y-3">
        {steps.map((s, i) => (
          <li key={s.title} className="flex gap-4 rounded-2xl bg-ivory p-5">
            <span className="display text-3xl text-gold">{i + 1}</span>
            <span>
              <span className="block font-semibold">{s.title}</span>
              <span className="mt-1 block text-sm leading-relaxed text-ink/65">{s.body}</span>
            </span>
          </li>
        ))}
      </ol>

      <div className="mt-8 rounded-2xl border border-line p-5">
        <h2 className="eyebrow text-ink/55">Your order</h2>
        <ul className="mt-3 space-y-2 text-sm">
          {order.lines.map((l) => (
            <li key={l.key} className="flex justify-between gap-4">
              <span>
                {l.qty} × {l.name ?? l.slug}{" "}
                <span className="text-ink/55 capitalize">
                  ({l.stitching}
                  {l.size && `, ${l.size}`})
                </span>
              </span>
            </li>
          ))}
        </ul>
        <div className="mt-4 space-y-1 border-t border-line pt-3 text-sm">
          <p>
            Delivering to {order.address}, {order.district}
          </p>
          {order.discountAmount != null && order.discountAmount > 0 && (
            <p className="text-sage-deep">
              Discount ({order.couponCode}): −{formatLKR(order.discountAmount)}
            </p>
          )}
          <p className="font-semibold">Total {formatLKR(order.total)}</p>
          {needsCodDeposit && (
            <p className="text-xs text-ink/65">
              Advance deposit due now: <strong>{formatLKR(COD_MIN_DEPOSIT)}</strong> · Balance on
              delivery: <strong>{formatLKR(codRemainingBalance)}</strong>
            </p>
          )}
        </div>
      </div>

      <div className="mt-10 flex flex-col gap-3 sm:flex-row sm:justify-center">
        <Link href="/shop" className="btn btn-primary">
          Continue shopping
        </Link>
        <a
          href="https://www.instagram.com/almera.lk/"
          target="_blank"
          rel="noreferrer"
          className="btn btn-ghost"
        >
          Follow @almera.lk
        </a>
      </div>
    </div>
  );
}
