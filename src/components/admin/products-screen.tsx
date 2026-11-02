"use client";

import Image from "@/components/image";
import { useMemo, useState } from "react";
import { ChevronIcon, PlusIcon } from "@/components/icons";
import { formatLKR } from "@/lib/catalog";
import { useAdmin } from "./admin-app";
import { EyeOffIcon } from "./admin-icons";
import { colourGroupOf, fromPrice, num, productInCategory, productPayload, stockRows, stockState, type ProductRow } from "./lib";
import { AdminSheet, Chip, EmptyState, SearchBox, StockRow, SwitchRow, TopBar } from "./ui";

const FILTERS = [
  { key: "all", label: "All", test: () => true },
  { key: "low", label: "Low or sold out", test: (p: ProductRow) => stockState(p) !== "ok" },
  { key: "hidden", label: "Hidden", test: (p: ProductRow) => p.is_active === false },
] as const;

/** Kept outside the screen so the chosen category is still set after editing a product. */
let rememberedCategory = "all";

export function resetProductCategory() {
  rememberedCategory = "all";
}

export function ProductsScreen() {
  const { data, filter: urlFilter, go } = useAdmin();
  const [filter, setFilter] = useState(urlFilter ?? "all");
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState(rememberedCategory);
  const [stocking, setStocking] = useState<ProductRow | null>(null);
  const [open, setOpen] = useState(false);

  const active = FILTERS.find((f) => f.key === filter) ?? FILTERS[0];
  const term = query.trim().toLowerCase();

  const inCategory = useMemo(
    () => (category === "all" ? data.products : data.products.filter((p) => productInCategory(p, category))),
    [data.products, category],
  );

  const visible = useMemo(
    () =>
      inCategory.filter(active.test).filter(
        (p) => !term || [p.name, p.colour, p.fabric, p.subcategory, ...(p.categories ?? [])].join(" ").toLowerCase().includes(term),
      ),
    [inCategory, active, term],
  );

  function chooseCategory(next: string) {
    rememberedCategory = next;
    setCategory(next);
  }

  return (
    <>
      <TopBar title="products" subtitle={`${data.products.length} in your wardrobe`} />
      <div className="mx-auto max-w-3xl px-4 pt-4 pb-6">
        <SearchBox value={query} onChange={setQuery} placeholder="Name, colour or fabric" />
        <label className="relative mt-3 block">
          <span className="sr-only">Category</span>
          <select
            value={category}
            onChange={(e) => chooseCategory(e.target.value)}
            className={`field appearance-none pr-11 font-medium ${category !== "all" ? "border-ink" : ""}`}
          >
            <option value="all">All categories ({data.products.length})</option>
            {data.categories.map((c) => (
              <option key={c.slug} value={c.slug}>
                {c.name} ({data.products.filter((p) => productInCategory(p, c.slug)).length})
              </option>
            ))}
          </select>
          <ChevronIcon className="pointer-events-none absolute top-1/2 right-4 size-4 -translate-y-1/2 rotate-90 opacity-60" />
        </label>
        <div className="no-scrollbar -mx-4 mt-3 flex gap-2 overflow-x-auto px-4 pb-1">
          {FILTERS.map((f) => (
            <Chip key={f.key} on={f.key === active.key} onClick={() => setFilter(f.key)} count={f.key === "all" ? undefined : inCategory.filter(f.test).length}>
              {f.label}
            </Chip>
          ))}
        </div>

        <div className="mt-4 space-y-2.5">
          {visible.length === 0 ? (
            <EmptyState
              title={term ? "no matches" : "nothing here"}
              body={term ? `Nothing matches “${query.trim()}”.` : data.products.length === 0 ? "Add your first product and it appears in the store right away." : "No products in this list right now."}
              action={
                data.products.length === 0 ? (
                  <button onClick={() => go({ view: "product", id: "new" })} className="btn btn-primary">Add product</button>
                ) : category !== "all" ? (
                  <button onClick={() => chooseCategory("all")} className="btn btn-ghost">Show all categories</button>
                ) : undefined
              }
            />
          ) : (
            visible.map((p) => (
              <ProductRowCard
                key={p.slug}
                product={p}
                onStock={() => {
                  setStocking(p);
                  setOpen(true);
                }}
              />
            ))
          )}
        </div>
      </div>

      <button
        onClick={() => go({ view: "product", id: "new" })}
        className="fixed right-4 bottom-[calc(5.25rem+env(safe-area-inset-bottom))] z-30 flex h-14 items-center gap-2 rounded-full bg-ink pr-5 pl-4 font-semibold text-ivory shadow-lg lg:bottom-6"
      >
        <PlusIcon className="size-5" /> Add product
      </button>

      <AdminSheet open={open} onClose={() => setOpen(false)} title="update stock">
        {stocking && <QuickStock key={stocking.slug} product={stocking} onDone={() => setOpen(false)} />}
      </AdminSheet>
    </>
  );
}

