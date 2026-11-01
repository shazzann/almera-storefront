"use client";

import Link from "next/link";
import { useState } from "react";
import { Chip, EmptyState } from "@/components/admin/ui";
import { OrderCard } from "./order-card";
import { isActiveOrder } from "./order-status";
import { ScreenTitle } from "./shell";
import type { AccountOrder } from "./types";

const FILTERS = [
  { key: "all", label: "All", test: () => true },
  { key: "active", label: "Active", test: isActiveOrder },
  { key: "past", label: "Past", test: (o: AccountOrder) => !isActiveOrder(o) },
];

export function OrdersScreen({ orders }: { orders: AccountOrder[] }) {
  const [filter, setFilter] = useState("all");
  const active = FILTERS.find((f) => f.key === filter) ?? FILTERS[0];
  const visible = orders.filter(active.test);

  return (
    <>
      <ScreenTitle title="orders" />
      <div className="mt-4 px-4 lg:px-0">
        {orders.length === 0 ? (
          <EmptyState
            title="no orders yet"
            body="When you order from almera, you can follow it here."
            action={<Link href="/shop" className="btn btn-primary">Shop new arrivals</Link>}
          />
        ) : (
          <>
            <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 pb-1 lg:mx-0 lg:px-0">
              {FILTERS.map((f) => (
                <Chip key={f.key} on={f.key === filter} onClick={() => setFilter(f.key)} count={f.key === "all" ? undefined : orders.filter(f.test).length}>
                  {f.label}
                </Chip>
              ))}
            </div>
            <div className="mt-3 space-y-2.5">
              {visible.map((order) => <OrderCard key={order.id} order={order} />)}
              {visible.length === 0 && <p className="py-10 text-center text-ink/60">No {active.label.toLowerCase()} orders right now.</p>}
            </div>
          </>
        )}
      </div>
    </>
  );
}
