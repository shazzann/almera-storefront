"use client";

import Link from "next/link";
import { OrdersIcon } from "@/components/admin/admin-icons";
import { ChevronIcon, WhatsAppIcon } from "@/components/icons";
import { PinIcon, UserIcon } from "./account-icons";
import { useAccount } from "./context";
import { OrderCard } from "./order-card";
import { ORDER_STEPS, currentStep, isActiveOrder, paymentNeeded, statusOf } from "./order-status";
import { ScreenTitle } from "./shell";
import type { AccountAddress, AccountOrder, AccountProfile } from "./types";

const COMMUNITY = process.env.NEXT_PUBLIC_WHATSAPP_COMMUNITY_URL ?? "https://chat.whatsapp.com/G5xidVIQxc3Cw0bEEpnach";

export function HomeScreen({
  profile,
  orders,
  orderCount,
  defaultAddress,
}: {
  profile: AccountProfile;
  orders: AccountOrder[];
  orderCount: number;
  defaultAddress: AccountAddress | null;
}) {
  const { base } = useAccount();
  const firstName = (profile.name || profile.email.split("@")[0]).split(" ")[0].toLowerCase();
  const active = orders.find(isActiveOrder);
  const recent = orders.filter((o) => o.id !== active?.id).slice(0, 2);

  const tiles = [
    { href: `${base}/orders`, Icon: OrdersIcon, title: "Orders", detail: orderCount === 1 ? "1 order" : `${orderCount} orders` },
    { href: `${base}/addresses`, Icon: PinIcon, title: "Addresses", detail: defaultAddress ? defaultAddress.city : "None saved" },
    { href: `${base}/profile`, Icon: UserIcon, title: "Profile", detail: "Your details" },
  ];

  return (
    <>
      <ScreenTitle title={<>hello, <em>{firstName}</em></>} />
      <div className="mt-4 space-y-3 px-4 lg:px-0">
        {active && <ActiveOrder order={active} />}

        <div className="grid grid-cols-3 gap-2.5">
          {tiles.map(({ href, Icon, title, detail }) => (
            <Link key={title} href={href} className="flex min-h-[6.5rem] flex-col justify-between rounded-[1.25rem] border border-line bg-ivory p-3 transition active:scale-[0.98]">
              <Icon className="size-6 text-sage-deep" />
              <span>
                <span className="block text-[0.92rem] font-semibold">{title}</span>
                <span className="block truncate text-[0.78rem] text-ink/60">{detail}</span>
              </span>
            </Link>
          ))}
        </div>

        {orders.length === 0 && (
          <div className="rounded-[1.25rem] bg-ivory px-6 py-10 text-center">
            <p className="display text-3xl">your wardrobe is waiting</p>
            <p className="mx-auto mt-2 max-w-xs text-[0.95rem] leading-relaxed text-ink/65">Your orders will appear here, so you can follow them from our door to yours.</p>
            <Link href="/shop" className="btn btn-primary mt-5">Shop new arrivals</Link>
          </div>
        )}

        {recent.length > 0 && (
          <section className="pt-3">
            <div className="mb-2.5 flex items-center justify-between px-1">
              <h2 className="text-[1.05rem] font-semibold">Recent orders</h2>
              <Link href={`${base}/orders`} className="py-1 text-[0.9rem] font-medium text-sage-deep">View all</Link>
            </div>
            <div className="space-y-2.5">
              {recent.map((order) => <OrderCard key={order.id} order={order} />)}
            </div>
          </section>
        )}

        <div className="divide-y divide-line rounded-[1.25rem] border border-line bg-ivory">
          <a href={COMMUNITY} target="_blank" rel="noreferrer" className="flex min-h-16 items-center gap-3.5 px-4">
            <WhatsAppIcon className="size-6 text-sage-deep" />
            <span className="min-w-0 flex-1">
              <span className="block font-medium">Need a hand?</span>
              <span className="block text-[0.85rem] text-ink/60">Ask us on WhatsApp</span>
            </span>
            <ChevronIcon className="size-4 opacity-40" />
          </a>
        </div>
      </div>
    </>
  );
}

function ActiveOrder({ order }: { order: AccountOrder }) {
  const { base } = useAccount();
  const step = currentStep(order.status) ?? 0;
  const status = statusOf(order.status);
  const payment = paymentNeeded(order);

  return (
    <Link href={`${base}/orders/${order.order_number}`} className="block rounded-[1.5rem] bg-ink p-5 text-ivory transition active:scale-[0.99]">
      <div className="flex items-center justify-between gap-3">
        <span className="eyebrow text-sage">Your order</span>
        <span className="text-[0.85rem] text-ivory/65 tabular-nums">{order.order_number}</span>
      </div>
      <p className="display mt-2 text-[2.1rem] leading-none">{status.label.toLowerCase()}</p>
      <ol className="mt-4 grid grid-cols-4 gap-1.5" aria-label={`Step ${step + 1} of ${ORDER_STEPS.length}: ${ORDER_STEPS[step]}`}>
        {ORDER_STEPS.map((label, i) => (
          <li key={label}>
            <span className={`block h-1.5 rounded-full ${i <= step ? "bg-sage" : "bg-ivory/20"}`} />
            <span className={`mt-1.5 block text-[0.72rem] leading-tight ${i === step ? "font-semibold text-ivory" : "text-ivory/55"}`}>{label}</span>
          </li>
        ))}
      </ol>
      {payment ? (
        <span className="mt-4 flex min-h-12 items-center justify-center rounded-full bg-gold px-4 text-center text-[0.9rem] font-semibold text-ink">
          {payment === "deposit" ? "Send your deposit to confirm" : "Send your payment slip"}
        </span>
      ) : (
        <span className="mt-4 flex items-center justify-between text-[0.92rem] font-medium">
          View order details <ChevronIcon className="size-4" />
        </span>
      )}
    </Link>
  );
}
