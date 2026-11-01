"use client";

import { useMemo, useState } from "react";
import { ChevronIcon, PlusIcon } from "@/components/icons";
import { formatLKR } from "@/lib/catalog";
import { useAdmin } from "./admin-app";
import { AlertIcon, BoxIcon, OrdersIcon, PercentIcon, RefreshIcon, StoreIcon } from "./admin-icons";
import { greeting, needsDeposit, salesSummary, stockState, todayLabel, type Order } from "./lib";
import { OrderCard } from "./orders-screen";
import { resetProductCategory } from "./products-screen";
import { Card, IconButton, SectionTitle } from "./ui";

export function HomeScreen() {
  const { data, go, refresh, refreshing } = useAdmin();
  const { orders, products } = data;
  const summary = useMemo(() => salesSummary(orders), [orders]);

  const tasks = [
    {
      count: orders.filter((o) => o.status === "pending" && !needsDeposit(o)).length + orders.filter((o) => o.status === "paid").length,
      title: "New orders to confirm",
      Icon: OrdersIcon,
      onClick: () => go({ view: "orders", filter: "todo" }),
    },
    {
      count: orders.filter(needsDeposit).length,
      title: "COD deposits to check",
      Icon: PercentIcon,
      onClick: () => go({ view: "orders", filter: "deposit" }),
    },
    {
      count: orders.filter((o) => o.status === "awaiting_bank_slip").length,
      title: "Bank slips to check",
      Icon: OrdersIcon,
      onClick: () => go({ view: "orders", filter: "todo" }),
    },
    {
      count: orders.filter((o) => o.status === "confirmed").length,
      title: "Orders to pack and ship",
      Icon: BoxIcon,
      onClick: () => go({ view: "orders", filter: "pack" }),
    },
    {
      count: products.filter((p) => p.is_active !== false && stockState(p) !== "ok").length,
      title: "Products low or sold out",
      Icon: AlertIcon,
      onClick: () => {
        resetProductCategory();
        go({ view: "products", filter: "low" });
      },
    },
  ].filter((t) => t.count > 0);

  return (
    <div className="mx-auto max-w-3xl px-4 pt-[max(1.25rem,env(safe-area-inset-top))] pb-6">
      <div className="flex items-start justify-between gap-2">
        <div>
          <h1 className="display text-[2.6rem] leading-none">{greeting()}</h1>
          <p className="mt-2 text-[0.92rem] text-ink/60">{todayLabel()}</p>
        </div>
        <IconButton label="Refresh" onClick={() => refresh()} disabled={refreshing}>
          <RefreshIcon className={`size-[1.35rem] ${refreshing ? "animate-spin" : ""}`} />
        </IconButton>
      </div>

      <div className="mt-5 grid grid-cols-2 gap-3">
        <section className="rounded-[1.25rem] bg-ink p-4 text-ivory">
          <p className="text-[0.85rem] text-ivory/70">Sales today</p>
          <p className="mt-1.5 text-[1.5rem] leading-tight font-semibold tabular-nums">{formatLKR(summary.today.total)}</p>
          <p className="mt-1 text-[0.82rem] text-ivory/70">
            {summary.today.count} {summary.today.count === 1 ? "order" : "orders"}
          </p>
        </section>
        <Card className="p-4">
          <p className="text-[0.85rem] text-ink/60">To collect on delivery</p>
          <p className="mt-1.5 text-[1.5rem] leading-tight font-semibold tabular-nums">{formatLKR(summary.toCollect)}</p>
          <p className="mt-1 text-[0.82rem] text-ink/60">From the courier</p>
        </Card>
      </div>

      <div className="mt-6">
        <SectionTitle>Needs you</SectionTitle>
        {tasks.length === 0 ? (
          <Card className="p-5 text-center">
            <p className="display text-2xl">all caught up</p>
            <p className="mt-1 text-[0.9rem] text-ink/60">Nothing is waiting on you right now.</p>
          </Card>
        ) : (
          <Card className="divide-y divide-line">
            {tasks.map((t) => (
              <button key={t.title} onClick={t.onClick} className="flex min-h-16 w-full items-center gap-3.5 px-4 text-left">
                <span className="grid size-10 shrink-0 place-items-center rounded-full bg-sage-soft text-sage-deep">
                  <t.Icon className="size-5" />
                </span>
                <span className="flex-1 font-medium">{t.title}</span>
                <span className="text-lg font-semibold tabular-nums">{t.count}</span>
                <ChevronIcon className="size-4 opacity-40" />
              </button>
            ))}
          </Card>
        )}
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3">
        <button onClick={() => go({ view: "product", id: "new" })} className="flex min-h-14 items-center justify-center gap-2 rounded-2xl bg-sage-deep px-3 font-semibold text-ivory">
          <PlusIcon className="size-5" /> Add product
        </button>
        <a href="/" target="_blank" rel="noreferrer" className="flex min-h-14 items-center justify-center gap-2 rounded-2xl border border-line bg-ivory px-3 font-semibold">
          <StoreIcon className="size-5" /> View store
        </a>
      </div>

      <div className="mt-6">
        <SalesChart days={summary.days} week={summary.week} />
      </div>

      <LatestOrders orders={orders.slice(0, 4)} onAll={() => go({ view: "orders", filter: "all" })} />
    </div>
  );
}

function SalesChart({ days, week }: { days: ReturnType<typeof salesSummary>["days"]; week: number }) {
  const [selected, setSelected] = useState(days.length - 1);
  const max = Math.max(1, ...days.map((d) => d.total));
  const day = days[selected];

  return (
    <Card className="p-4">
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="text-[0.95rem] font-semibold">Sales, last 7 days</h2>
        <p className="text-[0.9rem] font-semibold tabular-nums">{formatLKR(week)}</p>
      </div>
      <p className="mt-1 text-[0.85rem] text-ink/60 tabular-nums" aria-live="polite">
        {day.date.toLocaleDateString("en-LK", { weekday: "long", day: "numeric", month: "short" })}: {formatLKR(day.total)} · {day.count} {day.count === 1 ? "order" : "orders"}
      </p>
      <div className="mt-3 grid h-32 grid-cols-7 border-b border-line">
        {days.map((d, i) => (
          <button
            key={d.key}
            onClick={() => setSelected(i)}
            aria-pressed={i === selected}
            aria-label={`${d.label}: ${formatLKR(d.total)}, ${d.count} orders`}
            className="flex h-full items-end justify-center px-[3px]"
          >
            <span
              className={`block w-full max-w-9 rounded-t-[4px] transition-colors ${i === selected ? "bg-sage-deep" : "bg-sage"}`}
              style={{ height: d.total > 0 ? `${Math.max(4, (d.total / max) * 100)}%` : "2px" }}
            />
          </button>
        ))}
      </div>
      <div className="mt-1.5 grid grid-cols-7">
        {days.map((d, i) => (
          <span key={d.key} className={`text-center text-[0.75rem] ${i === selected ? "font-semibold" : "text-ink/55"}`}>{d.label}</span>
        ))}
      </div>
    </Card>
  );
}

function LatestOrders({ orders, onAll }: { orders: Order[]; onAll: () => void }) {
  if (orders.length === 0) return null;
  return (
    <div className="mt-6">
      <SectionTitle right={<button onClick={onAll} className="min-h-10 px-1 text-[0.9rem] font-medium text-sage-deep">See all</button>}>Latest orders</SectionTitle>
      <div className="space-y-2.5">
        {orders.map((o) => <OrderCard key={o.id} order={o} />)}
      </div>
    </div>
  );
}
