"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { WardrobeMark } from "@/components/brand";
import { DEFAULT_HERO } from "@/lib/catalog";
import { BoxIcon, HomeIcon, MoreIcon, OrdersIcon, PercentIcon } from "./admin-icons";
import { HeroEditor } from "./hero-editor";
import { HomeScreen } from "./home-screen";
import { ORDER_FILTERS, type AdminData, type AdminSource } from "./lib";
import { ActivityScreen, CategoriesScreen, CategoryEditor, CategoryOrderScreen, MoreScreen } from "./more-screens";
import { OrderDetail } from "./order-detail";
import { OrdersScreen } from "./orders-screen";
import { ProductEditor } from "./product-editor";
import { ProductsScreen } from "./products-screen";
import { PromoEditor, PromosScreen } from "./promo-screens";
import { Skeleton } from "./ui";

type NavParams = { view?: string; id?: string; filter?: string };
type Toast = { id: number; kind: "ok" | "err"; text: string };

type AdminCtx = {
  source: AdminSource;
  data: AdminData;
  email: string;
  refreshing: boolean;
  refresh: () => Promise<void>;
  /** Runs a change, reloads the data and reports the result. Resolves to whether it worked. */
  run: (work: () => Promise<unknown>, success: string) => Promise<boolean>;
  toast: (text: string, kind?: Toast["kind"]) => void;
  go: (params: NavParams) => void;
  back: (fallback: NavParams) => void;
  filter: string | null;
};

const Ctx = createContext<AdminCtx | null>(null);

export function useAdmin() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useAdmin must be used inside AdminApp");
  return ctx;
}

const TABS = [
  { view: "home", label: "Home", Icon: HomeIcon, owns: ["home"] },
  { view: "orders", label: "Orders", Icon: OrdersIcon, owns: ["orders", "order"] },
  { view: "products", label: "Products", Icon: BoxIcon, owns: ["products", "product"] },
  { view: "promos", label: "Promos", Icon: PercentIcon, owns: ["promos", "promo"] },
  { view: "more", label: "More", Icon: MoreIcon, owns: ["more", "categories", "category", "category-order", "activity", "hero"] },
] as const;

/** Screens that fill the phone and keep their own action bar in place of the tabs. */
const FULL_SCREEN = ["order", "product", "promo", "category", "category-order", "hero"];

const EMPTY: AdminData = { categories: [], products: [], orders: [], coupons: [], auditLogs: [], hero: DEFAULT_HERO };

