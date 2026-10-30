"use client";

import { useCallback, useLayoutEffect, useMemo, useState } from "react";
import { categories, inCategory, startingPrice, stitchingOptions, type CategorySlug, type Product, type Stitching } from "@/lib/catalog";
import { FilterIcon } from "./icons";
import { ProductCard } from "./product-card";
import { Sheet } from "./sheet";

const PRICE_BANDS = [
  { id: "u10", label: "Under Rs. 10,000", test: (n: number) => n < 10000 },
  { id: "10-20", label: "Rs. 10,000 – 20,000", test: (n: number) => n >= 10000 && n < 20000 },
  { id: "20-80", label: "Rs. 20,000 – 80,000", test: (n: number) => n >= 20000 && n < 80000 },
  { id: "80", label: "Rs. 80,000 and above", test: (n: number) => n >= 80000 },
] as const;

const SORTS = {
  featured: "Featured",
  new: "Newest",
  "price-asc": "Price, low to high",
  "price-desc": "Price, high to low",
} as const;
type Sort = keyof typeof SORTS;

type Filters = { stitching: Stitching[]; categories: CategorySlug[]; bands: string[]; inStock: boolean };
const NONE: Filters = { stitching: [], categories: [], bands: [], inStock: false };

const toggle = <T,>(list: T[], v: T) => (list.includes(v) ? list.filter((x) => x !== v) : [...list, v]);

