"use client";

import { useSyncExternalStore } from "react";
import { validateCouponAction, type CouponResult } from "@/actions/orders";
import {
  DELIVERY,
  FREE_DELIVERY_FROM,
  getOptionStock,
  type DeliveryMethod,
  type Product,
  type Size,
  type Stitching,
} from "./catalog";

export type CartLine = {
  key: string;
  slug: string;
  name: string;
  image: string;
  unitPrice: number;
  maxStock: number;
  stitching: Stitching;
  size?: Size;
  qty: number;
};

type State = {
  lines: CartLine[];
  appliedCoupon: CouponResult | null;
  couponChecking: boolean;
  couponNotice: string | null;
  drawerOpen: boolean;
  hydrated: boolean;
};

const STORAGE_KEY = "almera.bag.v2";
const COUPON_STORAGE_KEY = "almera.coupon.v1";
const EMPTY: State = {
  lines: [],
  appliedCoupon: null,
  couponChecking: false,
  couponNotice: null,
  drawerOpen: false,
  hydrated: false,
};

let state: State = EMPTY;
const listeners = new Set<() => void>();
let revalidateCounter = 0;

function emit(next: State) {
  state = next;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state.lines));
    if (state.appliedCoupon) {
      localStorage.setItem(COUPON_STORAGE_KEY, JSON.stringify(state.appliedCoupon));
    } else {
      localStorage.removeItem(COUPON_STORAGE_KEY);
    }
  } catch {}
  listeners.forEach((l) => l());
}

function hydrate() {
  if (state.hydrated || typeof window === "undefined") return;
  let lines: CartLine[] = [];
  let appliedCoupon: CouponResult | null = null;
  try {
    const raw = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "[]");
    if (Array.isArray(raw)) {
      lines = raw.filter(
        (l) => l && typeof l.slug === "string" && typeof l.unitPrice === "number" && l.qty > 0,
      );
    }
    const rawCoupon = JSON.parse(localStorage.getItem(COUPON_STORAGE_KEY) ?? "null");
    if (rawCoupon && typeof rawCoupon.code === "string" && lines.length > 0) {
      appliedCoupon = rawCoupon as CouponResult;
    }
  } catch {}
  state = { ...state, lines, appliedCoupon, hydrated: true };
}

function subscribe(listener: () => void) {
  hydrate();
  listeners.add(listener);
  listener();
  return () => listeners.delete(listener);
}

export function useCart() {
  return useSyncExternalStore(subscribe, () => state, () => EMPTY);
}

async function revalidateActiveCoupon(lines: CartLine[], customer?: { phone?: string; email?: string }) {
  const active = state.appliedCoupon;
  if (!active) return;

  if (lines.length === 0) {
    emit({ ...state, lines, appliedCoupon: null, couponChecking: false, couponNotice: null });
    return;
  }

  const token = ++revalidateCounter;
  emit({ ...state, lines, couponChecking: true });

  try {
    const res = await validateCouponAction({
      code: active.code,
      items: lines.map((l) => ({
        slug: l.slug,
        stitching: l.stitching,
        size: l.size ?? null,
        quantity: l.qty,
      })),
      phone: customer?.phone,
      email: customer?.email,
    });
    if (token !== revalidateCounter) return;
    emit({ ...state, appliedCoupon: res, couponChecking: false });
  } catch (err) {
    if (token !== revalidateCounter) return;
    const msg =
      err instanceof Error
        ? `Promo code ${active.code} removed: ${err.message}`
        : `Promo code ${active.code} is no longer eligible for your bag.`;
    emit({
      ...state,
      appliedCoupon: null,
      couponChecking: false,
      couponNotice: msg,
    });
  }
}