function ProductRowCard({ product: p, onStock }: { product: ProductRow; onStock: () => void }) {
  const { data, go } = useAdmin();
  const colourCount = colourGroupOf(p, data.products).length;
  const state = stockState(p);
  const hidden = p.is_active === false;
  const editId = p.id ?? p.slug;

  return (
    <div className="flex overflow-hidden rounded-[1.25rem] border border-line bg-ivory">
      <button onClick={() => go({ view: "product", id: editId })} className="flex min-w-0 flex-1 gap-3 p-3 text-left" aria-label={`Edit ${p.name}`}>
        <span className="relative h-24 w-[4.5rem] shrink-0 overflow-hidden rounded-xl bg-sage-soft">
          {p.images?.[0] && <Image src={p.images[0]} alt="" fill sizes="72px" className={`object-cover ${hidden ? "opacity-50" : ""}`} />}
          {hidden && (
            <span className="absolute inset-0 grid place-items-center text-ink"><EyeOffIcon className="size-5" /></span>
          )}
        </span>
        <span className="min-w-0 flex-1 py-0.5">
          <span className="line-clamp-2 leading-snug font-medium">{p.name}</span>
          <span className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1">
            <span className="text-[0.92rem] font-semibold tabular-nums">{formatLKR(fromPrice(p))}</span>
            {p.is_featured && <span className="rounded-full bg-sage-soft px-2 py-0.5 text-[0.72rem] font-medium text-sage-deep">Show first</span>}
            {colourCount > 1 && <span className="rounded-full border border-line px-2 py-0.5 text-[0.72rem] font-medium text-ink/70">{colourCount} colours</span>}
          </span>
          {hidden && <span className="mt-1 block text-[0.82rem] text-ink/60">Hidden from store</span>}
        </span>
      </button>
      <button
        onClick={onStock}
        aria-label={`Update stock for ${p.name}, ${num(p.stock)} left`}
        className={`flex w-[4.75rem] shrink-0 flex-col items-center justify-center border-l border-line ${state === "out" ? "bg-[#a5432f]/10 text-[#a5432f]" : state === "low" ? "bg-gold/15 text-gold-deep" : ""}`}
      >
        <span className="text-[1.35rem] leading-none font-semibold tabular-nums">{num(p.stock)}</span>
        <span className="mt-1 text-[0.72rem] font-medium">{state === "out" ? "sold out" : "in stock"}</span>
      </button>
    </div>
  );
}

function QuickStock({ product: p, onDone }: { product: ProductRow; onDone: () => void }) {
  const { source, run } = useAdmin();
  const rows = stockRows(p);
  const [unstitched, setUnstitched] = useState(rows.unstitched ?? 0);
  const [sizes, setSizes] = useState<Record<string, number>>(Object.fromEntries(rows.stitched.map((s) => [s.size, s.qty])));
  const [visible, setVisible] = useState(p.is_active !== false);
  const [busy, setBusy] = useState(false);
  const total = (rows.unstitched != null ? unstitched : 0) + Object.values(sizes).reduce((a, b) => a + b, 0);

  async function save() {
    setBusy(true);
    const ok = await run(
      () =>
        source.saveProduct(
          productPayload(p, {
            stock: total,
            unstitched_stock: rows.unstitched != null ? unstitched : null,
            size_stocks: sizes,
            is_active: visible,
          }),
        ),
      `${p.name} updated`,
    );
    setBusy(false);
    if (ok) onDone();
  }

  return (
    <div className="p-5">
      <p className="font-medium">{p.name}</p>
      <div className="mt-2 divide-y divide-line">
        {rows.unstitched != null && <StockRow label="Unstitched" value={unstitched} onChange={setUnstitched} />}
        {rows.stitched.map((s) => (
          <StockRow key={s.size} label={rows.unstitched != null ? `Stitched ${s.size}` : `Size ${s.size}`} value={sizes[s.size] ?? 0} onChange={(v) => setSizes((cur) => ({ ...cur, [s.size]: v }))} />
        ))}
      </div>
      <div className="mt-2 border-t border-line">
        <SwitchRow label="Show in store" checked={visible} onChange={setVisible} />
      </div>
      <button onClick={save} disabled={busy} className="btn btn-primary mt-3 w-full">{busy ? "Saving…" : `Save · ${total} in stock`}</button>
    </div>
  );
}