export function ShopView({
  items,
  showCategoryFilter,
  showStitchingFilter = true,
  subcategories,
}: {
  items: Product[];
  showCategoryFilter: boolean;
  showStitchingFilter?: boolean;
  subcategories?: string[];
}) {
  const [filters, setFilters] = useState<Filters>(NONE);
  const [chip, setChip] = useState<string | null>(null);
  const [sort, setSort] = useState<Sort>("featured");
  const [sheetOpen, setSheetOpen] = useState(false);
  const closeSheet = useCallback(() => setSheetOpen(false), []);

  // The filter sheet is transient: close it if the page is hidden by a navigation.
  useLayoutEffect(() => () => setSheetOpen(false), []);

  const activeCount = filters.stitching.length + filters.categories.length + filters.bands.length + (filters.inStock ? 1 : 0);

  const visible = useMemo(() => {
    const list = items.filter((p) => {
      if (chip && p.subcategory !== chip) return false;
      const opts = stitchingOptions(p);
      if (filters.stitching.length && !filters.stitching.some((s) => opts.includes(s))) return false;
      if (filters.categories.length && !filters.categories.some((c) => inCategory(p, c))) return false;
      if (filters.bands.length && !PRICE_BANDS.filter((b) => filters.bands.includes(b.id)).some((b) => b.test(startingPrice(p)))) return false;
      if (filters.inStock && p.stock === 0) return false;
      return true;
    });
    if (sort === "price-asc") return [...list].sort((a, b) => startingPrice(a) - startingPrice(b));
    if (sort === "price-desc") return [...list].sort((a, b) => startingPrice(b) - startingPrice(a));
    if (sort === "new") return [...list].sort((a, b) => Number(b.tags.includes("new")) - Number(a.tags.includes("new")));
    return list;
  }, [items, chip, filters, sort]);

  const panel = (
    <div className="space-y-8">
      {showStitchingFilter && (
        <FilterGroup title="Stitching">
          {(["unstitched", "stitched"] as const).map((s) => (
            <Check key={s} checked={filters.stitching.includes(s)} onChange={() => setFilters((f) => ({ ...f, stitching: toggle(f.stitching, s) }))}>
              {s === "stitched" ? "Stitched / ready to wear" : "Unstitched fabric"}
            </Check>
          ))}
        </FilterGroup>
      )}
      {showCategoryFilter && (
        <FilterGroup title="Category">
          {categories.map((c) => (
            <Check key={c.slug} checked={filters.categories.includes(c.slug)} onChange={() => setFilters((f) => ({ ...f, categories: toggle(f.categories, c.slug) }))}>
              {c.name}
            </Check>
          ))}
        </FilterGroup>
      )}
      <FilterGroup title="Price">
        {PRICE_BANDS.map((b) => (
          <Check key={b.id} checked={filters.bands.includes(b.id)} onChange={() => setFilters((f) => ({ ...f, bands: toggle(f.bands, b.id) }))}>
            {b.label}
          </Check>
        ))}
      </FilterGroup>
      <FilterGroup title="Availability">
        <Check checked={filters.inStock} onChange={() => setFilters((f) => ({ ...f, inStock: !f.inStock }))}>
          Hide sold out pieces
        </Check>
      </FilterGroup>
    </div>
  );

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-8">
      {subcategories && (
        <div className="no-scrollbar -mx-4 flex gap-x-6 overflow-x-auto px-4 pb-4 sm:mx-0 sm:px-0" role="group" aria-label="Filter by type">
          {[null, ...subcategories].map((name) => {
            const on = chip === name;
            return (
              <button
                key={name ?? "all"}
                onClick={() => setChip(name)}
                aria-pressed={on}
                className={`min-h-11 shrink-0 border-b-2 text-sm font-semibold transition ${on ? "border-gold text-ink" : "border-transparent text-ink/55 hover:text-ink"}`}
              >
                {name ?? "All"}
              </button>
            );
          })}
        </div>
      )}

      {/* Toolbar: sticky under the header on phones */}
      <div className="sticky top-16 z-30 -mx-4 flex items-center justify-between gap-3 border-y border-line bg-mist/95 px-4 py-2.5 backdrop-blur sm:top-20 sm:-mx-8 sm:px-8 lg:static lg:mx-0 lg:border-x-0 lg:border-t-0 lg:bg-transparent lg:px-0 lg:pb-5">
        <button onClick={() => setSheetOpen(true)} className="flex min-h-11 items-center gap-2 rounded-full border border-line bg-ivory px-4 text-sm font-medium lg:hidden">
          <FilterIcon className="size-4" /> Filter{activeCount > 0 && <span className="grid size-5 place-items-center rounded-full bg-ink text-[0.65rem] text-ivory">{activeCount}</span>}
        </button>
        <p className="hidden text-sm text-ink/60 lg:block">{visible.length} pieces</p>
        <label className="flex items-center gap-2 text-sm">
          <span className="text-ink/60 max-sm:sr-only">Sort by</span>
          <select value={sort} onChange={(e) => setSort(e.target.value as Sort)} className="min-h-11 rounded-full border border-line bg-ivory px-4 pr-8 text-sm font-medium">
            {Object.entries(SORTS).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </select>
        </label>
      </div>

      <div className="grid gap-10 pt-6 lg:grid-cols-[15rem_1fr] lg:pt-2">
        <aside className="hidden lg:block">
          <div className="sticky top-28">
            {panel}
            {activeCount > 0 && (
              <button onClick={() => setFilters(NONE)} className="mt-8 text-sm underline underline-offset-4">Clear all filters</button>
            )}
          </div>
        </aside>

        <div>
          <p className="mb-5 text-sm text-ink/60 lg:hidden">{visible.length} pieces</p>
          {visible.length === 0 ? (
            <div className="rounded-[1.5rem] bg-ivory px-6 py-16 text-center">
              <p className="display text-3xl">nothing in this drawer</p>
              <p className="mt-2 text-ink/60">No pieces match these filters. Remove one to see more.</p>
              <button onClick={() => { setFilters(NONE); setChip(null); }} className="btn btn-ghost mt-6">Clear filters</button>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-x-3 gap-y-10 sm:grid-cols-3 sm:gap-x-6">
              {visible.map((p, i) => (
                <ProductCard key={p.slug} product={p} priority={i < 2} sizes="(min-width: 1024px) 24vw, (min-width: 640px) 31vw, 46vw" />
              ))}
            </div>
          )}
        </div>
      </div>

      <Sheet
        open={sheetOpen}
        onClose={closeSheet}
        side="bottom"
        title="filter"
        footer={
          <div className="flex gap-3">
            <button onClick={() => setFilters(NONE)} className="btn btn-ghost flex-1 px-4">Clear</button>
            <button onClick={closeSheet} className="btn btn-primary flex-[2] px-4">Show {visible.length} pieces</button>
          </div>
        }
      >
        <div className="px-5 py-6">{panel}</div>
      </Sheet>
    </div>
  );
}

function FilterGroup({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <fieldset>
      <legend className="eyebrow mb-3 text-ink/55">{title}</legend>
      <div className="space-y-1">{children}</div>
    </fieldset>
  );
}

function Check({ checked, onChange, children }: { checked: boolean; onChange: () => void; children: React.ReactNode }) {
  return (
    <label className="flex min-h-11 cursor-pointer items-center gap-3 text-[0.95rem]">
      <input type="checkbox" checked={checked} onChange={onChange} className="peer sr-only" />
      <span className="grid size-5 shrink-0 place-items-center rounded-[5px] border border-ink/30 bg-ivory transition peer-checked:border-ink peer-checked:bg-ink peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-gold">
        <svg viewBox="0 0 12 12" className={`size-3 text-ivory ${checked ? "" : "invisible"}`} fill="none" stroke="currentColor" strokeWidth="2"><path d="m2.5 6.5 2.2 2L9.5 3.5" /></svg>
      </span>
      {children}
    </label>
  );
}
