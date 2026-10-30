"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { getPublicCouponsAction } from "@/actions/orders";
import { FREE_DELIVERY_FROM, formatLKR } from "@/lib/catalog";
import { cart, linePrice, totals, useCart, type CartLine } from "@/lib/cart";
import type { PublicCouponSummary } from "@/lib/coupons.server";
import { WardrobeMark } from "./brand";
import { MinusIcon, PlusIcon } from "./icons";
import { Sheet } from "./sheet";

export function CartDrawer() {
  const { lines, appliedCoupon, couponChecking, couponNotice, drawerOpen } = useCart();
  const [couponInput, setCouponInput] = useState("");
  const [couponError, setCouponError] = useState<string | null>(null);
  const [publicCoupons, setPublicCoupons] = useState<PublicCouponSummary[]>([]);

  const t = totals(lines, "standard", appliedCoupon);
  const progress = Math.min(100, (t.subtotal / FREE_DELIVERY_FROM) * 100);

  useEffect(() => {
    if (!drawerOpen || lines.length === 0) return;
    getPublicCouponsAction()
      .then(setPublicCoupons)
      .catch(() => {});
  }, [drawerOpen, lines.length]);

  async function handleApplyCoupon(codeToApply?: string) {
    const code = (codeToApply ?? couponInput).trim().toUpperCase();
    if (!code) return;
    setCouponError(null);
    cart.clearCouponNotice();
    try {
      await cart.applyCoupon(code);
      setCouponInput("");
    } catch (err) {
      setCouponError(err instanceof Error ? err.message : "Invalid promo code.");
    }
  }

  return (
    <Sheet
      open={drawerOpen}
      onClose={cart.close}
      side="bottom"
      title={
        <span>
          your bag{" "}
          <span className="font-sans text-sm tracking-normal text-ink/50 normal-case">
            ({t.count})
          </span>
        </span>
      }
      footer={
        lines.length > 0 && (
          <>
            {/* Promo code section in Cart Drawer */}
            <div className="mb-3">
              {appliedCoupon ? (
                <div className="flex items-center justify-between rounded-xl bg-sage-soft/70 px-3 py-2 text-xs">
                  <div>
                    <span className="font-mono font-bold text-sage-deep">
                      {appliedCoupon.code}
                    </span>{" "}
                    <span className="text-ink/75">· {appliedCoupon.label}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      cart.removeCoupon();
                      setCouponError(null);
                    }}
                    className="ml-2 font-medium text-ink/60 underline hover:text-ink"
                  >
                    Remove
                  </button>
                </div>
              ) : (
                <div>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={couponInput}
                      onChange={(e) => {
                        setCouponInput(e.target.value.toUpperCase());
                        if (couponError) setCouponError(null);
                      }}
                      placeholder="Promo code"
                      className="field py-1.5 text-xs uppercase"
                    />
                    <button
                      type="button"
                      disabled={couponChecking || !couponInput.trim()}
                      onClick={() => handleApplyCoupon()}
                      className="btn btn-ghost shrink-0 px-3.5 py-1.5 text-xs"
                    >
                      {couponChecking ? "Checking…" : "Apply"}
                    </button>
                  </div>
                  {publicCoupons.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {publicCoupons.map((pc) => (
                        <button
                          key={pc.code}
                          type="button"
                          disabled={couponChecking}
                          onClick={() => handleApplyCoupon(pc.code)}
                          className="rounded-full border border-line bg-mist/60 px-2.5 py-0.5 text-[11px] font-medium text-ink/75 transition hover:border-ink hover:text-ink"
                        >
                          <span className="font-mono font-semibold">{pc.code}</span> ·{" "}
                          {pc.discount_type === "percentage"
                            ? `${pc.discount_value}% off`
                            : pc.discount_type === "free_delivery"
                              ? "Free delivery"
                              : `Rs. ${pc.discount_value.toLocaleString("en-LK")} off`}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
              {(couponError || couponNotice) && (
                <p className="mt-1.5 text-xs text-[#a5432f]">
                  {couponError ?? couponNotice}
                </p>
              )}
            </div>

            <div className="mb-1 flex justify-between text-sm">
              <span className="text-ink/70">Subtotal</span>
              <span className="font-semibold tabular-nums">{formatLKR(t.subtotal)}</span>
            </div>
            {appliedCoupon && t.discountAmount > 0 && !t.isFreeDeliveryCoupon && (
              <div className="mb-1 flex justify-between text-xs text-sage-deep">
                <span>Discount ({appliedCoupon.code})</span>
                <span className="font-semibold tabular-nums">−{formatLKR(t.discountAmount)}</span>
              </div>
            )}
            <p className="mb-3 text-xs text-ink/55">
              Delivery and payment options are chosen at checkout.
            </p>
            <Link href="/checkout" onNavigate={cart.close} className="btn btn-primary w-full">
              Checkout ·{" "}
              {formatLKR(
                Math.max(
                  0,
                  t.subtotal - (t.isFreeDeliveryCoupon ? 0 : t.discountAmount),
                ),
              )}
            </Link>
          </>
        )
      }
    >
      {lines.length === 0 ? (
        <div className="flex flex-col items-center px-8 py-16 text-center">
          <WardrobeMark className="h-20 w-auto text-gold" />
          <p className="display mt-6 text-3xl">the wardrobe is empty</p>
          <p className="mt-2 max-w-xs text-sm text-ink/60">
            Pieces you add will wait here while you keep browsing.
          </p>
          <Link href="/shop" onNavigate={cart.close} className="btn btn-ghost mt-8">
            Browse new arrivals
          </Link>
        </div>
      ) : (
        <>
          <div className="border-b border-line px-5 py-4">
            <p className="text-sm">
              {t.freeDelivery ? (
                <>
                  Your order ships <strong className="font-semibold text-sage-deep">free</strong>{" "}
                  island-wide.
                </>
              ) : (
                <>
                  Add <strong className="font-semibold">{formatLKR(t.toFree)}</strong> more for
                  free island-wide delivery.
                </>
              )}
            </p>
            <div className="mt-2.5 h-1 overflow-hidden rounded-full bg-sage-soft">
              <div
                className="h-full rounded-full bg-sage-deep transition-[width] duration-700"
                style={{ width: `${t.freeDelivery ? 100 : progress}%` }}
              />
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
  return (
    <li className="flex gap-4 py-5">
      <Link
        href={`/product/${line.slug}`}
        onNavigate={cart.close}
        className="relative h-32 w-24 shrink-0 overflow-hidden rounded-xl bg-sage-soft"
      >
        {line.image && (
          <Image src={line.image} alt={line.name} fill sizes="96px" className="object-cover" />
        )}
      </Link>
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex items-start justify-between gap-3">
          <Link
            href={`/product/${line.slug}`}
            onNavigate={cart.close}
            className="font-medium leading-snug hover:text-sage-deep"
          >
            {line.name}
          </Link>
          <span className="shrink-0 text-sm font-semibold">
            {formatLKR(linePrice(line) * line.qty)}
          </span>
        </div>
        <p className="mt-1 text-[0.8rem] text-ink/60 capitalize">
          {line.stitching}
          {line.size && ` · Size ${line.size}`}
        </p>
        <div className="mt-auto flex items-center justify-between pt-3">
          <div className="flex items-center rounded-full border border-line">
            <button
              onClick={() => cart.setQty(line.key, line.qty - 1)}
              className="grid size-9 place-items-center"
              aria-label="Decrease quantity"
            >
              <MinusIcon className="size-4" />
            </button>
            <span className="w-6 text-center text-sm tabular-nums" aria-live="polite">
              {line.qty}
            </span>
            <button
              onClick={() => cart.setQty(line.key, line.qty + 1)}
              disabled={line.maxStock > 0 && line.qty >= line.maxStock}
              className="grid size-9 place-items-center disabled:opacity-30"
              aria-label="Increase quantity"
            >
              <PlusIcon className="size-4" />
            </button>
          </div>
          <button
            onClick={() => cart.remove(line.key)}
            className="text-xs text-ink/55 underline underline-offset-4 hover:text-ink"
          >
            Remove
          </button>
        </div>
      </div>
    </li>
  );
}
