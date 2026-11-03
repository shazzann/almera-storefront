"use client";

import { OrderItemPhoto } from "@/components/order-item-photo";
import { useMemo, useState } from "react";
import { formatLKR } from "@/lib/catalog";
import { useAdmin } from "./admin-app";
import { ORDER_FILTERS, needsDeposit, num, timeAgo, type Order } from "./lib";
import { Chip, EmptyState, SearchBox, StatusPill, TopBar } from "./ui";

export function OrdersScreen() {
  const { data, filter: urlFilter } = useAdmin();
  const [filter, setFilter] = useState(urlFilter ?? "todo");
  const [query, setQuery] = useState("");

  const active = ORDER_FILTERS.find((f) => f.key === filter) ?? ORDER_FILTERS[0];
  const term = query.trim().toLowerCase();

  const visible = useMemo(() => {
    // A search looks through every order, so nobody has to guess which tab one is in.
    const pool = term ? data.orders : data.orders.filter(active.test);
    if (!term) return pool;
    return pool.filter((o) =>
      [o.order_number, o.customer_name, o.phone, o.email, o.city, o.district, o.coupon_code]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(term),
    );
  }, [data.orders, active, term]);

  return (
    <>
      <TopBar title="orders" />
      <div className="mx-auto max-w-3xl px-4 pt-4 pb-6">
        <SearchBox value={query} onChange={setQuery} placeholder="Name, phone or order number" />
        {!term && (
          <div className="no-scrollbar -mx-4 mt-3 flex gap-2 overflow-x-auto px-4 pb-1">
            {ORDER_FILTERS.map((f) => (
              <Chip key={f.key} on={f.key === active.key} onClick={() => setFilter(f.key)} count={f.key === "all" ? undefined : data.orders.filter(f.test).length}>
                {f.label}
              </Chip>
            ))}
          </div>
        )}
        <div className="mt-4 space-y-2.5">
          {visible.length === 0 ? (
            <EmptyState
              title={term ? "no matches" : "nothing here"}
              body={term ? `No order matches “${query.trim()}”. Try a phone number or order number.` : `There are no orders in ${active.label} right now.`}
            />
          ) : (
            visible.map((o) => <OrderCard key={o.id} order={o} />)
          )}
        </div>
      </div>
    </>
  );
}

export function OrderCard({ order: o }: { order: Order }) {
  const { go } = useAdmin();
  const items = o.order_items ?? [];
  const pieces = items.reduce((n, it) => n + num(it.quantity), 0);
  const thumbs = items.filter((it) => it.image_url).slice(0, 3);

  return (
    <button onClick={() => go({ view: "order", id: o.id })} className="block w-full rounded-[1.25rem] border border-line bg-ivory p-4 text-left transition active:scale-[0.99]">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-[1.05rem] font-semibold">{o.customer_name}</p>
          <p className="mt-0.5 truncate text-[0.85rem] text-ink/60">
            {o.order_number} · {timeAgo(o.created_at)}
          </p>
        </div>
        <StatusPill status={o.status} />
      </div>
      <div className="mt-3 flex items-center gap-3">
        {thumbs.length > 0 && (
          <span className="flex shrink-0 -space-x-3">
            {thumbs.map((it) => (
              <span key={it.id} className="relative size-11 overflow-hidden rounded-lg border-2 border-ivory bg-sage-soft">
                <OrderItemPhoto src={it.image_url} sizes="44px" compact />
              </span>
            ))}
          </span>
        )}
        <span className="min-w-0 flex-1 truncate text-[0.88rem] text-ink/70">
          {pieces} {pieces === 1 ? "piece" : "pieces"} · {o.district}
        </span>
        <span className="font-semibold tabular-nums">{formatLKR(num(o.total))}</span>
      </div>
      {needsDeposit(o) && (
        <p className="mt-2.5 rounded-lg bg-gold/15 px-3 py-1.5 text-[0.82rem] font-medium text-gold-deep">Waiting for COD deposit</p>
      )}
    </button>
  );
}
