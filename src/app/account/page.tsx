import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { AccountNav } from "@/components/account-nav";
import { isAdminEmail } from "@/lib/admin-config";
import { formatLKR } from "@/lib/catalog";
import { getCodBalanceDue, requiresCodDeposit } from "@/lib/cod-deposit";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "My Account",
  robots: { index: false },
};

export const instant = false;

export default async function AccountOverviewPage() {
  await connection();

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/account/login");
  }

  const [{ data: profile }, { data: recentOrders }, { data: defaultAddress }] = await Promise.all([
    supabase.from("profiles").select("*").eq("id", user.id).maybeSingle(),
    supabase
      .from("orders")
      .select("*, order_items(*)")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(3),
    supabase
      .from("customer_addresses")
      .select("*")
      .eq("user_id", user.id)
      .eq("is_default", true)
      .maybeSingle(),
  ]);

  const customerName =
    profile?.full_name ||
    user.user_metadata?.full_name ||
    user.user_metadata?.name ||
    user.email?.split("@")[0] ||
    "Friend";

  const totalOrdersCount = recentOrders?.length ?? 0;

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 sm:py-12">
      <div className="mb-6">
        <p className="eyebrow text-gold-deep">Wardrobe Account</p>
        <h1 className="display mt-1 text-4xl sm:text-5xl">
          welcome back, <em className="text-sage-deep">{customerName.split(" ")[0].toLowerCase()}</em>
        </h1>
        <p className="mt-1 text-xs text-ink/60">
          Signed in as {user.email} {profile?.phone ? `· ${profile.phone}` : ""}
        </p>
      </div>

      <AccountNav />

      {isAdminEmail(user.email) && (
        <div className="mt-8 flex flex-col items-start justify-between gap-4 rounded-2xl border border-gold/40 bg-gold/10 p-5 sm:flex-row sm:items-center">
          <div>
            <span className="eyebrow text-gold-deep">Administrator Access</span>
            <p className="mt-1 text-sm font-semibold text-charcoal">
              Backoffice Store Management
            </p>
            <p className="text-xs text-ink/70">
              Manage catalog pieces, order fulfillment, bank transfer slips, and promo codes.
            </p>
          </div>
          <Link href="/admin" className="btn btn-primary shrink-0 px-4 py-2 text-xs">
            Open Admin Console →
          </Link>
        </div>
      )}

      {/* Quick Summary Cards */}
      <div className="mt-8 grid gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-line bg-ivory p-5">
          <p className="eyebrow text-ink/55">Order History</p>
          <p className="display mt-2 text-3xl">{totalOrdersCount}</p>
          <p className="mt-1 text-xs text-ink/65">
            {totalOrdersCount === 1 ? "Order placed" : "Orders placed with almera"}
          </p>
          <Link
            href="/account/orders"
            className="mt-4 inline-block text-xs font-semibold underline underline-offset-4 hover:text-sage-deep"
          >
            View all orders →
          </Link>
        </div>

        <div className="rounded-2xl border border-line bg-ivory p-5">
          <p className="eyebrow text-ink/55">Default Shipping</p>
          {defaultAddress ? (
            <div className="mt-2 text-xs leading-relaxed text-ink/75">
              <p className="font-semibold text-ink">{defaultAddress.recipient_name}</p>
              <p>{defaultAddress.address}</p>
              <p>
                {defaultAddress.city}, {defaultAddress.district}
              </p>
              <p>{defaultAddress.phone}</p>
            </div>
          ) : (
            <p className="mt-2 text-xs text-ink/65">No default address saved yet.</p>
          )}
          <Link
            href="/account/addresses"
            className="mt-4 inline-block text-xs font-semibold underline underline-offset-4 hover:text-sage-deep"
          >
            Manage addresses →
          </Link>
        </div>

        <div className="rounded-2xl border border-line bg-ivory p-5">
          <p className="eyebrow text-ink/55">Wardrobe Concierge</p>
          <p className="mt-2 text-xs leading-relaxed text-ink/75">
            Questions about measurements, unstitched fabric or your order status?
          </p>
          <div className="mt-4 flex gap-2">
            <a
              href="https://chat.whatsapp.com/G5xidVIQxc3Cw0bEEpnach"
              target="_blank"
              rel="noreferrer"
              className="rounded-full border border-line bg-mist px-3 py-1.5 text-xs font-medium hover:border-ink"
            >
              WhatsApp Community
            </a>
            <Link
              href="/account/profile"
              className="rounded-full border border-line bg-mist px-3 py-1.5 text-xs font-medium hover:border-ink"
            >
              Edit Profile
            </Link>
          </div>
        </div>
      </div>

      {/* Recent Orders Section */}
      <div className="mt-10">
        <div className="flex items-center justify-between border-b border-line pb-3">
          <h2 className="display text-2xl">recent orders</h2>
          <Link
            href="/account/orders"
            className="text-xs font-semibold underline underline-offset-4 hover:text-sage-deep"
          >
            View all
          </Link>
        </div>

        {!recentOrders || recentOrders.length === 0 ? (
          <div className="mt-6 rounded-2xl bg-ivory p-10 text-center">
            <p className="display text-3xl">no orders yet</p>
            <p className="mt-2 text-sm text-ink/65">
              When you order pieces from almera, they will appear right here with live dispatch updates.
            </p>
            <Link href="/shop" className="btn btn-primary mt-6">
              Shop new arrivals
            </Link>
          </div>
        ) : (
          <div className="mt-4 space-y-4">
            {recentOrders.map((order) => {
              const depositPaid = Number(order.advance_deposit ?? 0);
              const balanceDue = getCodBalanceDue(order);
              const needsDep = requiresCodDeposit(order.payment_method, Number(order.total ?? 0));
              const items = order.order_items ?? [];

              return (
                <div
                  key={order.id}
                  className="flex flex-col justify-between gap-4 rounded-2xl border border-line bg-ivory p-5 sm:flex-row sm:items-center"
                >
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono text-base font-semibold">{order.order_number}</span>
                      <span className="rounded-full bg-sage-soft px-3 py-0.5 text-xs font-semibold capitalize text-ink">
                        {order.status.replace(/_/g, " ")}
                      </span>
                      <span className="text-xs uppercase text-ink/55">{order.payment_method}</span>
                      {needsDep && depositPaid === 0 && order.status !== "cancelled" && (
                        <span className="rounded-full bg-gold/25 px-2.5 py-0.5 text-xs font-semibold text-gold-deep">
                          Advance deposit pending
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-ink/60">
                      Placed on{" "}
                      {new Date(order.created_at).toLocaleDateString("en-LK", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}{" "}
                      · {items.length} {items.length === 1 ? "piece" : "pieces"}
                    </p>
                    <p className="text-xs text-ink/75">
                      Delivering to {order.city}, {order.district}
                    </p>
                  </div>

                  <div className="flex items-center justify-between gap-6 border-t border-line pt-3 sm:border-0 sm:pt-0 sm:text-right">
                    <div>
                      <p className="text-base font-semibold tabular-nums">{formatLKR(Number(order.total))}</p>
                      {order.payment_method === "cod" && (
                        <p className="text-[11px] text-ink/60">
                          Balance on delivery: {formatLKR(balanceDue)}
                        </p>
                      )}
                    </div>
                    <Link
                      href={`/account/orders/${order.order_number}`}
                      className="rounded-full border border-line bg-mist px-4 py-2 text-xs font-semibold transition hover:border-ink"
                    >
                      View details
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

