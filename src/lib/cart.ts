"use client";

import { useSyncExternalStore } from "react";
import { DELIVERY, FREE_DELIVERY_FROM, getProduct, type DeliveryMethod, type Size, type Stitching } from "./catalog";

export type CartLine = {
  key: string;
  slug: string;
  stitching: Stitching;
  size?: Size;
  qty: number;
};

type State = { lines: CartLine[]; drawerOpen: boolean; hydrated: boolean };

const STORAGE_KEY = "almera.bag.v1";
const EMPTY: State = { lines: [], drawerOpen: false, hydrated: false };

let state: State = EMPTY;
const listeners = new Set<() => void>();

function emit(next: State) {
  state = next;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state.lines));
  } catch {}
  listeners.forEach((l) => l());
}

function hydrate() {
  if (state.hydrated || typeof window === "undefined") return;
  let lines: CartLine[] = [];
  try {
    lines = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "[]");
  } catch {}
  state = { ...state, lines: lines.filter((l) => getProduct(l.slug)), hydrated: true };
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

export const cart = {
  add(slug: string, stitching: Stitching, size: Size | undefined, qty = 1) {
    const key = [slug, stitching, size ?? "-"].join(":");
    const existing = state.lines.find((l) => l.key === key);
    const lines = existing
      ? state.lines.map((l) => (l.key === key ? { ...l, qty: l.qty + qty } : l))
      : [...state.lines, { key, slug, stitching, size, qty }];
    emit({ ...state, lines, drawerOpen: true });
  },
  setQty(key: string, qty: number) {
    const lines = qty <= 0 ? state.lines.filter((l) => l.key !== key) : state.lines.map((l) => (l.key === key ? { ...l, qty } : l));
    emit({ ...state, lines });
  },
  remove(key: string) {
    emit({ ...state, lines: state.lines.filter((l) => l.key !== key) });
  },
  clear() {
    emit({ ...state, lines: [] });
  },
  open() {
    emit({ ...state, drawerOpen: true });
  },
  close() {
    emit({ ...state, drawerOpen: false });
  },
};

export function linePrice(line: CartLine) {
  return getProduct(line.slug)?.price[line.stitching] ?? 0;
}

export function totals(lines: CartLine[], method: DeliveryMethod = "standard") {
  const subtotal = lines.reduce((sum, l) => sum + linePrice(l) * l.qty, 0);
  const count = lines.reduce((n, l) => n + l.qty, 0);
  const freeDelivery = subtotal >= FREE_DELIVERY_FROM;
  const delivery = lines.length === 0 || (freeDelivery && method === "standard") ? 0 : DELIVERY[method].fee;
  return { subtotal, count, delivery, freeDelivery, total: subtotal + delivery, toFree: Math.max(0, FREE_DELIVERY_FROM - subtotal) };
}
