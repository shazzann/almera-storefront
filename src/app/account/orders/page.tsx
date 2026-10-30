import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { AccountNav } from "@/components/account-nav";
import { formatLKR } from "@/lib/catalog";
import { getCodBalanceDue, requiresCodDeposit } from "@/lib/cod-deposit";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "My Orders · almera",
  robots: { index: false },
};

export const instant = false;

export default async function AccountOrdersPage() {
  await connection();

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/account/login?next=/account/orders");
  }

  const { data: orders } = await supabase
    .from("orders")
    .select("*, order_items(*)")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 sm:py-12">
      <div className="mb-6">
        <p className="eyebrow text-gold-deep">Wardrobe Orders</p>
        <h1 className="display mt-1 text-4xl sm:text-5xl">order history</h1>
        <p className="mt-1 text-xs text-ink/60">
          Track previous and current deliveries, recorded deposits and balance due.
        </p>
      </div>

      <AccountNav />

      {!orders || orders.length === 0 ? (
        <div className="mt-8 rounded-2xl bg-ivory p-12 text-center">
          <p className="display text-3xl">no orders found</p>
          <p className="mt-2 text-sm text-ink/65">
            You haven’t placed any orders with this account yet.
          </p>
          <Link href="/shop" className="btn btn-primary mt-6">
            Shop new arrivals
          </Link>
        </div>
      ) : (
        <div className="mt-8 space-y-4">
          {orders.map((order) => {
            const depositPaid = Number(order.advance_deposit ?? 0);
            const balanceDue = getCodBalanceDue(order);
            const needsDep = requiresCodDeposit(order.payment_method, Number(order.total ?? 0));
            const items = order.order_items ?? [];

            return (
              <div
                key={order.id}
                className="rounded-2xl border border-line bg-ivory p-5 transition hover:border-ink/40"
              >
                <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono text-base font-semibold">{order.order_number}</span>
                      <span className="rounded-full bg-sage-soft px-3 py-0.5 text-xs font-semibold capitalize text-ink">
                        {order.status.replace(/_/g, " ")}
                      </span>
                      <span className="text-xs uppercase text-ink/55">{order.payment_method}</span>
                      {needsDep && depositPaid === 0 && order.status !== "cancelled" && (
                        <span className="rounded-full bg-gold/25 px-2.5 py-0.5 text-xs font-semibold text-gold-deep">
                          COD Deposit Pending
                        </span>
                      )}
                      {depositPaid > 0 && (
                        <span className="rounded-full bg-sage-soft px-2.5 py-0.5 text-xs font-semibold text-sage-deep">
                          Deposit Paid: {formatLKR(depositPaid)}
                        </span>
                      )}
                    </div>
                    <p className="mt-1 text-xs text-ink/60">
                      Placed on{" "}
                      {new Date(order.created_at).toLocaleDateString("en-LK", {
                        day: "numeric",
                        month: "long",
                        year: "numeric",
                      })}
                    </p>
                    <p className="mt-1 text-xs text-ink/75">
                      Delivering to {order.address}, {order.city}, {order.district}
                    </p>
                  </div>

                  <div className="text-left sm:text-right">
                    <p className="text-lg font-semibold tabular-nums">{formatLKR(Number(order.total))}</p>
                    {order.payment_method === "cod" && (
                      <p className="text-xs font-medium text-gold-deep">
                        Balance due on delivery: {formatLKR(balanceDue)}
                      </p>
                    )}
                    <Link
                      href={`/account/orders/${order.order_number}`}
                      className="mt-2 inline-block text-xs font-semibold underline underline-offset-4 hover:text-sage-deep"
                    >
                      View order details &amp; receipt →
                    </Link>
                  </div>
                </div>

                <ul className="mt-4 divide-y divide-line border-t border-line pt-2 text-xs">
                  {items.map((it: any) => (
                    <li key={it.id} className="flex justify-between py-1.5 text-ink/80">
                      <span>
                        {it.quantity} × {it.product_name}{" "}
                        <span className="text-ink/55 capitalize">
                          ({it.stitching}
                          {it.size && it.size !== "-" ? `, ${it.size}` : ""})
                        </span>
                      </span>
                      <span className="font-semibold tabular-nums">
                        {formatLKR(Number(it.unit_price) * Number(it.quantity))}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

