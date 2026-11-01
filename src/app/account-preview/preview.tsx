"use client";

import { usePathname } from "next/navigation";
import { useMemo, useState } from "react";
import { AddressesScreen } from "@/components/account/addresses-screen";
import { AccountProvider } from "@/components/account/context";
import { HomeScreen } from "@/components/account/home-screen";
import { OrderDetailScreen } from "@/components/account/order-detail";
import { OrdersScreen } from "@/components/account/orders-screen";
import { ProfileScreen } from "@/components/account/profile-screen";
import { AccountShell } from "@/components/account/shell";
import type { AuthResult } from "@/actions/auth";
import type { AccountAddress, AccountApi, AccountOrder, AccountProfile } from "@/components/account/types";
import { editorial, texture } from "@/lib/catalog";
import { passwordProblem } from "@/lib/password-policy";

const BASE = "/account-preview";
const CURRENT_PASSWORD = "Sample-pass-92!";

const item = (id: string, name: string, image: string, price: number, qty = 1, size: string | null = "M") => ({
  id,
  product_slug: "sample",
  product_name: name,
  stitching: size ? "stitched" : "unstitched",
  size,
  unit_price: price,
  quantity: qty,
  image_url: image,
});

const order = (number: string, status: string, method: string, total: number, days: number, extra: Partial<AccountOrder> = {}): AccountOrder => ({
  id: number,
  order_number: number,
  status,
  payment_method: method,
  total,
  subtotal: total - 450,
  delivery_fee: 450,
  discount_amount: 0,
  coupon_code: null,
  advance_deposit: 0,
  refund_amount: 0,
  created_at: new Date(Date.now() - days * 864e5).toISOString(),
  customer_name: "Amina Perera",
  phone: "0771234567",
  address: "No. 12, Galle Road",
  city: "Colombo 03",
  district: "Colombo",
  postal_code: "00300",
  notes: null,
  order_items: [item(`${number}-1`, "Lilac chikan lawn — Stitched (Size M)", texture.chikan, total - 450)],
  ...extra,
});

const ORDERS: AccountOrder[] = [
  order("ALM-10251", "pending", "cod", 14950, 0, {
    order_items: [
      item("a", "Lilac chikan lawn — Stitched (Size M)", texture.chikan, 9500),
      item("b", "Rose zardozi dupatta — Unstitched", texture.zardozi, 5000, 1, null),
    ],
  }),
  order("ALM-10244", "shipped", "card", 12950, 4),
  order("ALM-10238", "awaiting_bank_slip", "bank", 9850, 6),
  order("ALM-10201", "delivered", "cod", 11450, 30, { advance_deposit: 500 }),
  order("ALM-10187", "cancelled", "cod", 8650, 60, { order_items: [item("c", "Plum jacquard lawn — Unstitched", editorial.courtyard, 8200, 1, null)] }),
];

const PROFILE: AccountProfile = {
  name: "Amina Perera",
  email: "amina@example.com",
  phone: "0771234567",
  emailVerified: true,
  hasPassword: true,
  viaGoogle: false,
  lastSignIn: new Date().toISOString(),
};

const pause = () => new Promise((r) => setTimeout(r, 300));

export function AccountPreview() {
  const path = usePathname().slice(BASE.length) || "/";
  const [addresses, setAddresses] = useState<AccountAddress[]>([
    { id: "a1", label: "Home", recipient_name: "Amina Perera", phone: "0771234567", address: "No. 12, Galle Road", city: "Colombo 03", district: "Colombo", postal_code: "00300", is_default: true },
    { id: "a2", label: "Office", recipient_name: "Amina Perera", phone: "0771234567", address: "45 Kandy Road", city: "Kadawatha", district: "Gampaha", postal_code: null, is_default: false },
  ]);

  const api = useMemo<AccountApi>(() => {
    const update = (next: (cur: AccountAddress[]) => AccountAddress[]) => {
      let result: AccountAddress[] = [];
      setAddresses((cur) => (result = next(cur)));
      return pause().then(() => ({ ok: true as const, addresses: result }));
    };
    return {
      saveProfile: async ({ fullName }): Promise<AuthResult> => {
        await pause();
        return fullName.trim().length < 2 ? { ok: false as const, error: "Check", fields: { fullName: "Enter your name." } } : { ok: true as const };
      },
      saveAddress: async (input) => {
        const fields: Record<string, string> = {};
        if (input.recipientName.trim().length < 2) fields.recipientName = "Enter your name.";
        if (!/^(?:\+94|0)?7\d{8}$/.test(input.phone.replace(/[\s-]/g, ""))) fields.phone = "Enter a Sri Lankan mobile number, like 077 123 4567.";
        if (input.address.trim().length < 5) fields.address = "Enter your house number and street.";
        if (input.city.trim().length < 2) fields.city = "Enter your city or town.";
        if (!input.district) fields.district = "Choose your district.";
        if (Object.keys(fields).length > 0) return { ok: false as const, error: "Check", fields };
        const row: AccountAddress = {
          id: input.id ?? `a${Date.now()}`,
          label: input.label,
          recipient_name: input.recipientName,
          phone: input.phone,
          address: input.address,
          city: input.city,
          district: input.district,
          postal_code: input.postalCode || null,
          is_default: input.isDefault,
        };
        return update((cur) => {
          const others = cur.filter((a) => a.id !== row.id).map((a) => (row.is_default ? { ...a, is_default: false } : a));
          return row.is_default ? [row, ...others] : [...others, row];
        });
      },
      setDefaultAddress: (id) =>
        update((cur) => cur.map((a) => ({ ...a, is_default: a.id === id })).sort((a, b) => Number(b.is_default) - Number(a.is_default))),
      deleteAddress: (id) =>
        update((cur) => {
          const rest = cur.filter((a) => a.id !== id);
          return rest.length > 0 && !rest.some((a) => a.is_default) ? rest.map((a, i) => ({ ...a, is_default: i === 0 })) : rest;
        }),
      changePassword: async ({ current, next }): Promise<AuthResult> => {
        await pause();
        if (current !== CURRENT_PASSWORD) return { ok: false as const, error: "Wrong", fields: { current: "That isn’t your current password." } };
        const problem = passwordProblem(next, PROFILE);
        return problem ? { ok: false as const, error: problem, fields: { next: problem } } : { ok: true as const };
      },
      sendPasswordLink: async () => ({ ok: true as const, message: "Sent" }),
      signOut: async () => window.location.assign(BASE),
      signOutEverywhere: async () => window.location.assign(BASE),
    };
  }, []);

  const detail = path.startsWith("/orders/") ? ORDERS.find((o) => o.order_number === path.slice(8)) : null;

  return (
    <AccountProvider api={api} base={BASE}>
      <AccountShell>
        {detail ? (
          <OrderDetailScreen order={detail} />
        ) : path === "/orders" ? (
          <OrdersScreen orders={ORDERS} />
        ) : path === "/addresses" ? (
          <AddressesScreen initial={addresses} profileName={PROFILE.name} profilePhone={PROFILE.phone} />
        ) : path === "/profile" ? (
          <ProfileScreen profile={PROFILE} />
        ) : (
          <HomeScreen profile={PROFILE} orders={ORDERS} orderCount={ORDERS.length} defaultAddress={addresses.find((a) => a.is_default) ?? null} />
        )}
      </AccountShell>
    </AccountProvider>
  );
}
