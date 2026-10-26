"use client";

import Link from "next/link";
import { useSyncExternalStore } from "react";
import { DELIVERY, formatLKR, getProduct } from "@/lib/catalog";
import { WardrobeMark } from "./brand";
import type { PlacedOrder } from "./checkout-form";

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
        <Link href="/shop" className="btn btn-primary mt-8">Shop new arrivals</Link>
      </div>
    );
  }

  const first = order.name.split(" ")[0];
  const steps = [
    { title: "We’ll confirm with you", body: `Expect a call or WhatsApp on ${order.phone} within one working day.` },
    order.payment === "bank"
      ? { title: "Send your payment slip", body: "We’ll share our bank details. Your order ships once the transfer is confirmed." }
      : { title: "Keep cash ready", body: `Pay ${formatLKR(order.total)} to the courier when your parcel arrives.` },
    { title: "Your parcel is on its way", body: `${DELIVERY[order.method].label} to ${order.district}: ${DELIVERY[order.method].eta.toLowerCase()}.` },
  ];

  return (
    <div className="mx-auto max-w-2xl px-4 py-14 sm:px-6 sm:py-20">
      <div className="text-center">
        <WardrobeMark className="mx-auto h-24 w-auto animate-rise text-gold" />
        <p className="eyebrow mt-8 text-gold-deep">Order {order.number}</p>
        <h1 className="display mt-3 text-5xl sm:text-6xl">
          thank you, <em className="text-sage-deep">{first.toLowerCase()}</em>
        </h1>
        <p className="mx-auto mt-4 max-w-md leading-relaxed text-ink/70">Your order has been placed. We’re setting it aside in the wardrobe for you now.</p>
      </div>

      <ol className="mt-12 space-y-3">
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
              <span>{l.qty} × {getProduct(l.slug)?.name} <span className="text-ink/55 capitalize">({l.stitching}{l.size && `, ${l.size}`})</span></span>
            </li>
          ))}
        </ul>
        <p className="mt-4 border-t border-line pt-3 text-sm">
          Delivering to {order.address}, {order.district}
        </p>
        <p className="mt-1 text-sm font-semibold">Total {formatLKR(order.total)}</p>
      </div>

      <div className="mt-10 flex flex-col gap-3 sm:flex-row sm:justify-center">
        <Link href="/shop" className="btn btn-primary">Continue shopping</Link>
        <a href="https://www.instagram.com/almera.lk/" target="_blank" rel="noreferrer" className="btn btn-ghost">Follow @almera.lk</a>
      </div>
    </div>
  );
}
