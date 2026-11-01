"use client";

import Image from "next/image";
import Link from "next/link";
import { ChevronIcon } from "@/components/icons";
import { formatLKR } from "@/lib/catalog";
import { useAccount } from "./context";
import { formatDate, num, paymentNeeded, pieceCount, statusOf } from "./order-status";
import type { AccountOrder } from "./types";

export function StatusBadge({ status }: { status: string }) {
  const { label, tone } = statusOf(status);
  return <span className={`inline-flex shrink-0 items-center rounded-full px-2.5 py-1 text-[0.75rem] font-semibold whitespace-nowrap ${tone}`}>{label}</span>;
}

export function OrderCard({ order }: { order: AccountOrder }) {
  const { base } = useAccount();
  const photos = order.order_items.filter((it) => it.image_url).slice(0, 3);
  const pieces = pieceCount(order);
  const payment = paymentNeeded(order);

  return (
    <Link href={`${base}/orders/${order.order_number}`} className="block rounded-[1.25rem] border border-line bg-ivory p-3.5 transition active:scale-[0.99]">
      <div className="flex items-start gap-3">
        <span className="relative h-[4.5rem] w-14 shrink-0">
          {photos.length === 0 && <span className="arch-soft absolute inset-0 bg-sage-soft" />}
          {photos.map((it, i) => (
            <span key={it.id} className="arch-soft absolute inset-0 overflow-hidden bg-sage-soft ring-2 ring-ivory" style={{ transform: `translateX(${i * 5}px) scale(${1 - i * 0.08})`, zIndex: 3 - i }}>
              <Image src={it.image_url!} alt="" fill sizes="56px" className="object-cover" />
            </span>
          ))}
        </span>
        <span className="min-w-0 flex-1 pl-1.5">
          <span className="flex items-center justify-between gap-2">
            <span className="min-w-0 truncate font-semibold tabular-nums">{order.order_number}</span>
            <StatusBadge status={order.status} />
          </span>
          <span className="mt-0.5 block text-[0.85rem] text-ink/60">{formatDate(order.created_at)} · {pieces} {pieces === 1 ? "piece" : "pieces"}</span>
          <span className="mt-1.5 flex items-center justify-between gap-2">
            <span className="font-semibold tabular-nums">{formatLKR(num(order.total))}</span>
            <ChevronIcon className="size-4 opacity-40" />
          </span>
        </span>
      </div>
      {payment && (
        <span className="mt-3 block rounded-xl bg-gold/15 px-3 py-2 text-[0.88rem] font-medium text-gold-deep">
          {payment === "deposit" ? "Send your deposit to confirm this order" : "Send your payment slip to confirm this order"}
        </span>
      )}
    </Link>
  );
}