export const cart = {
  add(product: Product, stitching: Stitching, size: Size | undefined, qty = 1) {
    const key = [product.slug, stitching, size ?? "-"].join(":");
    const unitPrice = product.price[stitching] ?? 0;
    const image = product.images[0] ?? "";
    const maxStock = getOptionStock(product, stitching, size);
    if (maxStock <= 0) return;
    const existing = state.lines.find((l) => l.key === key);
    const lines = existing
      ? state.lines.map((l) =>
          l.key === key
            ? {
                ...l,
                name: product.name,
                image,
                unitPrice,
                maxStock,
                qty: Math.min(maxStock, l.qty + qty),
              }
            : l,
        )
      : [
          ...state.lines,
          {
            key,
            slug: product.slug,
            name: product.name,
            image,
            unitPrice,
            maxStock,
            stitching,
            size,
            qty: Math.min(maxStock, qty),
          },
        ];
    emit({ ...state, lines, drawerOpen: true, couponNotice: null });
    void revalidateActiveCoupon(lines);
  },
  setQty(key: string, qty: number) {
    const lines =
      qty <= 0
        ? state.lines.filter((l) => l.key !== key)
        : state.lines.map((l) =>
            l.key === key
              ? { ...l, qty: l.maxStock > 0 ? Math.min(l.maxStock, qty) : qty }
              : l,
          );
    const nextCoupon = lines.length === 0 ? null : state.appliedCoupon;
    emit({ ...state, lines, appliedCoupon: nextCoupon, couponNotice: null });
    if (lines.length > 0 && nextCoupon) {
      void revalidateActiveCoupon(lines);
    }
  },
  remove(key: string) {
    const lines = state.lines.filter((l) => l.key !== key);
    const nextCoupon = lines.length === 0 ? null : state.appliedCoupon;
    emit({ ...state, lines, appliedCoupon: nextCoupon, couponNotice: null });
    if (lines.length > 0 && nextCoupon) {
      void revalidateActiveCoupon(lines);
    }
  },
  clear() {
    emit({ ...state, lines: [], appliedCoupon: null, couponChecking: false, couponNotice: null });
  },
  async applyCoupon(
    code: string,
    customer?: { phone?: string; email?: string; requireCustomerForFirstOrder?: boolean },
  ): Promise<CouponResult> {
    const trimmed = code.trim().toUpperCase();
    if (!trimmed) throw new Error("Enter a promo code.");
    emit({ ...state, couponChecking: true, couponNotice: null });
    try {
      const res = await validateCouponAction({
        code: trimmed,
        items: state.lines.map((l) => ({
          slug: l.slug,
          stitching: l.stitching,
          size: l.size ?? null,
          quantity: l.qty,
        })),
        phone: customer?.phone,
        email: customer?.email,
        requireCustomerForFirstOrder: customer?.requireCustomerForFirstOrder,
      });
      emit({ ...state, appliedCoupon: res, couponChecking: false, couponNotice: null });
      return res;
    } catch (err) {
      emit({ ...state, couponChecking: false });
      throw err;
    }
  },
  removeCoupon() {
    emit({ ...state, appliedCoupon: null, couponChecking: false, couponNotice: null });
  },
  clearCouponNotice() {
    if (!state.couponNotice) return;
    emit({ ...state, couponNotice: null });
  },
  open() {
    emit({ ...state, drawerOpen: true });
  },
  close() {
    emit({ ...state, drawerOpen: false });
  },
};

export function linePrice(line: CartLine) {
  return line.unitPrice;
}

export function totals(
  lines: CartLine[],
  method: DeliveryMethod = "standard",
  appliedCoupon?: CouponResult | null,
) {
  const subtotal = lines.reduce((sum, l) => sum + linePrice(l) * l.qty, 0);
  const count = lines.reduce((n, l) => n + l.qty, 0);
  const freeDeliveryByThreshold = subtotal >= FREE_DELIVERY_FROM;
  const isFreeDeliveryCoupon = appliedCoupon?.discountType === "free_delivery";
  const freeDelivery = freeDeliveryByThreshold || isFreeDeliveryCoupon;
  const baseDelivery = lines.length === 0 || freeDeliveryByThreshold ? 0 : DELIVERY[method].fee;
  const discountAmount = appliedCoupon
    ? isFreeDeliveryCoupon
      ? baseDelivery
      : Math.min(appliedCoupon.discountAmount, subtotal)
    : 0;
  const delivery = isFreeDeliveryCoupon ? 0 : baseDelivery;
  return {
    subtotal,
    count,
    delivery,
    baseDelivery,
    freeDelivery,
    isFreeDeliveryCoupon,
    discountAmount,
    total: Math.max(0, subtotal + baseDelivery - discountAmount),
    toFree: Math.max(0, FREE_DELIVERY_FROM - subtotal),
  };
}
