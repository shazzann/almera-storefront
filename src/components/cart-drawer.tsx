"use client";

import Image from "next/image";
import Link from "next/link";
import { FREE_DELIVERY_FROM, formatLKR, getProduct } from "@/lib/catalog";
import { cart, linePrice, totals, useCart, type CartLine } from "@/lib/cart";
import { WardrobeMark } from "./brand";
import { MinusIcon, PlusIcon } from "./icons";
import { Sheet } from "./sheet";

export function CartDrawer() {
  const { lines, drawerOpen } = useCart();
  const t = totals(lines);
  const progress = Math.min(100, (t.subtotal / FREE_DELIVERY_FROM) * 100);

  return (
    <Sheet
      open={drawerOpen}
      onClose={cart.close}
      side="bottom"
      title={
        <span>
          your bag <span className="font-sans text-sm tracking-normal text-ink/50 normal-case">({t.count})</span>
        </span>
      }
      footer={
        lines.length > 0 && (
          <>
            <div className="mb-1 flex justify-between text-sm">
              <span className="text-ink/70">Subtotal</span>
              <span className="font-semibold">{formatLKR(t.subtotal)}</span>
            </div>
            <p className="mb-4 text-xs text-ink/55">Delivery and payment options are chosen at checkout.</p>
            <Link href="/checkout" onNavigate={cart.close} className="btn btn-primary w-full">
              Checkout · {formatLKR(t.subtotal)}
            </Link>
          </>
        )
      }
    >
      {lines.length === 0 ? (
        <div className="flex flex-col items-center px-8 py-16 text-center">
          <WardrobeMark className="h-20 w-auto text-gold" />
          <p className="display mt-6 text-3xl">the wardrobe is empty</p>
          <p className="mt-2 max-w-xs text-sm text-ink/60">Pieces you add will wait here while you keep browsing.</p>
          <Link href="/shop" onNavigate={cart.close} className="btn btn-ghost mt-8">
            Browse new arrivals
          </Link>
        </div>
      ) : (
        <>
          <div className="border-b border-line px-5 py-4">
            <p className="text-sm">
              {t.freeDelivery ? (
                <>Your order ships <strong className="font-semibold text-sage-deep">free</strong> island-wide.</>
              ) : (
                <>
                  Add <strong className="font-semibold">{formatLKR(t.toFree)}</strong> more for free island-wide delivery.
                </>
              )}
            </p>
            <div className="mt-2.5 h-1 overflow-hidden rounded-full bg-sage-soft">
              <div className="h-full rounded-full bg-sage-deep transition-[width] duration-700" style={{ width: `${progress}%` }} />
            </div>
          </div>
          <ul className="divide-y divide-line px-5">
            {lines.map((l) => (
              <Line key={l.key} line={l} />
            ))}
          </ul>
        </>
      )}
    </Sheet>
  );
}

function Line({ line }: { line: CartLine }) {
  const p = getProduct(line.slug);
  if (!p) return null;
  return (
    <li className="flex gap-4 py-5">
      <Link href={`/product/${p.slug}`} onNavigate={cart.close} className="relative h-32 w-24 shrink-0 overflow-hidden rounded-xl bg-sage-soft">
        <Image src={p.images[0]} alt={p.name} fill sizes="96px" className="object-cover" />
      </Link>
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex items-start justify-between gap-3">
          <Link href={`/product/${p.slug}`} onNavigate={cart.close} className="font-medium leading-snug hover:text-sage-deep">
            {p.name}
          </Link>
          <span className="shrink-0 text-sm font-semibold">{formatLKR(linePrice(line) * line.qty)}</span>
        </div>
        <p className="mt-1 text-[0.8rem] text-ink/60 capitalize">
          {line.stitching}
          {line.size && ` · Size ${line.size}`}
        </p>
        <div className="mt-auto flex items-center justify-between pt-3">
          <div className="flex items-center rounded-full border border-line">
            <button onClick={() => cart.setQty(line.key, line.qty - 1)} className="grid size-9 place-items-center" aria-label="Decrease quantity">
              <MinusIcon className="size-4" />
            </button>
            <span className="w-6 text-center text-sm tabular-nums" aria-live="polite">{line.qty}</span>
            <button
              onClick={() => cart.setQty(line.key, line.qty + 1)}
              disabled={line.qty >= p.stock}
              className="grid size-9 place-items-center disabled:opacity-30"
              aria-label="Increase quantity"
            >
              <PlusIcon className="size-4" />
            </button>
          </div>
          <button onClick={() => cart.remove(line.key)} className="text-xs text-ink/55 underline underline-offset-4 hover:text-ink">
            Remove
          </button>
        </div>
      </div>
    </li>
  );
}
