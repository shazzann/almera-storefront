"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  deleteCouponAction,
  getAdminDashboardDataAction,
  getAdminStatusAction,
  recordBankDepositAction,
  refundOrderAction,
  updateOrderStatusAction,
  upsertCategoryAction,
  upsertCouponAction,
  upsertProductAction,
} from "@/actions/admin";
import {
  DENIM_SIZES,
  SIZES,
  categories as allCategories,
  formatLKR,
  type CategorySlug,
} from "@/lib/catalog";
import {
  COD_MIN_DEPOSIT,
  getCodBalanceDue,
  requiresCodDeposit,
} from "@/lib/cod-deposit";
import { optimizeImageToWebP } from "@/lib/image-optimizer";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";

type Tab = "orders" | "products" | "categories" | "coupons" | "audit";

const ORDERS_PER_PAGE = 10;
const PRODUCTS_PER_PAGE = 9;

const ORDER_STATUSES = [
  "pending",
  "awaiting_bank_slip",
  "confirmed",
  "shipped",
  "delivered",
  "cancelled",
] as const;

function escapeHtml(raw: unknown): string {
  return String(raw ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function AdminDashboard() {
  const [token, setToken] = useState<string | null>(null);
  const [authState, setAuthState] = useState<{
    loading: boolean;
    supabaseConfigured: boolean;
    authenticated: boolean;
    email: string | null;
    error?: string;
  }>({
    loading: true,
    supabaseConfigured: false,
    authenticated: false,
    email: null,
  });

  const [emailInput, setEmailInput] = useState("");
  const [passwordInput, setPasswordInput] = useState("");
  const [loginBusy, setLoginBusy] = useState(false);

  const [tab, setTab] = useState<Tab>("orders");
  const [dbCategories, setDbCategories] = useState<any[]>(allCategories);
  const [products, setProducts] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [coupons, setCoupons] = useState<any[]>([]);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [banner, setBanner] = useState<{ kind: "ok" | "err"; text: string } | null>(null);
  const [busy, setBusy] = useState(false);

  // Filters, Pagination & Modals
  const [orderStatusFilter, setOrderStatusFilter] = useState<string>("all");
  const [orderQuery, setOrderQuery] = useState("");
  const [orderPage, setOrderPage] = useState(1);

  const [productQuery, setProductQuery] = useState("");
  const [lowStockOnly, setLowStockOnly] = useState(false);
  const [productPage, setProductPage] = useState(1);

  const [editingProduct, setEditingProduct] = useState<any | null>(null);
  const [editingCategory, setEditingCategory] = useState<any | null>(null);
  const [editingCoupon, setEditingCoupon] = useState<any | null>(null);
  const [depositOrder, setDepositOrder] = useState<any | null>(null);

  const refreshAll = useCallback(async (accessToken: string | null) => {
    const status = await getAdminStatusAction(accessToken);
    setAuthState({
      loading: false,
      supabaseConfigured: status.supabaseConfigured,
      authenticated: status.authenticated,
      email: status.email,
      error: status.error,
    });
    if (status.authenticated) {
      const data = await getAdminDashboardDataAction(accessToken);
      if (data.categories && data.categories.length > 0) {
        setDbCategories(data.categories);
      }
      setProducts(data.products);
      setOrders(data.orders);
      setCoupons(data.coupons);
      setAuditLogs(data.auditLogs);
    }
  }, []);

  useEffect(() => {
    const sb = getSupabaseBrowserClient();
    if (!sb) {
      refreshAll(null);
      return;
    }
    sb.auth.getSession().then(({ data }) => {
      const t = data.session?.access_token ?? null;
      setToken(t);
      refreshAll(t);
    });
  }, [refreshAll]);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    const sb = getSupabaseBrowserClient();
    if (!sb) return;
    setLoginBusy(true);
    setBanner(null);
    const { data, error } = await sb.auth.signInWithPassword({
      email: emailInput.trim(),
      password: passwordInput,
    });
    setLoginBusy(false);
    if (error || !data.session) {
      setBanner({ kind: "err", text: error?.message ?? "Sign in failed." });
      return;
    }
    setToken(data.session.access_token);
    await refreshAll(data.session.access_token);
  }

  async function handleSignOut() {
    const sb = getSupabaseBrowserClient();
    if (sb) await sb.auth.signOut();
    setToken(null);
    await refreshAll(null);
  }

  function exportOrdersCsv(orderRows: any[]) {
    const headers = [
      "Order Number",
      "Date",
      "Customer Name",
      "Phone",
      "City",
      "District",
      "Address",
      "Payment Method",
      "Status",
      "Order Total (LKR)",
      "Advance Deposit (LKR)",
      "Courier Balance Due (LKR)",
    ];
    const rows = orderRows.map((o) => {
      const balance = getCodBalanceDue(o);
      return [
        o.order_number,
        new Date(o.created_at).toISOString().slice(0, 10),
        o.customer_name,
        o.phone,
        o.city,
        o.district,
        o.address,
        o.payment_method,
        o.status,
        Number(o.total ?? 0),
        Number(o.advance_deposit ?? 0),
        balance,
      ]
        .map((cell) => `"${String(cell ?? "").replace(/"/g, '""')}"`)
        .join(",");
    });
    const csv = [headers.join(","), ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `almera-orders-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function printPackingSlip(order: any) {
    const balanceDue = getCodBalanceDue(order);
    const itemsHtml = (order.order_items ?? [])
      .map(
        (it: any) => `
          <tr>
            <td style="padding:8px 0;border-bottom:1px solid #ddd;">
              <strong>${escapeHtml(it.product_name)}</strong><br/>
              <span style="font-size:12px;color:#555;">Stitching: ${escapeHtml(it.stitching)}${it.size ? ` · Size ${escapeHtml(it.size)}` : ""}</span>
            </td>
            <td style="padding:8px 0;border-bottom:1px solid #ddd;text-align:center;">${Number(it.quantity)}</td>
            <td style="padding:8px 0;border-bottom:1px solid #ddd;text-align:right;">${formatLKR(Number(it.unit_price) * Number(it.quantity))}</td>
          </tr>`,
      )
      .join("");

    const win = window.open("", "_blank", "width=760,height=900");
    if (!win) return;
    win.document.write(`
      <!doctype html>
      <html>
        <head>
          <title>Packing Slip ${escapeHtml(order.order_number)} · almera</title>
          <style>
            body { font-family: Georgia, serif; color: #1f231e; padding: 32px; max-width: 680px; margin: 0 auto; }
            .header { display: flex; justify-content: space-between; border-bottom: 2px solid #1f231e; padding-bottom: 16px; }
            .box { background: #f6f3ec; padding: 14px; border-radius: 10px; margin-top: 16px; font-family: sans-serif; font-size: 13px; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; font-family: sans-serif; font-size: 13px; }
            .totals { margin-top: 16px; text-align: right; font-family: sans-serif; font-size: 14px; }
            .cod-banner { margin-top: 20px; padding: 14px; border: 2px solid #1f231e; text-align: center; font-family: sans-serif; font-size: 16px; font-weight: bold; }
          </style>
        </head>
        <body onload="window.print()">
          <div class="header">
            <div>
              <h1 style="margin:0;font-size:28px;letter-spacing:0.06em;">ALMERA</h1>
              <p style="margin:4px 0 0;font-size:12px;color:#555;">Wardrobe Packing Slip & Courier Sticker</p>
            </div>
            <div style="text-align:right;font-family:sans-serif;">
              <p style="margin:0;font-size:18px;font-weight:bold;">${escapeHtml(order.order_number)}</p>
              <p style="margin:4px 0 0;font-size:12px;color:#555;">${new Date(order.created_at).toLocaleDateString("en-LK")}</p>
            </div>
          </div>
          <div class="box">
            <strong>Deliver To:</strong><br/>
            ${escapeHtml(order.customer_name)} · <strong>${escapeHtml(order.phone)}</strong><br/>
            ${escapeHtml(order.address)}, ${escapeHtml(order.city)}, <strong>${escapeHtml(order.district)}</strong>
            ${order.notes ? `<br/><br/><strong>Stitching / Delivery Note:</strong> ${escapeHtml(order.notes)}` : ""}
          </div>
          <table>
            <thead>
              <tr>
                <th style="text-align:left;border-bottom:1px solid #1f231e;padding-bottom:6px;">Piece</th>
                <th style="text-align:center;border-bottom:1px solid #1f231e;padding-bottom:6px;">Qty</th>
                <th style="text-align:right;border-bottom:1px solid #1f231e;padding-bottom:6px;">Amount</th>
              </tr>
            </thead>
            <tbody>${itemsHtml}</tbody>
          </table>
          <div class="totals">
            <p style="margin:4px 0;">Subtotal: ${formatLKR(Number(order.subtotal))}</p>
            ${Number(order.discount_amount) > 0 ? `<p style="margin:4px 0;">Discount (${escapeHtml(order.coupon_code)}): −${formatLKR(Number(order.discount_amount))}</p>` : ""}
            <p style="margin:4px 0;">Delivery: ${formatLKR(Number(order.delivery_fee))}</p>
            <p style="margin:4px 0;font-weight:bold;">Order Total: ${formatLKR(Number(order.total))}</p>
            ${Number(order.advance_deposit) > 0 ? `<p style="margin:4px 0;color:#2f5a3b;">Advance Deposit Paid: −${formatLKR(Number(order.advance_deposit))}${order.bank_slip_reference ? ` (Ref: ${escapeHtml(order.bank_slip_reference)})` : ""}</p>` : ""}
            ${order.advance_deposit_note ? `<p style="margin:2px 0;font-size:12px;color:#555;">Deposit Note: ${escapeHtml(order.advance_deposit_note)}</p>` : ""}
            ${Number(order.refund_amount) > 0 ? `<p style="margin:4px 0;color:#a5432f;">Refunded: −${formatLKR(Number(order.refund_amount))}</p>` : ""}
          </div>
          <div class="cod-banner">
            COURIER BALANCE TO COLLECT ON DELIVERY: ${formatLKR(balanceDue)} (${escapeHtml(String(order.payment_method ?? "").toUpperCase())})
          </div>
        </body>
      </html>
    `);
    win.document.close();
  }

  const visibleOrders = useMemo(() => {
    return orders.filter((o) => {
      if (orderStatusFilter === "needs_cod_deposit") {
        const needsDep = requiresCodDeposit(o.payment_method, Number(o.total ?? 0));
        if (!needsDep || Number(o.advance_deposit ?? 0) >= COD_MIN_DEPOSIT || o.status === "cancelled") {
          return false;
        }
      } else if (orderStatusFilter !== "all" && o.status !== orderStatusFilter) {
        return false;
      }

      if (orderQuery.trim()) {
        const q = orderQuery.trim().toLowerCase();
        const hay = [
          o.order_number,
          o.customer_name,
          o.phone,
          o.email,
          o.city,
          o.district,
          o.coupon_code,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [orders, orderStatusFilter, orderQuery]);

  const totalOrderPages = Math.max(1, Math.ceil(visibleOrders.length / ORDERS_PER_PAGE));
  const paginatedOrders = useMemo(
    () => visibleOrders.slice((orderPage - 1) * ORDERS_PER_PAGE, orderPage * ORDERS_PER_PAGE),
    [visibleOrders, orderPage],
  );

  useEffect(() => {
    setOrderPage(1);
  }, [orderStatusFilter, orderQuery]);

  const visibleProducts = useMemo(() => {
    return products.filter((p) => {
      if (lowStockOnly) {
        const variants: any[] = Array.isArray(p.product_variants) ? p.product_variants : [];
        const hasLowVariant =
          Number(p.stock ?? 0) <= 3 || variants.some((v) => Number(v.stock ?? 0) <= 1);
        if (!hasLowVariant) return false;
      }
      if (!productQuery.trim()) return true;
      const q = productQuery.trim().toLowerCase();
      return [p.name, p.slug, p.colour, p.fabric, p.subcategory, ...(p.categories ?? [])]
        .join(" ")
        .toLowerCase()
        .includes(q);
    });
  }, [products, productQuery, lowStockOnly]);

  const totalProductPages = Math.max(1, Math.ceil(visibleProducts.length / PRODUCTS_PER_PAGE));
  const paginatedProducts = useMemo(
    () =>
      visibleProducts.slice(
        (productPage - 1) * PRODUCTS_PER_PAGE,
        productPage * PRODUCTS_PER_PAGE,
      ),
    [visibleProducts, productPage],
  );

  useEffect(() => {
    setProductPage(1);
  }, [productQuery, lowStockOnly]);

  // KPI Metrics
  const kpis = useMemo(() => {
    const activeOrders = orders.filter((o) => o.status !== "cancelled" && o.status !== "refunded");
    const revenue = activeOrders.reduce(
      (sum, o) => sum + Math.max(0, Number(o.total ?? 0) - Number(o.refund_amount ?? 0)),
      0,
    );
    const depositsCollected = activeOrders.reduce(
      (sum, o) => sum + Number(o.advance_deposit ?? 0),
      0,
    );
    const courierBalancePending = activeOrders
      .filter((o) => o.status !== "delivered")
      .reduce((sum, o) => sum + getCodBalanceDue(o), 0);
    const lowStockCount = products.filter((p) => Number(p.stock ?? 0) <= 3).length;
    return { revenue, depositsCollected, courierBalancePending, lowStockCount };
  }, [orders, products]);

  if (authState.loading) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-20 text-center text-sm text-ink/60">
        Verifying admin session…
      </div>
    );
  }

  if (authState.supabaseConfigured && !authState.authenticated) {
    return (
      <div className="mx-auto max-w-md px-4 py-16">
        <div className="rounded-[1.75rem] border border-line bg-ivory p-8">
          <p className="eyebrow text-gold-deep">almera admin</p>
          <h1 className="display mt-2 text-4xl">sign in</h1>
          <p className="mt-2 text-sm text-ink/65">
            Sign in with the Almera administrator account.
          </p>
          {(banner || authState.error) && (
            <p className="mt-4 rounded-xl bg-[#a5432f]/10 p-3 text-xs text-[#a5432f]">
              {banner?.text ?? authState.error}
            </p>
          )}
          <form onSubmit={handleLogin} className="mt-6 space-y-4">
            <div>
              <label className="mb-1 block text-xs font-medium">Email</label>
              <input
                type="email"
                required
                value={emailInput}
                onChange={(e) => setEmailInput(e.target.value)}
                className="field"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium">Password</label>
              <input
                type="password"
                required
                value={passwordInput}
                onChange={(e) => setPasswordInput(e.target.value)}
                className="field"
              />
            </div>
            <button type="submit" disabled={loginBusy} className="btn btn-primary w-full">
              {loginBusy ? "Signing in…" : "Sign in"}
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-8 sm:py-12">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-line pb-6">
        <div>
          <p className="eyebrow text-gold-deep">Backoffice Console</p>
          <h1 className="display mt-1 text-4xl sm:text-5xl">wardrobe &amp; orders</h1>
          <p className="mt-1 text-xs text-ink/60">Signed in as {authState.email}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2.5">
          {authState.supabaseConfigured && (
            <button onClick={handleSignOut} className="btn btn-ghost px-4 py-2 text-xs">
              Sign out
            </button>
          )}
        </div>
      </div>

      {/* KPI Summary Cards */}
      <div className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <div className="rounded-2xl border border-line bg-ivory p-4">
          <p className="text-[11px] font-semibold tracking-wider text-ink/55 uppercase">
            Active Order Revenue
          </p>
          <p className="mt-1 text-xl font-semibold tabular-nums">{formatLKR(kpis.revenue)}</p>
        </div>
        <div className="rounded-2xl border border-line bg-ivory p-4">
          <p className="text-[11px] font-semibold tracking-wider text-ink/55 uppercase">
            Deposits Collected
          </p>
          <p className="mt-1 text-xl font-semibold text-sage-deep tabular-nums">
            {formatLKR(kpis.depositsCollected)}
          </p>
        </div>
        <div className="rounded-2xl border border-line bg-ivory p-4">
          <p className="text-[11px] font-semibold tracking-wider text-ink/55 uppercase">
            Courier Balance Pending
          </p>
          <p className="mt-1 text-xl font-semibold text-gold-deep tabular-nums">
            {formatLKR(kpis.courierBalancePending)}
          </p>
        </div>
        <div className="rounded-2xl border border-line bg-ivory p-4">
          <p className="text-[11px] font-semibold tracking-wider text-ink/55 uppercase">
            Low / Sold Out Pieces
          </p>
          <p className="mt-1 text-xl font-semibold tabular-nums">
            {kpis.lowStockCount} / {products.length}
          </p>
        </div>
      </div>

      {banner && (
        <div
          className={`mt-5 rounded-2xl px-4 py-3 text-sm ${
            banner.kind === "ok"
              ? "bg-sage-soft text-sage-deep"
              : "bg-[#a5432f]/10 text-[#a5432f]"
          }`}
        >
          {banner.text}
        </div>
      )}

      {/* Tabs */}
      <div className="mt-6 flex gap-2 overflow-x-auto border-b border-line pb-3">
        {(
          [
            ["orders", `Orders (${orders.length})`],
            ["products", `Products (${products.length})`],
            ["categories", `Categories (${dbCategories.length})`],
            ["coupons", `Coupons (${coupons.length})`],
            ["audit", `Audit Log (${auditLogs.length})`],
          ] as const
        ).map(([key, label]) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`shrink-0 rounded-full px-4 py-2 text-sm font-medium transition ${
              tab === key ? "bg-ink text-ivory" : "bg-ivory text-ink/70 hover:text-ink"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* ORDERS TAB */}
      {tab === "orders" && (
        <div className="mt-6 space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <input
              type="search"
              value={orderQuery}
              onChange={(e) => setOrderQuery(e.target.value)}
              placeholder="Search order #, customer name, phone, district…"
              className="field max-w-sm py-2 text-sm"
            />
            <button
              type="button"
              onClick={() => exportOrdersCsv(visibleOrders)}
              className="btn btn-ghost px-4 py-2 text-xs"
            >
              Export CSV ({visibleOrders.length})
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {[
              ["all", "All"],
              ["needs_cod_deposit", "Needs COD Deposit"],
              ...ORDER_STATUSES.map((s) => [s, s.replace(/_/g, " ")]),
              ["partially_refunded", "Partially refunded"],
              ["refunded", "Refunded"],
            ].map(([st, label]) => (
              <button
                key={st}
                onClick={() => setOrderStatusFilter(st)}
                className={`rounded-full border px-3.5 py-1.5 text-xs font-medium capitalize ${
                  orderStatusFilter === st
                    ? "border-ink bg-ink text-ivory"
                    : "border-line bg-ivory text-ink/70"
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          {depositOrder && (
            <DepositEditorModal
              order={depositOrder}
              busy={busy}
              onClose={() => setDepositOrder(null)}
              onSave={async (payload) => {
                setBusy(true);
                setBanner(null);
                try {
                  await recordBankDepositAction(token, payload);
                  setDepositOrder(null);
                  await refreshAll(token);
                  setBanner({
                    kind: "ok",
                    text: `Recorded advance deposit (${formatLKR(payload.depositAmount)}) for ${depositOrder.order_number}.`,
                  });
                } catch (err) {
                  setBanner({
                    kind: "err",
                    text: err instanceof Error ? err.message : "Failed to record deposit.",
                  });
                } finally {
                  setBusy(false);
                }
              }}
            />
          )}

          {visibleOrders.length === 0 ? (
            <div className="rounded-2xl bg-ivory p-12 text-center text-sm text-ink/60">
              No orders matching this filter yet.
            </div>
          ) : (
            <>
              <div className="space-y-4">
                {paginatedOrders.map((o) => {
                  const orderTotal = Number(o.total ?? 0);
                  const depositPaid = Number(o.advance_deposit ?? 0);
                  const balanceDue = getCodBalanceDue(o);
                  const needsCodDep = requiresCodDeposit(o.payment_method, orderTotal);
                  return (
                    <div key={o.id} className="rounded-2xl border border-line bg-ivory p-5">
                      <div className="flex flex-wrap items-start justify-between gap-4">
                        <div>
                          <div className="flex flex-wrap items-center gap-2.5">
                            <span className="font-mono text-base font-semibold">
                              {o.order_number}
                            </span>
                            <span className="rounded-full bg-sage-soft px-3 py-0.5 text-xs font-medium capitalize">
                              {o.status.replace(/_/g, " ")}
                            </span>
                            <span className="text-xs text-ink/55 uppercase">
                              {o.payment_method}
                            </span>
                            {needsCodDep && depositPaid < COD_MIN_DEPOSIT && (
                              <span className="rounded-full bg-gold/25 px-2.5 py-0.5 text-xs font-semibold text-gold-deep">
                                COD Deposit Pending (Min {formatLKR(COD_MIN_DEPOSIT)})
                              </span>
                            )}
                            {depositPaid > 0 && (
                              <span className="rounded-full bg-sage-soft px-2.5 py-0.5 text-xs font-semibold text-sage-deep">
                                Deposit Paid: {formatLKR(depositPaid)}
                              </span>
                            )}
                          </div>
                          <p className="mt-1 text-sm font-medium">
                            {o.customer_name} · {o.phone} {o.email ? `· ${o.email}` : ""}
                          </p>
                          <p className="text-xs text-ink/65">
                            {o.address}, {o.city}, {o.district}
                          </p>
                          {o.notes && (
                            <p className="mt-1.5 rounded-lg bg-mist px-3 py-1.5 text-xs text-ink/80">
                              <strong>Note:</strong> {o.notes}
                            </p>
                          )}
                        </div>

                        <div className="text-right">
                          <p className="text-lg font-semibold tabular-nums">
                            {formatLKR(orderTotal)}
                          </p>
                          {depositPaid > 0 && (
                            <p className="text-xs text-sage-deep">
                              Advance Deposit: −{formatLKR(depositPaid)}
                              {o.bank_slip_reference ? ` (Ref: ${o.bank_slip_reference})` : ""}
                            </p>
                          )}
                          {o.advance_deposit_note && (
                            <p className="text-[11px] text-ink/60">
                              Deposit Note: {o.advance_deposit_note}
                            </p>
                          )}
                          {Number(o.refund_amount ?? 0) > 0 && (
                            <p className="text-xs text-[#a5432f]">
                              Refunded: −{formatLKR(Number(o.refund_amount))}
                            </p>
                          )}
                          <p className="mt-1 text-xs font-semibold text-ink">
                            Courier Balance Due: {formatLKR(balanceDue)}
                          </p>
                          <button
                            onClick={() => printPackingSlip(o)}
                            className="mt-2 text-xs underline underline-offset-4"
                          >
                            Print packing slip / courier sticker
                          </button>
                        </div>
                      </div>

                      <ul className="mt-3 divide-y divide-line border-t border-line pt-2 text-xs">
                        {(o.order_items ?? []).map((it: any) => (
                          <li key={it.id} className="flex justify-between py-1.5">
                            <span>
                              {it.quantity} × {it.product_name}{" "}
                              <span className="text-ink/55 capitalize">
                                ({it.stitching}
                                {it.size && it.size !== "-" ? `, ${it.size}` : ""})
                              </span>
                            </span>
                            <span className="font-medium tabular-nums">
                              {formatLKR(Number(it.unit_price) * Number(it.quantity))}
                            </span>
                          </li>
                        ))}
                      </ul>

                      <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-line pt-3">
                        <label className="flex items-center gap-1.5 text-xs">
                          <span className="text-ink/60">Status:</span>
                          <select
                            value={o.status}
                            disabled={busy}
                            onChange={async (e) => {
                              const nextStatus = e.target.value as any;
                              setBusy(true);
                              setBanner(null);
                              try {
                                await updateOrderStatusAction(token, {
                                  orderId: o.id,
                                  nextStatus,
                                });
                                await refreshAll(token);
                                setBanner({
                                  kind: "ok",
                                  text: `Updated ${o.order_number} to ${nextStatus}.`,
                                });
                              } catch (err) {
                                setBanner({
                                  kind: "err",
                                  text: err instanceof Error ? err.message : "Update failed.",
                                });
                              } finally {
                                setBusy(false);
                              }
                            }}
                            className="rounded-lg border border-line bg-mist px-2.5 py-1.5 text-xs font-medium"
                          >
                            {ORDER_STATUSES.map((st) => (
                              <option key={st} value={st}>
                                {st.replace(/_/g, " ")}
                              </option>
                            ))}
                          </select>
                        </label>

                        <button
                          type="button"
                          onClick={() => setDepositOrder(o)}
                          className="rounded-lg border border-line bg-mist px-3 py-1.5 text-xs font-medium hover:border-ink"
                        >
                          {o.payment_method === "cod"
                            ? "Record COD Deposit"
                            : "Record Bank Slip"}
                        </button>

                        <button
                          type="button"
                          onClick={async () => {
                            const amtStr = window.prompt(
                              `Refund amount (LKR) for ${o.order_number}:`,
                              String(Number(o.total) - Number(o.refund_amount ?? 0)),
                            );
                            if (!amtStr) return;
                            const reason =
                              window.prompt("Reason for refund:", "Customer request") ?? "";
                            setBusy(true);
                            try {
                              await refundOrderAction(token, {
                                orderId: o.id,
                                refundAmount: Number(amtStr),
                                reason,
                              });
                              await refreshAll(token);
                              setBanner({
                                kind: "ok",
                                text: `Processed refund for ${o.order_number}.`,
                              });
                            } catch (err) {
                              setBanner({
                                kind: "err",
                                text: err instanceof Error ? err.message : "Refund failed.",
                              });
                            } finally {
                              setBusy(false);
                            }
                          }}
                          className="rounded-lg border border-line bg-mist px-3 py-1.5 text-xs text-[#a5432f] hover:border-[#a5432f]"
                        >
                          Issue Refund
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>

              {totalOrderPages > 1 && (
                <PaginationControls
                  page={orderPage}
                  totalPages={totalOrderPages}
                  totalItems={visibleOrders.length}
                  pageSize={ORDERS_PER_PAGE}
                  onPageChange={setOrderPage}
                />
              )}
            </>
          )}
        </div>
      )}

      {/* PRODUCTS TAB */}
      {tab === "products" && (
        <div className="mt-6 space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-1 flex-wrap items-center gap-3">
              <input
                type="search"
                value={productQuery}
                onChange={(e) => setProductQuery(e.target.value)}
                placeholder="Search by name, slug, fabric, category…"
                className="field max-w-sm py-2 text-sm"
              />
              <label className="flex items-center gap-2 text-xs font-medium">
                <input
                  type="checkbox"
                  checked={lowStockOnly}
                  onChange={(e) => setLowStockOnly(e.target.checked)}
                />
                Low / sold-out sizes only
              </label>
            </div>
            <button
              onClick={() =>
                setEditingProduct({
                  slug: "",
                  name: "",
                  categories: ["lawns"],
                  subcategory: "",
                  colour: "",
                  fabric: "",
                  price_unstitched: 11450,
                  price_stitched: 14950,
                  was_price_unstitched: null,
                  was_price_stitched: null,
                  images: [],
                  pieces: ["Kurta", "Trouser", "Dupatta"],
                  sizes: [...SIZES],
                  tags: ["new"],
                  description: "",
                  care: "",
                  stock: 5,
                  is_featured: false,
                  is_active: true,
                })
              }
              className="btn btn-primary px-5 py-2.5 text-xs"
            >
              + New Product
            </button>
          </div>

          {editingProduct && (
            <ProductEditorModal
              initial={editingProduct}
              dbCategories={dbCategories}
              onClose={() => setEditingProduct(null)}
              onSave={async (payload) => {
                setBusy(true);
                setBanner(null);
                try {
                  await upsertProductAction(token, payload);
                  setEditingProduct(null);
                  await refreshAll(token);
                  setBanner({ kind: "ok", text: `Saved product "${payload.name}".` });
                } catch (err) {
                  setBanner({
                    kind: "err",
                    text: err instanceof Error ? err.message : "Failed to save product.",
                  });
                } finally {
                  setBusy(false);
                }
              }}
            />
          )}

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {paginatedProducts.map((p) => {
              const variants: any[] = Array.isArray(p.product_variants)
                ? p.product_variants
                : [];
              const unstitchedVar = variants.find((v) => v.stitching === "unstitched");
              const stitchedVars = variants.filter((v) => v.stitching === "stitched");
              return (
                <div
                  key={p.slug}
                  className="flex flex-col justify-between rounded-2xl border border-line bg-ivory p-4"
                >
                  <div>
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h3 className="font-semibold">{p.name}</h3>
                        <p className="font-mono text-xs text-ink/55">{p.slug}</p>
                      </div>
                      <span
                        className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                          Number(p.stock) === 0
                            ? "bg-[#a5432f]/15 text-[#a5432f]"
                            : Number(p.stock) <= 3
                              ? "bg-gold/20 text-gold-deep"
                              : "bg-sage-soft text-sage-deep"
                        }`}
                      >
                        Total: {p.stock}
                      </span>
                    </div>
                    <p className="mt-2 text-xs text-ink/65">
                      {p.colour} · {p.fabric}
                    </p>
                    <p className="mt-1 text-xs text-ink/65">
                      Categories: {(p.categories ?? []).join(", ")}
                      {p.subcategory ? ` (${p.subcategory})` : ""}
                    </p>
                    <p className="mt-2 text-xs font-semibold">
                      {p.price_unstitched != null &&
                        `Unstitched: ${formatLKR(Number(p.price_unstitched))} `}
                      {p.price_stitched != null &&
                        `· Stitched: ${formatLKR(Number(p.price_stitched))}`}
                    </p>
                    {variants.length > 0 && (
                      <div className="mt-2.5 flex flex-wrap gap-1.5 border-t border-line/70 pt-2">
                        {p.price_unstitched != null && unstitchedVar && (
                          <span
                            className={`rounded-md px-2 py-0.5 font-mono text-[11px] ${
                              Number(unstitchedVar.stock) === 0
                                ? "bg-[#a5432f]/10 text-[#a5432f]"
                                : "bg-mist text-ink/80"
                            }`}
                          >
                            Unstitched: {unstitchedVar.stock}
                          </span>
                        )}
                        {p.price_stitched != null &&
                          (p.sizes ?? SIZES).map((sz: string) => {
                            const sv = stitchedVars.find((v) => v.size === sz);
                            const qty = Number(sv?.stock ?? 0);
                            return (
                              <span
                                key={sz}
                                className={`rounded-md px-2 py-0.5 font-mono text-[11px] ${
                                  qty === 0
                                    ? "bg-[#a5432f]/10 text-[#a5432f]"
                                    : "bg-mist text-ink/80"
                                }`}
                              >
                                {sz}: {qty}
                              </span>
                            );
                          })}
                      </div>
                    )}
                  </div>
                  <div className="mt-4 flex justify-end border-t border-line pt-3">
                    <button
                      onClick={() => setEditingProduct(p)}
                      className="text-xs font-semibold underline underline-offset-4"
                    >
                      Edit piece
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {totalProductPages > 1 && (
            <PaginationControls
              page={productPage}
              totalPages={totalProductPages}
              totalItems={visibleProducts.length}
              pageSize={PRODUCTS_PER_PAGE}
              onPageChange={setProductPage}
            />
          )}
        </div>
      )}

      {/* CATEGORIES TAB */}
      {tab === "categories" && (
        <div className="mt-6 space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-xs text-ink/60">
              Manage storefront categories, descriptions, hero images, and subcategory filter chips.
            </p>
            <button
              type="button"
              onClick={() =>
                setEditingCategory({
                  slug: "",
                  name: "",
                  nav_group: "Everyday",
                  subcategories: [],
                  description: "",
                  image_url: "",
                  sort_order: dbCategories.length + 1,
                  is_active: true,
                })
              }
              className="btn btn-primary px-5 py-2.5 text-xs"
            >
              + New Category
            </button>
          </div>

          {editingCategory && (
            <CategoryEditorModal
              initial={editingCategory}
              busy={busy}
              onClose={() => setEditingCategory(null)}
              onSave={async (payload) => {
                setBusy(true);
                setBanner(null);
                try {
                  await upsertCategoryAction(token, payload);
                  setEditingCategory(null);
                  await refreshAll(token);
                  setBanner({
                    kind: "ok",
                    text: `Saved category "${payload.name}".`,
                  });
                } catch (err) {
                  setBanner({
                    kind: "err",
                    text: err instanceof Error ? err.message : "Failed to save category.",
                  });
                } finally {
                  setBusy(false);
                }
              }}
            />
          )}

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {dbCategories.map((cat: any) => (
              <div
                key={cat.slug}
                className="flex flex-col justify-between rounded-2xl border border-line bg-ivory p-4"
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h3 className="font-semibold">{cat.name}</h3>
                      <p className="font-mono text-xs text-ink/55">{cat.slug}</p>
                    </div>
                    <span className="rounded-full bg-mist px-2.5 py-0.5 text-[11px] font-medium">
                      {cat.nav_group || "Everyday"}
                    </span>
                  </div>
                  <p className="mt-2 line-clamp-2 text-xs text-ink/65">
                    {cat.description || cat.blurb || "No description"}
                  </p>
                  {Array.isArray(cat.subcategories) && cat.subcategories.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-1">
                      {cat.subcategories.map((sub: string) => (
                        <span
                          key={sub}
                          className="rounded-full bg-sage-soft px-2 py-0.5 text-[11px] font-medium text-sage-deep"
                        >
                          {sub}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
                <div className="mt-4 flex justify-end border-t border-line pt-3">
                  <button
                    type="button"
                    onClick={() =>
                      setEditingCategory({
                        id: cat.id,
                        slug: cat.slug,
                        name: cat.name,
                        nav_group: cat.nav_group || "Everyday",
                        subcategories: cat.subcategories ?? [],
                        description: cat.description || cat.blurb || "",
                        image_url: cat.image_url || cat.image || "",
                        sort_order: Number(cat.sort_order ?? 0),
                        is_active: cat.is_active !== false,
                      })
                    }
                    className="text-xs font-semibold underline underline-offset-4"
                  >
                    Edit category &amp; subcategories
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* COUPONS TAB */}
      {tab === "coupons" && (
        <div className="mt-6 space-y-5">
          <div className="flex items-center justify-between gap-3">
            <p className="text-xs text-ink/60">
              Manage public and private/influencer promo codes, category restrictions, and usage
              quotas.
            </p>
            <button
              onClick={() =>
                setEditingCoupon({
                  code: "",
                  discount_type: "percentage",
                  discount_value: 10,
                  min_order_value: 10000,
                  max_discount_amount: 5000,
                  max_uses: null,
                  expires_at: null,
                  is_public: true,
                  first_order_only: false,
                  exclude_sale_items: false,
                  allowed_categories: [],
                  allowed_subcategories: [],
                  is_active: true,
                })
              }
              className="btn btn-primary px-5 py-2.5 text-xs"
            >
              + New Promo Code
            </button>
          </div>

          {editingCoupon && (
            <CouponEditorModal
              initial={editingCoupon}
              dbCategories={dbCategories}
              busy={busy}
              onClose={() => setEditingCoupon(null)}
              onSave={async (payload) => {
                setBusy(true);
                setBanner(null);
                try {
                  await upsertCouponAction(token, payload);
                  setEditingCoupon(null);
                  await refreshAll(token);
                  setBanner({ kind: "ok", text: `Saved promo code "${payload.code}".` });
                } catch (err) {
                  setBanner({
                    kind: "err",
                    text: err instanceof Error ? err.message : "Failed to save promo code.",
                  });
                } finally {
                  setBusy(false);
                }
              }}
            />
          )}

          {coupons.length === 0 ? (
            <div className="rounded-2xl bg-ivory p-12 text-center text-sm text-ink/60">
              No promo codes configured yet.
            </div>
          ) : (
            <div className="overflow-x-auto rounded-2xl border border-line bg-ivory">
              <table className="w-full text-left text-xs">
                <thead className="border-b border-line bg-mist/60 text-ink/60 uppercase">
                  <tr>
                    <th className="px-4 py-3">Code</th>
                    <th className="px-4 py-3">Discount</th>
                    <th className="px-4 py-3">Min Spend / Cap</th>
                    <th className="px-4 py-3">Usage / Expiry</th>
                    <th className="px-4 py-3">Rules &amp; Scope</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {coupons.map((c) => {
                    const isExpired =
                      c.expires_at && new Date(c.expires_at).getTime() < Date.now();
                    const allowedCats: string[] = Array.isArray(c.allowed_categories)
                      ? c.allowed_categories
                      : [];
                    const allowedSubs: string[] = Array.isArray(c.allowed_subcategories)
                      ? c.allowed_subcategories
                      : [];
                    return (
                      <tr key={c.code}>
                        <td className="px-4 py-3">
                          <span className="font-mono text-sm font-bold">{c.code}</span>
                          <div className="mt-1 flex flex-wrap gap-1">
                            <span
                              className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${
                                c.is_public
                                  ? "bg-sage-soft text-sage-deep"
                                  : "bg-gold/20 text-gold-deep"
                              }`}
                            >
                              {c.is_public ? "Public" : "Private / Influencer"}
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-3 font-medium">
                          {c.discount_type === "percentage"
                            ? `${c.discount_value}% off`
                            : c.discount_type === "free_delivery"
                              ? "Free delivery"
                              : `${formatLKR(Number(c.discount_value))} off`}
                        </td>
                        <td className="px-4 py-3 text-ink/75">
                          <div>Min: {formatLKR(Number(c.min_order_value ?? 0))}</div>
                          {c.max_discount_amount != null && Number(c.max_discount_amount) > 0 && (
                            <div className="text-[11px] text-ink/55">
                              Cap: {formatLKR(Number(c.max_discount_amount))}
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-3 text-ink/75">
                          <div className="font-mono">
                            {c.used_count ?? 0}
                            {c.max_uses ? ` / ${c.max_uses}` : " / ∞"}
                          </div>
                          {c.expires_at && (
                            <div
                              className={`text-[11px] ${
                                isExpired ? "font-semibold text-[#a5432f]" : "text-ink/55"
                              }`}
                            >
                              {isExpired ? "Expired: " : "Expires: "}
                              {new Date(c.expires_at).toLocaleDateString("en-LK")}
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex flex-wrap gap-1">
                            {c.first_order_only && (
                              <span className="rounded bg-mist px-1.5 py-0.5 text-[10px]">
                                First order only
                              </span>
                            )}
                            {c.exclude_sale_items && (
                              <span className="rounded bg-mist px-1.5 py-0.5 text-[10px]">
                                Excludes sale items
                              </span>
                            )}
                            {allowedCats.length > 0 && (
                              <span className="rounded bg-mist px-1.5 py-0.5 text-[10px]">
                                Categories: {allowedCats.join(", ")}
                              </span>
                            )}
                            {allowedSubs.length > 0 && (
                              <span className="rounded bg-mist px-1.5 py-0.5 text-[10px]">
                                Subcategories: {allowedSubs.join(", ")}
                              </span>
                            )}
                            {!c.first_order_only &&
                              !c.exclude_sale_items &&
                              allowedCats.length === 0 &&
                              allowedSubs.length === 0 && (
                                <span className="text-ink/45">All items</span>
                              )}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <button
                            type="button"
                            disabled={busy}
                            onClick={async () => {
                              setBusy(true);
                              try {
                                await upsertCouponAction(token, {
                                  id: c.id,
                                  code: c.code,
                                  discount_type: c.discount_type,
                                  discount_value: Number(c.discount_value ?? 0),
                                  min_order_value: Number(c.min_order_value ?? 0),
                                  max_discount_amount:
                                    c.max_discount_amount != null
                                      ? Number(c.max_discount_amount)
                                      : null,
                                  max_uses: c.max_uses != null ? Number(c.max_uses) : null,
                                  expires_at: c.expires_at ?? null,
                                  is_public: Boolean(c.is_public),
                                  first_order_only: Boolean(c.first_order_only),
                                  exclude_sale_items: Boolean(c.exclude_sale_items),
                                  allowed_categories: allowedCats,
                                  allowed_subcategories: allowedSubs,
                                  is_active: !c.is_active,
                                });
                                await refreshAll(token);
                              } catch (err) {
                                setBanner({
                                  kind: "err",
                                  text:
                                    err instanceof Error
                                      ? err.message
                                      : "Failed to toggle coupon.",
                                });
                              } finally {
                                setBusy(false);
                              }
                            }}
                            className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
                              c.is_active
                                ? "bg-sage-soft text-sage-deep"
                                : "bg-line text-ink/50"
                            }`}
                          >
                            {c.is_active ? "Active" : "Paused"}
                          </button>
                        </td>
                        <td className="px-4 py-3 text-right whitespace-nowrap">
                          <button
                            type="button"
                            onClick={() => setEditingCoupon(c)}
                            className="mr-3 text-xs font-medium underline underline-offset-4"
                          >
                            Edit
                          </button>
                          {c.id && (
                            <button
                              type="button"
                              disabled={busy}
                              onClick={async () => {
                                if (!window.confirm(`Delete promo code "${c.code}"?`)) return;
                                setBusy(true);
                                try {
                                  await deleteCouponAction(token, c.id);
                                  await refreshAll(token);
                                  setBanner({
                                    kind: "ok",
                                    text: `Deleted promo code "${c.code}".`,
                                  });
                                } catch (err) {
                                  setBanner({
                                    kind: "err",
                                    text:
                                      err instanceof Error
                                        ? err.message
                                        : "Failed to delete promo code.",
                                  });
                                } finally {
                                  setBusy(false);
                                }
                              }}
                              className="text-xs text-[#a5432f] underline underline-offset-4"
                            >
                              Delete
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* AUDIT LOG TAB */}
      {tab === "audit" && (
        <div className="mt-6">
          {auditLogs.length === 0 ? (
            <div className="rounded-2xl bg-ivory p-12 text-center text-sm text-ink/60">
              No audit events recorded yet.
            </div>
          ) : (
            <div className="overflow-x-auto rounded-2xl border border-line bg-ivory">
              <table className="w-full text-left text-xs">
                <thead className="border-b border-line bg-mist/60 text-ink/60 uppercase">
                  <tr>
                    <th className="px-4 py-3">Timestamp</th>
                    <th className="px-4 py-3">Action</th>
                    <th className="px-4 py-3">Entity</th>
                    <th className="px-4 py-3">Details</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {auditLogs.map((log: any) => (
                    <tr key={log.id}>
                      <td className="px-4 py-3 whitespace-nowrap text-ink/60">
                        {new Date(log.created_at).toLocaleString("en-LK")}
                      </td>
                      <td className="px-4 py-3 font-mono font-semibold">{log.action}</td>
                      <td className="px-4 py-3">
                        {log.entity_type} {log.entity_id ? `(${log.entity_id.slice(0, 8)})` : ""}
                      </td>
                      <td className="px-4 py-3 font-mono text-[11px] text-ink/70">
                        {JSON.stringify(log.details)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function PaginationControls({
  page,
  totalPages,
  totalItems,
  pageSize,
  onPageChange,
}: {
  page: number;
  totalPages: number;
  totalItems: number;
  pageSize: number;
  onPageChange: (next: number) => void;
}) {
  const start = (page - 1) * pageSize + 1;
  const end = Math.min(totalItems, page * pageSize);
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-line bg-ivory px-4 py-3 text-xs">
      <span className="text-ink/65">
        Showing <strong>{start}</strong>–<strong>{end}</strong> of{" "}
        <strong>{totalItems}</strong>
      </span>
      <div className="flex items-center gap-2">
        <button
          type="button"
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
          className="rounded-lg border border-line bg-mist px-3 py-1.5 font-medium disabled:opacity-40"
        >
          ← Previous
        </button>
        <span className="px-2 font-mono">
          Page {page} / {totalPages}
        </span>
        <button
          type="button"
          disabled={page >= totalPages}
          onClick={() => onPageChange(page + 1)}
          className="rounded-lg border border-line bg-mist px-3 py-1.5 font-medium disabled:opacity-40"
        >
          Next →
        </button>
      </div>
    </div>
  );
}

function CategoryEditorModal({
  initial,
  busy,
  onClose,
  onSave,
}: {
  initial: any;
  busy: boolean;
  onClose: () => void;
  onSave: (payload: any) => Promise<void>;
}) {
  const [form, setForm] = useState({
    id: initial.id,
    slug: initial.slug ?? "",
    name: initial.name ?? "",
    nav_group: (initial.nav_group ?? "Everyday") as "Everyday" | "Special" | "More",
    subcategoriesText: Array.isArray(initial.subcategories)
      ? initial.subcategories.join(", ")
      : "",
    description: initial.description ?? "",
    image_url: initial.image_url ?? "",
    sort_order: String(initial.sort_order ?? 1),
    is_active: initial.is_active !== false,
  });

  return (
    <div className="rounded-2xl border border-line bg-ivory p-6">
      <div className="flex items-center justify-between">
        <h3 className="display text-3xl">
          {form.id ? "edit category" : "new category"}
        </h3>
        <button type="button" onClick={onClose} className="text-xs underline">
          Close
        </button>
      </div>

      <div className="mt-5 grid gap-4 sm:grid-cols-3">
        <div>
          <label className="mb-1 block text-xs font-medium">Category Name</label>
          <input
            value={form.name}
            onChange={(e) => {
              const name = e.target.value;
              const autoSlug = !form.id
                ? name
                    .toLowerCase()
                    .replace(/[^a-z0-9]+/g, "-")
                    .replace(/^-|-$/g, "")
                : form.slug;
              setForm({ ...form, name, slug: autoSlug });
            }}
            className="field"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium">Slug (URL key)</label>
          <input
            value={form.slug}
            onChange={(e) => setForm({ ...form, slug: e.target.value.toLowerCase() })}
            className="field font-mono text-sm"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium">Menu Group</label>
          <select
            value={form.nav_group}
            onChange={(e) =>
              setForm({
                ...form,
                nav_group: e.target.value as "Everyday" | "Special" | "More",
              })
            }
            className="field"
          >
            <option value="Everyday">Everyday</option>
            <option value="Special">Special</option>
            <option value="More">More</option>
          </select>
        </div>
        <div className="sm:col-span-2">
          <label className="mb-1 block text-xs font-medium">
            Subcategories (comma-separated, e.g. Cotton, Rayon, Muslin)
          </label>
          <input
            value={form.subcategoriesText}
            onChange={(e) => setForm({ ...form, subcategoriesText: e.target.value })}
            placeholder="Cotton, Rayon, Muslin"
            className="field"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium">Sort Order</label>
          <input
            type="number"
            min={0}
            value={form.sort_order}
            onChange={(e) => setForm({ ...form, sort_order: e.target.value })}
            className="field"
          />
        </div>
        <div className="sm:col-span-3">
          <label className="mb-1 block text-xs font-medium">Hero Image URL</label>
          <input
            value={form.image_url}
            onChange={(e) => setForm({ ...form, image_url: e.target.value })}
            className="field font-mono text-xs"
          />
        </div>
        <div className="sm:col-span-3">
          <label className="mb-1 block text-xs font-medium">Description / Blurb</label>
          <textarea
            rows={2}
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            className="field text-sm"
          />
        </div>
      </div>

      <div className="mt-5 flex justify-end gap-2">
        <button type="button" onClick={onClose} className="btn btn-ghost px-4 py-2 text-xs">
          Cancel
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={() =>
            onSave({
              id: form.id,
              slug: form.slug.trim(),
              name: form.name.trim(),
              nav_group: form.nav_group,
              subcategories: form.subcategoriesText
                .split(",")
                .map((s: string) => s.trim())
                .filter(Boolean),
              description: form.description.trim(),
              image_url: form.image_url.trim(),
              sort_order: Number(form.sort_order || 0),
              is_active: form.is_active,
            })
          }
          className="btn btn-primary px-5 py-2 text-xs"
        >
          Save Category
        </button>
      </div>
    </div>
  );
}

function ProductEditorModal({
  initial,
  dbCategories,
  onClose,
  onSave,
}: {
  initial: any;
  dbCategories: Array<{ slug: string; name: string; subcategories?: string[] }>;
  onClose: () => void;
  onSave: (payload: any) => Promise<void>;
}) {
  const selectableCategories = (dbCategories.length > 0 ? dbCategories : allCategories).filter(
    (c) => c.slug !== "ready-to-wear",
  );

  const initialVariants: any[] = Array.isArray(initial.product_variants)
    ? initial.product_variants
    : [];
  const initialSizes: string[] =
    Array.isArray(initial.sizes) && initial.sizes.length > 0 ? initial.sizes : [...SIZES];

  const initialUnstitchedVar = initialVariants.find((v) => v.stitching === "unstitched");
  const initialUnstitchedStock =
    initialUnstitchedVar != null
      ? Number(initialUnstitchedVar.stock ?? 0)
      : initial.price_unstitched != null && initial.price_stitched == null
        ? Number(initial.stock ?? 0)
        : initial.price_unstitched != null
          ? 2
          : 0;

  const initialSizeStocks: Record<string, number> = {};
  for (const sz of [...SIZES, ...DENIM_SIZES]) {
    const sv = initialVariants.find((v) => v.stitching === "stitched" && v.size === sz);
    if (sv != null) {
      initialSizeStocks[sz] = Number(sv.stock ?? 0);
    } else if (initialVariants.length === 0 && initialSizes.includes(sz)) {
      initialSizeStocks[sz] = 1;
    } else {
      initialSizeStocks[sz] = 0;
    }
  }

  const [form, setForm] = useState({
    id: initial.id?.startsWith("demo-") ? undefined : initial.id,
    slug: initial.slug ?? "",
    name: initial.name ?? "",
    categories: (initial.categories?.length ? initial.categories : ["lawns"]) as CategorySlug[],
    subcategory: initial.subcategory ?? "",
    colour: initial.colour ?? "",
    fabric: initial.fabric ?? "",
    price_unstitched:
      initial.price_unstitched != null ? String(initial.price_unstitched) : "",
    price_stitched: initial.price_stitched != null ? String(initial.price_stitched) : "",
    was_price_unstitched:
      initial.was_price_unstitched != null ? String(initial.was_price_unstitched) : "",
    was_price_stitched:
      initial.was_price_stitched != null ? String(initial.was_price_stitched) : "",
    imagesText: (initial.images ?? []).join("\n"),
    piecesText: (initial.pieces ?? []).join("\n"),
    sizes: initialSizes,
    unstitched_stock: initialUnstitchedStock,
    size_stocks: initialSizeStocks,
    tags: (initial.tags ?? []) as ("new" | "bestseller" | "festive")[],
    description: initial.description ?? "",
    care: initial.care ?? "",
    is_featured: Boolean(initial.is_featured),
    is_active: initial.is_active !== false,
  });
  const [uploading, setUploading] = useState(false);

  const hasUnstitched = form.price_unstitched.trim() !== "";
  const hasStitched = form.price_stitched.trim() !== "";

  const unstitchedStockNum = hasUnstitched
    ? Math.max(0, Math.floor(form.unstitched_stock || 0))
    : 0;
  const stitchedStockSum = hasStitched
    ? form.sizes.reduce(
        (sum, sz) => sum + Math.max(0, Math.floor(Number(form.size_stocks[sz] ?? 0))),
        0,
      )
    : 0;
  const computedTotalStock = unstitchedStockNum + stitchedStockSum;

  const primaryCategory = form.categories[0] ?? "lawns";
  const secondaryCategories = form.categories.slice(1);

  const matchingSubcategoryGroups = selectableCategories.filter(
    (c) =>
      form.categories.includes(c.slug as CategorySlug) &&
      Array.isArray(c.subcategories) &&
      c.subcategories.length > 0,
  );
  const otherSubcategoryGroups = selectableCategories.filter(
    (c) =>
      !form.categories.includes(c.slug as CategorySlug) &&
      Array.isArray(c.subcategories) &&
      c.subcategories.length > 0,
  );

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const sb = getSupabaseBrowserClient();
    if (!sb) {
      alert("Configure NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY first.");
      return;
    }
    setUploading(true);
    try {
      const optimized = await optimizeImageToWebP(file);
      const safeName = optimized.name.replace(/[^a-zA-Z0-9._-]/g, "-");
      const path = `products/${Date.now()}-${safeName}`;
      const { error } = await sb.storage
        .from("product-images")
        .upload(path, optimized, { contentType: "image/webp", upsert: false });
      if (error) throw error;
      const { data: pub } = sb.storage.from("product-images").getPublicUrl(path);
      setForm((f) => ({
        ...f,
        imagesText: [f.imagesText.trim(), pub.publicUrl].filter(Boolean).join("\n"),
      }));
    } catch (err) {
      alert(err instanceof Error ? err.message : "Image upload failed.");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="rounded-2xl border border-line bg-ivory p-6">
      <div className="flex items-center justify-between">
        <h2 className="display text-3xl">{form.id ? "edit piece" : "new piece"}</h2>
        <button onClick={onClose} className="text-xs underline">
          Close
        </button>
      </div>

      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-xs font-medium">Name</label>
          <input
            value={form.name}
            onChange={(e) => {
              const name = e.target.value;
              const autoSlug = !form.id
                ? name
                    .toLowerCase()
                    .replace(/[^a-z0-9]+/g, "-")
                    .replace(/^-|-$/g, "")
                : form.slug;
              setForm({ ...form, name, slug: autoSlug });
            }}
            className="field"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium">Slug (URL key)</label>
          <input
            value={form.slug}
            onChange={(e) => setForm({ ...form, slug: e.target.value })}
            className="field font-mono text-sm"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium">Primary Category</label>
          <select
            value={primaryCategory}
            onChange={(e) => {
              const nextPrimary = e.target.value as CategorySlug;
              const rest = form.categories.filter((c) => c !== nextPrimary);
              setForm({ ...form, categories: [nextPrimary, ...rest] });
            }}
            className="field"
          >
            {selectableCategories.map((c) => (
              <option key={c.slug} value={c.slug}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium">Subcategory</label>
          <select
            value={form.subcategory}
            onChange={(e) => setForm({ ...form, subcategory: e.target.value })}
            className="field"
          >
            <option value="">None (No subcategory chip)</option>
            {matchingSubcategoryGroups.map((group) => (
              <optgroup key={group.slug} label={`${group.name} Subcategories`}>
                {(group.subcategories ?? []).map((sub) => (
                  <option key={`${group.slug}-${sub}`} value={sub}>
                    {sub}
                  </option>
                ))}
              </optgroup>
            ))}
            {otherSubcategoryGroups.map((group) => (
              <optgroup key={group.slug} label={`Other (${group.name})`}>
                {(group.subcategories ?? []).map((sub) => (
                  <option key={`${group.slug}-${sub}`} value={sub}>
                    {sub}
                  </option>
                ))}
              </optgroup>
            ))}
          </select>
        </div>
        <div className="sm:col-span-2">
          <label className="mb-1 block text-xs font-medium">
            Additional Categories (Optional — appears in multiple drawers)
          </label>
          <div className="flex flex-wrap items-center gap-2">
            <select
              value=""
              onChange={(e) => {
                const addSlug = e.target.value as CategorySlug;
                if (!addSlug || form.categories.includes(addSlug)) return;
                setForm({ ...form, categories: [...form.categories, addSlug] });
              }}
              className="field max-w-xs py-2 text-xs"
            >
              <option value="">+ Add another category from catalog…</option>
              {selectableCategories
                .filter((c) => !form.categories.includes(c.slug as CategorySlug))
                .map((c) => (
                  <option key={c.slug} value={c.slug}>
                    {c.name}
                  </option>
                ))}
            </select>
            {secondaryCategories.map((slug) => {
              const catObj = selectableCategories.find((c) => c.slug === slug);
              return (
                <span
                  key={slug}
                  className="inline-flex items-center gap-1.5 rounded-full bg-ink px-3 py-1 text-xs text-ivory"
                >
                  {catObj?.name ?? slug}
                  <button
                    type="button"
                    onClick={() =>
                      setForm({
                        ...form,
                        categories: form.categories.filter((c) => c !== slug),
                      })
                    }
                    aria-label={`Remove ${catObj?.name ?? slug}`}
                    className="ml-1 text-ivory/75 hover:text-ivory"
                  >
                    ×
                  </button>
                </span>
              );
            })}
          </div>
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium">Colour</label>
          <input
            value={form.colour}
            onChange={(e) => setForm({ ...form, colour: e.target.value })}
            className="field"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium">Fabric</label>
          <input
            value={form.fabric}
            onChange={(e) => setForm({ ...form, fabric: e.target.value })}
            className="field"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium">
            Unstitched Price (LKR, blank if stitched-only)
          </label>
          <input
            type="number"
            value={form.price_unstitched}
            onChange={(e) => setForm({ ...form, price_unstitched: e.target.value })}
            className="field"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium">Stitched Price (LKR)</label>
          <input
            type="number"
            value={form.price_stitched}
            onChange={(e) => setForm({ ...form, price_stitched: e.target.value })}
            className="field"
          />
        </div>
      </div>

      {/* Inventory Breakdown */}
      <div className="mt-5 rounded-2xl border border-line bg-mist/40 p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <p className="text-xs font-semibold tracking-wider text-ink/70 uppercase">
              Inventory &amp; Stock by Size
            </p>
            <p className="text-xs text-ink/55">
              Stock is tracked separately for each option and size. Total stock updates
              automatically.
            </p>
          </div>
          <span className="rounded-full bg-ink px-3.5 py-1 text-xs font-semibold text-ivory">
            Total Stock: {computedTotalStock}
          </span>
        </div>

        {hasUnstitched && (
          <div className="mt-4 max-w-xs">
            <label className="mb-1 block text-xs font-medium">
              Unstitched Stock Quantity (3-piece fabric packs)
            </label>
            <input
              type="number"
              min={0}
              value={form.unstitched_stock}
              onChange={(e) =>
                setForm({
                  ...form,
                  unstitched_stock: Math.max(0, Math.floor(Number(e.target.value) || 0)),
                })
              }
              className="field"
            />
          </div>
        )}

        {hasStitched && (
          <div className="mt-4">
            <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium">Stitched Size Chart:</span>
                <button
                  type="button"
                  onClick={() => setForm({ ...form, sizes: [...SIZES] })}
                  className={`rounded-lg border px-2.5 py-1 text-xs font-medium ${
                    form.sizes[0] === "XS"
                      ? "border-ink bg-ink text-ivory"
                      : "border-line bg-ivory text-ink/75"
                  }`}
                >
                  Standard (XS–XL)
                </button>
                <button
                  type="button"
                  onClick={() => setForm({ ...form, sizes: [...DENIM_SIZES] })}
                  className={`rounded-lg border px-2.5 py-1 text-xs font-medium ${
                    form.sizes[0] === "26"
                      ? "border-ink bg-ink text-ivory"
                      : "border-line bg-ivory text-ink/75"
                  }`}
                >
                  Denim (26–34)
                </button>
              </div>
              <span className="text-xs text-ink/60">
                Stitched Sizes Subtotal: <strong>{stitchedStockSum}</strong>
              </span>
            </div>

            <div className="grid grid-cols-5 gap-2.5">
              {form.sizes.map((sz) => (
                <div key={sz} className="rounded-xl border border-line bg-ivory p-2.5">
                  <label className="mb-1 block text-center text-xs font-semibold">
                    Size {sz}
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={form.size_stocks[sz] ?? 0}
                    onChange={(e) => {
                      const val = Math.max(0, Math.floor(Number(e.target.value) || 0));
                      setForm((f) => ({
                        ...f,
                        size_stocks: {
                          ...f.size_stocks,
                          [sz]: val,
                        },
                      }));
                    }}
                    className="field py-1.5 text-center font-mono text-sm"
                  />
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="mt-4 flex flex-wrap gap-4">
        <div>
          <p className="mb-1.5 text-xs font-medium">Badges / Tags</p>
          <div className="flex gap-2">
            {(["new", "bestseller", "festive"] as const).map((t) => {
              const on = form.tags.includes(t);
              return (
                <button
                  key={t}
                  type="button"
                  onClick={() =>
                    setForm((f) => ({
                      ...f,
                      tags: on ? f.tags.filter((x) => x !== t) : [...f.tags, t],
                    }))
                  }
                  className={`rounded-full border px-3 py-1 text-xs capitalize ${
                    on ? "border-ink bg-ink text-ivory" : "border-line bg-mist"
                  }`}
                >
                  {t}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <div>
          <div className="mb-1 flex items-center justify-between">
            <label className="text-xs font-medium">Images (one URL per line)</label>
            <label className="cursor-pointer text-xs underline">
              {uploading ? "Optimizing WebP…" : "+ Upload photo"}
              <input
                type="file"
                accept="image/*"
                onChange={handleFileUpload}
                className="sr-only"
              />
            </label>
          </div>
          <textarea
            rows={3}
            value={form.imagesText}
            onChange={(e) => setForm({ ...form, imagesText: e.target.value })}
            className="field font-mono text-xs"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium">
            Included Pieces (one per line)
          </label>
          <textarea
            rows={3}
            value={form.piecesText}
            onChange={(e) => setForm({ ...form, piecesText: e.target.value })}
            className="field text-xs"
          />
        </div>
      </div>

      <div className="mt-4">
        <label className="mb-1 block text-xs font-medium">Description</label>
        <textarea
          rows={2}
          value={form.description}
          onChange={(e) => setForm({ ...form, description: e.target.value })}
          className="field text-sm"
        />
      </div>

      <div className="mt-5 flex justify-end gap-2">
        <button type="button" onClick={onClose} className="btn btn-ghost px-4 py-2 text-xs">
          Cancel
        </button>
        <button
          type="button"
          onClick={() =>
            onSave({
              id: form.id,
              slug: form.slug,
              name: form.name,
              categories: form.categories,
              subcategory: form.subcategory || null,
              colour: form.colour,
              fabric: form.fabric,
              price_unstitched: form.price_unstitched ? Number(form.price_unstitched) : null,
              price_stitched: form.price_stitched ? Number(form.price_stitched) : null,
              was_price_unstitched: form.was_price_unstitched
                ? Number(form.was_price_unstitched)
                : null,
              was_price_stitched: form.was_price_stitched
                ? Number(form.was_price_stitched)
                : null,
              images: form.imagesText
                .split("\n")
                .map((s: string) => s.trim())
                .filter(Boolean),
              pieces: form.piecesText
                .split("\n")
                .map((s: string) => s.trim())
                .filter(Boolean),
              sizes: form.sizes,
              tags: form.tags,
              description: form.description,
              care: form.care || null,
              stock: computedTotalStock,
              unstitched_stock: hasUnstitched ? unstitchedStockNum : null,
              size_stocks: hasStitched
                ? Object.fromEntries(
                    form.sizes.map((sz) => [
                      sz,
                      Math.max(0, Math.floor(Number(form.size_stocks[sz] ?? 0))),
                    ]),
                  )
                : undefined,
              is_featured: form.is_featured,
              is_active: form.is_active,
            })
          }
          className="btn btn-primary px-6 py-2 text-xs"
        >
          Save Piece
        </button>
      </div>
    </div>
  );
}

function CouponEditorModal({
  initial,
  dbCategories,
  busy,
  onClose,
  onSave,
}: {
  initial: any;
  dbCategories: Array<{ slug: string; name: string; subcategories?: string[] }>;
  busy: boolean;
  onClose: () => void;
  onSave: (payload: any) => Promise<void>;
}) {
  const categoryList = dbCategories.length > 0 ? dbCategories : allCategories;
  const allSubcategoryOptions = Array.from(
    new Set(categoryList.flatMap((c) => c.subcategories ?? [])),
  );

  const [form, setForm] = useState({
    id: initial.id,
    code: initial.code ?? "",
    discount_type: (initial.discount_type ?? "percentage") as
      | "percentage"
      | "fixed"
      | "free_delivery",
    discount_value: String(initial.discount_value ?? 10),
    min_order_value: String(initial.min_order_value ?? 0),
    max_discount_amount:
      initial.max_discount_amount != null ? String(initial.max_discount_amount) : "",
    max_uses: initial.max_uses != null ? String(initial.max_uses) : "",
    expires_at: initial.expires_at
      ? new Date(initial.expires_at).toISOString().slice(0, 16)
      : "",
    is_public: initial.is_public !== false,
    first_order_only: Boolean(initial.first_order_only),
    exclude_sale_items: Boolean(initial.exclude_sale_items),
    allowed_categories: (Array.isArray(initial.allowed_categories)
      ? initial.allowed_categories
      : []) as string[],
    allowed_subcategories: (Array.isArray(initial.allowed_subcategories)
      ? initial.allowed_subcategories
      : []) as string[],
    is_active: initial.is_active !== false,
  });

  return (
    <div className="rounded-2xl border border-line bg-ivory p-6">
      <div className="flex items-center justify-between">
        <h3 className="display text-3xl">
          {form.id ? "edit promo code" : "new promo code"}
        </h3>
        <button type="button" onClick={onClose} className="text-xs underline">
          Close
        </button>
      </div>

      <div className="mt-5 grid gap-4 sm:grid-cols-3">
        <div>
          <label className="mb-1 block text-xs font-medium">Promo Code</label>
          <input
            value={form.code}
            onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })}
            className="field font-mono uppercase"
            placeholder="ALMERA10"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium">Discount Type</label>
          <select
            value={form.discount_type}
            onChange={(e) =>
              setForm({
                ...form,
                discount_type: e.target.value as "percentage" | "fixed" | "free_delivery",
              })
            }
            className="field"
          >
            <option value="percentage">Percentage (%)</option>
            <option value="fixed">Fixed Amount (LKR)</option>
            <option value="free_delivery">Free Island-Wide Delivery</option>
          </select>
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium">
            {form.discount_type === "percentage"
              ? "Percentage (1–100%)"
              : form.discount_type === "fixed"
                ? "Fixed Discount (LKR)"
                : "Discount Value (N/A for Free Delivery)"}
          </label>
          <input
            type="number"
            min={0}
            max={form.discount_type === "percentage" ? 100 : undefined}
            disabled={form.discount_type === "free_delivery"}
            value={form.discount_type === "free_delivery" ? 0 : form.discount_value}
            onChange={(e) => setForm({ ...form, discount_value: e.target.value })}
            className="field"
          />
        </div>

        <div>
          <label className="mb-1 block text-xs font-medium">Minimum Order Value (LKR)</label>
          <input
            type="number"
            min={0}
            value={form.min_order_value}
            onChange={(e) => setForm({ ...form, min_order_value: e.target.value })}
            className="field"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium">
            Max Discount Cap (LKR, optional)
          </label>
          <input
            type="number"
            min={0}
            disabled={form.discount_type !== "percentage"}
            value={form.max_discount_amount}
            onChange={(e) => setForm({ ...form, max_discount_amount: e.target.value })}
            placeholder="e.g. 5000"
            className="field"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium">
            Max Total Redemptions (optional)
          </label>
          <input
            type="number"
            min={1}
            value={form.max_uses}
            onChange={(e) => setForm({ ...form, max_uses: e.target.value })}
            placeholder="Unlimited"
            className="field"
          />
        </div>

        <div>
          <label className="mb-1 block text-xs font-medium">
            Expiry Date &amp; Time (optional)
          </label>
          <input
            type="datetime-local"
            value={form.expires_at}
            onChange={(e) => setForm({ ...form, expires_at: e.target.value })}
            className="field text-xs"
          />
        </div>

        <div className="flex flex-wrap items-center gap-4 pt-5 sm:col-span-2">
          <label className="flex items-center gap-2 text-xs font-medium">
            <input
              type="checkbox"
              checked={form.is_public}
              onChange={(e) => setForm({ ...form, is_public: e.target.checked })}
            />
            Public offer (show in Bag &amp; Checkout)
          </label>
          <label className="flex items-center gap-2 text-xs font-medium">
            <input
              type="checkbox"
              checked={form.first_order_only}
              onChange={(e) => setForm({ ...form, first_order_only: e.target.checked })}
            />
            First order only
          </label>
          <label className="flex items-center gap-2 text-xs font-medium">
            <input
              type="checkbox"
              checked={form.exclude_sale_items}
              onChange={(e) => setForm({ ...form, exclude_sale_items: e.target.checked })}
            />
            Exclude already discounted pieces
          </label>
          <label className="flex items-center gap-2 text-xs font-medium">
            <input
              type="checkbox"
              checked={form.is_active}
              onChange={(e) => setForm({ ...form, is_active: e.target.checked })}
            />
            Active
          </label>
        </div>
      </div>

      {/* Category & Subcategory Scoping */}
      <div className="mt-5 grid gap-4 border-t border-line pt-4 sm:grid-cols-2">
        <div>
          <label className="mb-1.5 block text-xs font-medium">
            Allowed Categories (Leave empty for all categories)
          </label>
          <div className="flex flex-wrap gap-1.5">
            {categoryList.map((cat) => {
              const selected = form.allowed_categories.includes(cat.slug);
              return (
                <button
                  key={cat.slug}
                  type="button"
                  onClick={() =>
                    setForm((f) => ({
                      ...f,
                      allowed_categories: selected
                        ? f.allowed_categories.filter((x) => x !== cat.slug)
                        : [...f.allowed_categories, cat.slug],
                    }))
                  }
                  className={`rounded-full border px-2.5 py-1 text-xs transition ${
                    selected
                      ? "border-ink bg-ink text-ivory"
                      : "border-line bg-mist/60 text-ink/75"
                  }`}
                >
                  {cat.name}
                </button>
              );
            })}
          </div>
        </div>

        <div>
          <label className="mb-1.5 block text-xs font-medium">
            Allowed Subcategories (Leave empty for all subcategories)
          </label>
          <div className="flex flex-wrap gap-1.5">
            {allSubcategoryOptions.map((sub) => {
              const selected = form.allowed_subcategories.includes(sub);
              return (
                <button
                  key={sub}
                  type="button"
                  onClick={() =>
                    setForm((f) => ({
                      ...f,
                      allowed_subcategories: selected
                        ? f.allowed_subcategories.filter((x) => x !== sub)
                        : [...f.allowed_subcategories, sub],
                    }))
                  }
                  className={`rounded-full border px-2.5 py-1 text-xs transition ${
                    selected
                      ? "border-ink bg-ink text-ivory"
                      : "border-line bg-mist/60 text-ink/75"
                  }`}
                >
                  {sub}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <div className="mt-5 flex justify-end gap-2">
        <button type="button" onClick={onClose} className="btn btn-ghost px-4 py-2 text-xs">
          Cancel
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={() =>
            onSave({
              id: form.id,
              code: form.code.trim().toUpperCase(),
              discount_type: form.discount_type,
              discount_value:
                form.discount_type === "free_delivery" ? 0 : Number(form.discount_value || 0),
              min_order_value: Number(form.min_order_value || 0),
              max_discount_amount: form.max_discount_amount
                ? Number(form.max_discount_amount)
                : null,
              max_uses: form.max_uses ? Number(form.max_uses) : null,
              expires_at: form.expires_at ? new Date(form.expires_at).toISOString() : null,
              is_public: form.is_public,
              first_order_only: form.first_order_only,
              exclude_sale_items: form.exclude_sale_items,
              allowed_categories: form.allowed_categories,
              allowed_subcategories: form.allowed_subcategories,
              is_active: form.is_active,
            })
          }
          className="btn btn-primary px-5 py-2 text-xs"
        >
          Save Promo Code
        </button>
      </div>
    </div>
  );
}

function DepositEditorModal({
  order,
  busy,
  onClose,
  onSave,
}: {
  order: any;
  busy: boolean;
  onClose: () => void;
  onSave: (payload: {
    orderId: string;
    depositAmount: number;
    slipReference: string;
    depositNote: string;
    confirmOrder: boolean;
  }) => Promise<void>;
}) {
  const orderTotal = Number(order.total ?? 0);
  const existingDeposit = Number(order.advance_deposit ?? 0);
  const defaultAmount =
    existingDeposit > 0
      ? existingDeposit
      : order.payment_method === "cod"
        ? Math.min(COD_MIN_DEPOSIT, orderTotal)
        : orderTotal;

  const [depositAmount, setDepositAmount] = useState(String(defaultAmount));
  const [slipReference, setSlipReference] = useState(order.bank_slip_reference ?? "");
  const [depositNote, setDepositNote] = useState(order.advance_deposit_note ?? "");
  const [confirmOrder, setConfirmOrder] = useState(true);

  const numericDeposit = Math.max(0, Number(depositAmount || 0));
  const remainingCourierBalance = getCodBalanceDue({
    total: orderTotal,
    refund_amount: order.refund_amount,
    advance_deposit: numericDeposit,
  });

  return (
    <div className="rounded-2xl border border-line bg-ivory p-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="eyebrow text-gold-deep">{order.order_number}</p>
          <h3 className="display mt-1 text-3xl">
            {order.payment_method === "cod"
              ? "record cod advance deposit"
              : "record bank transfer slip"}
          </h3>
        </div>
        <button type="button" onClick={onClose} className="text-xs underline">
          Close
        </button>
      </div>

      <div className="mt-4 grid gap-4 sm:grid-cols-3">
        <div>
          <label className="mb-1 block text-xs font-medium">
            Deposit Amount Received (LKR)
          </label>
          <input
            type="number"
            min={0}
            max={orderTotal}
            value={depositAmount}
            onChange={(e) => setDepositAmount(e.target.value)}
            className="field font-mono"
          />
          <div className="mt-1.5 flex gap-1.5">
            <button
              type="button"
              onClick={() => setDepositAmount(String(COD_MIN_DEPOSIT))}
              className="rounded border border-line bg-mist px-2 py-0.5 text-[11px]"
            >
              Min ({formatLKR(COD_MIN_DEPOSIT)})
            </button>
            <button
              type="button"
              onClick={() => setDepositAmount(String(orderTotal))}
              className="rounded border border-line bg-mist px-2 py-0.5 text-[11px]"
            >
              Full ({formatLKR(orderTotal)})
            </button>
          </div>
        </div>

        <div>
          <label className="mb-1 block text-xs font-medium">
            Bank Slip Reference / Txn ID
          </label>
          <input
            value={slipReference}
            onChange={(e) => setSlipReference(e.target.value)}
            placeholder="e.g. HNB-849201"
            className="field font-mono text-sm"
          />
        </div>

        <div>
          <label className="mb-1 block text-xs font-medium">
            Deposit Note (optional)
          </label>
          <input
            value={depositNote}
            onChange={(e) => setDepositNote(e.target.value)}
            placeholder="e.g. Verified via WhatsApp slip"
            className="field text-sm"
          />
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-4 rounded-xl bg-mist/60 px-4 py-3 text-xs">
        <div>
          <span>Order Total: </span>
          <strong>{formatLKR(orderTotal)}</strong>
          <span className="mx-2">·</span>
          <span>Deposit Now: </span>
          <strong className="text-sage-deep">−{formatLKR(numericDeposit)}</strong>
        </div>
        <div>
          <span>Remaining Courier Balance on Delivery: </span>
          <strong className="text-sm">{formatLKR(remainingCourierBalance)}</strong>
        </div>
      </div>

      <label className="mt-4 flex items-center gap-2 text-xs font-medium">
        <input
          type="checkbox"
          checked={confirmOrder}
          onChange={(e) => setConfirmOrder(e.target.checked)}
        />
        Mark order status as Confirmed &amp; email deposit receipt to customer
      </label>

      <div className="mt-5 flex justify-end gap-2">
        <button type="button" onClick={onClose} className="btn btn-ghost px-4 py-2 text-xs">
          Cancel
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={() =>
            onSave({
              orderId: order.id,
              depositAmount: numericDeposit,
              slipReference,
              depositNote,
              confirmOrder,
            })
          }
          className="btn btn-primary px-5 py-2 text-xs"
        >
          Save Deposit &amp; Update Order
        </button>
      </div>
    </div>
  );
}