export function AdminApp({ source }: { source: AdminSource }) {
  const params = useSearchParams();
  const view = params.get("view") ?? "home";
  const id = params.get("id");
  const filter = params.get("filter");

  const [status, setStatus] = useState<"loading" | "ready" | "denied" | "failed">("loading");
  const [message, setMessage] = useState("");
  const [email, setEmail] = useState("");
  const [data, setData] = useState<AdminData>(EMPTY);
  const [refreshing, setRefreshing] = useState(false);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const lastLoad = useRef(0);
  const pushed = useRef(0);
  const toastId = useRef(0);

  const toast = useCallback((text: string, kind: Toast["kind"] = "ok") => {
    toastId.current += 1;
    const entry = { id: toastId.current, kind, text };
    setToasts((list) => [...list.slice(-1), entry]);
    setTimeout(() => setToasts((list) => list.filter((t) => t.id !== entry.id)), kind === "ok" ? 3000 : 6000);
  }, []);

  const refresh = useCallback(async () => {
    setRefreshing(true);
    try {
      setData(await source.load());
      lastLoad.current = Date.now();
    } finally {
      setRefreshing(false);
    }
  }, [source]);

  const start = useCallback(async () => {
    setStatus("loading");
    try {
      const auth = await source.check();
      if (!auth.ok) {
        setMessage(auth.error);
        setStatus("denied");
        return;
      }
      setEmail(auth.email);
      await refresh();
      setStatus("ready");
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Check your connection and try again.");
      setStatus("failed");
    }
  }, [source, refresh]);

  useEffect(() => {
    const t = setTimeout(start, 0);
    return () => clearTimeout(t);
  }, [start]);

  // Pick up new orders when the owner comes back to the app.
  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === "visible" && Date.now() - lastLoad.current > 60_000) {
        refresh().catch(() => {});
      }
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, [refresh]);

  const go = useCallback((next: NavParams) => {
    const qs = new URLSearchParams();
    if (next.view && next.view !== "home") qs.set("view", next.view);
    if (next.id) qs.set("id", next.id);
    if (next.filter) qs.set("filter", next.filter);
    const query = qs.toString();
    pushed.current += 1;
    window.history.pushState(null, "", query ? `${window.location.pathname}?${query}` : window.location.pathname);
    window.scrollTo(0, 0);
  }, []);

  const back = useCallback(
    (fallback: NavParams) => {
      if (pushed.current > 0) {
        pushed.current -= 1;
        window.history.back();
      } else {
        go(fallback);
      }
    },
    [go],
  );

  const run = useCallback<AdminCtx["run"]>(
    async (work, success) => {
      try {
        await work();
      } catch (err) {
        toast(err instanceof Error ? err.message : "That didn't save. Check your connection and try again.", "err");
        return false;
      }
      toast(success);
      await refresh().catch(() => toast("Saved, but the list didn't update. Reopen the app to see it.", "err"));
      return true;
    },
    [refresh, toast],
  );

  const ctx = useMemo<AdminCtx>(
    () => ({ source, data, email, refreshing, refresh, run, toast, go, back, filter }),
    [source, data, email, refreshing, refresh, run, toast, go, back, filter],
  );

  if (status === "loading") return <LoadingScreen />;

  if (status === "denied" || status === "failed") {
    return (
      <div className="mx-auto flex min-h-dvh max-w-sm flex-col items-center justify-center px-6 text-center">
        <WardrobeMark className="h-20 w-auto text-gold" />
        <h1 className="display mt-6 text-4xl">{status === "denied" ? "no access" : "couldn’t load"}</h1>
        <p className="mt-3 leading-relaxed text-ink/65">{message}</p>
        <div className="mt-8 flex w-full flex-col gap-3">
          {status === "failed" && <button onClick={start} className="btn btn-primary">Try again</button>}
          {status === "denied" && (
            <button onClick={() => source.signOut().then(() => window.location.assign("/account/login?next=/admin"))} className="btn btn-primary">
              Sign in with another account
            </button>
          )}
          <Link href="/" className="btn btn-ghost">Go to the store</Link>
        </div>
      </div>
    );
  }

  const activeTab = TABS.find((t) => (t.owns as readonly string[]).includes(view))?.view ?? "home";
  const fullScreen = FULL_SCREEN.includes(view);
  const todoCount = data.orders.filter(ORDER_FILTERS[0].test).length;

  return (
    <Ctx.Provider value={ctx}>
      <div className="min-h-dvh lg:pl-56">
        <nav aria-label="Admin" className="fixed inset-y-0 left-0 z-40 hidden w-56 flex-col border-r border-line bg-ivory px-3 py-5 lg:flex">
          <p className="display px-3 pb-6 text-3xl text-olive">almera</p>
          {TABS.map((t) => (
            <button
              key={t.view}
              onClick={() => go({ view: t.view })}
              aria-current={activeTab === t.view ? "page" : undefined}
              className={`mb-1 flex min-h-12 items-center gap-3 rounded-xl px-3 font-medium ${activeTab === t.view ? "bg-sage-soft" : "hover:bg-mist"}`}
            >
              <t.Icon className="size-5" />
              <span className="flex-1 text-left">{t.label}</span>
              {t.view === "orders" && todoCount > 0 && <Badge count={todoCount} />}
            </button>
          ))}
        </nav>

        <div key={`${view}:${id ?? ""}`}>
          <Screen view={view} id={id} />
        </div>

        {!fullScreen && (
          <>
            <div className="h-24 lg:hidden" aria-hidden />
            <nav aria-label="Admin" className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-ivory/95 pb-[env(safe-area-inset-bottom)] backdrop-blur lg:hidden">
              <div className="mx-auto grid max-w-lg grid-cols-5">
                {TABS.map((t) => {
                  const on = activeTab === t.view;
                  return (
                    <button
                      key={t.view}
                      onClick={() => !on || view !== t.view ? go({ view: t.view }) : window.scrollTo({ top: 0, behavior: "smooth" })}
                      aria-current={on ? "page" : undefined}
                      className="flex min-h-[4.25rem] flex-col items-center justify-center gap-1"
                    >
                      <span className={`relative grid h-8 w-14 place-items-center rounded-full transition-colors ${on ? "bg-sage-soft" : ""}`}>
                        <t.Icon className="size-[1.4rem]" />
                        {t.view === "orders" && todoCount > 0 && (
                          <span className="absolute -top-1 right-1"><Badge count={todoCount} /></span>
                        )}
                      </span>
                      <span className={`text-[0.75rem] ${on ? "font-semibold" : "text-ink/65"}`}>{t.label}</span>
                    </button>
                  );
                })}
              </div>
            </nav>
          </>
        )}

        <div aria-live="polite" className={`pointer-events-none fixed inset-x-0 z-[70] flex flex-col items-center gap-2 px-4 lg:left-56 ${fullScreen ? "bottom-24" : "bottom-24 lg:bottom-6"}`}>
          {toasts.map((t) => (
            <p key={t.id} role={t.kind === "err" ? "alert" : undefined} className={`max-w-md animate-rise rounded-2xl px-4 py-3 text-[0.92rem] font-medium shadow-lg ${t.kind === "ok" ? "bg-ink text-ivory" : "bg-[#a5432f] text-ivory"}`}>
              {t.text}
            </p>
          ))}
        </div>
      </div>
    </Ctx.Provider>
  );
}

function Screen({ view, id }: { view: string; id: string | null }) {
  switch (view) {
    case "orders":
      return <OrdersScreen />;
    case "order":
      return <OrderDetail id={id} />;
    case "products":
      return <ProductsScreen />;
    case "product":
      return <ProductEditor id={id} />;
    case "promos":
      return <PromosScreen />;
    case "promo":
      return <PromoEditor id={id} />;
    case "more":
      return <MoreScreen />;
    case "categories":
      return <CategoriesScreen />;
    case "category":
      return <CategoryEditor id={id} />;
    case "category-order":
      return <CategoryOrderScreen />;
    case "activity":
      return <ActivityScreen />;
    case "hero":
      return <HeroEditor />;
    default:
      return <HomeScreen />;
  }
}

function Badge({ count }: { count: number }) {
  return (
    <span className="grid h-[1.15rem] min-w-[1.15rem] place-items-center rounded-full bg-gold px-1 text-[0.68rem] font-bold text-ivory tabular-nums">
      {count > 99 ? "99+" : count}
    </span>
  );
}

function LoadingScreen(): ReactNode {
  return (
    <div className="mx-auto max-w-3xl space-y-4 px-4 pt-20 lg:pl-60" aria-busy="true" aria-label="Loading">
      <Skeleton className="h-12 w-2/3" />
      <div className="grid grid-cols-2 gap-3">
        <Skeleton className="h-28" />
        <Skeleton className="h-28" />
      </div>
      <Skeleton className="h-44" />
      <Skeleton className="h-64" />
    </div>
  );
}
