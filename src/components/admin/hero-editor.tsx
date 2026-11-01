"use client";

import Image from "next/image";
import { useMemo, useState } from "react";
import { CheckIcon, ChevronIcon } from "@/components/icons";
import { HERO_SEASON_MAX, formatLKR } from "@/lib/catalog";
import { useAdmin } from "./admin-app";
import { fromPrice, num, stockState } from "./lib";
import { AdminSheet, Card, Field, SearchBox, StickyBar, TopBar } from "./ui";

export function HeroEditor() {
  const { data, source, run, back } = useAdmin();
  const live = useMemo(() => data.products.filter((p) => p.is_active !== false), [data.products]);
  const [slug, setSlug] = useState<string | null>(data.hero.productSlug);
  const [image, setImage] = useState<string | null>(data.hero.imageUrl);
  const [season, setSeason] = useState(data.hero.seasonText);
  const [picking, setPicking] = useState(false);
  const [query, setQuery] = useState("");
  const [saving, setSaving] = useState(false);

  // A hidden or removed cover falls back to the newest product, the same as the store does.
  const chosen = live.find((p) => p.slug === slug);
  const shown = chosen ?? live[0];
  const photo = shown && image && shown.images.includes(image) ? image : shown?.images[0];
  const year = new Date().getFullYear();
  const suggestions = [`Eid & wedding season · ${year}`, `Wedding season · ${year}`, `Festive edit · ${year}`, `New season · ${year}`];
  const term = query.trim().toLowerCase();
  const results = live.filter((p) => !term || [p.name, p.colour, p.fabric].join(" ").toLowerCase().includes(term));

  function choose(next: string | null) {
    setSlug(next);
    setImage(null);
    setPicking(false);
  }

  async function save() {
    setSaving(true);
    const ok = await run(
      () => source.saveHero({ productSlug: chosen ? chosen.slug : null, imageUrl: chosen ? photo ?? null : null, seasonText: season.trim() }),
      "Homepage updated",
    );
    setSaving(false);
    if (ok) back({ view: "more" });
  }

  return (
    <>
      <TopBar
        title="Homepage hero"
        onBack={() => back({ view: "more" })}
        right={<a href="/" target="_blank" rel="noreferrer" className="px-3 py-2 text-[0.9rem] font-medium text-sage-deep">View</a>}
      />
      <div className="mx-auto max-w-3xl space-y-3 px-4 pt-4">
        <Card className="p-4">
          <h2 className="font-semibold">Product on the cover</h2>
          <div className="mx-auto mt-3 w-full max-w-[15rem]">
            <div className="arch relative aspect-[4/5] overflow-hidden bg-sage-soft">
              {photo && <Image src={photo} alt="" fill sizes="240px" className="object-cover object-[50%_30%]" />}
            </div>
          </div>
          {shown && shown.images.length > 1 && (
            <div className="mt-3">
              <p className="text-[0.9rem] font-medium">Photo</p>
              <div className="no-scrollbar -mx-4 mt-2 flex gap-2 overflow-x-auto px-4">
                {shown.images.map((src, i) => (
                  <button
                    key={src}
                    type="button"
                    onClick={() => setImage(src)}
                    aria-pressed={src === photo}
                    aria-label={`Use photo ${i + 1}`}
                    className={`relative h-20 w-16 shrink-0 overflow-hidden rounded-lg border-2 bg-sage-soft ${src === photo ? "border-ink" : "border-transparent"}`}
                  >
                    <Image src={src} alt="" fill sizes="64px" className="object-cover" />
                  </button>
                ))}
              </div>
            </div>
          )}
          <button type="button" onClick={() => setPicking(true)} className="mt-3 flex min-h-16 w-full items-center gap-3 rounded-xl border border-line px-3.5 text-left">
            <span className="min-w-0 flex-1">
              <span className="block truncate font-medium">{chosen ? chosen.name : "Newest product"}</span>
              <span className="block truncate text-[0.85rem] text-ink/60">
                {chosen ? (stockState(chosen) === "out" ? "Sold out, so customers can't buy it right now" : formatLKR(fromPrice(chosen))) : shown ? `Changes on its own. Now: ${shown.name}` : "Changes on its own"}
              </span>
            </span>
            <span className="text-[0.9rem] font-medium text-sage-deep">Change</span>
            <ChevronIcon className="size-4 opacity-40" />
          </button>
        </Card>

        <Card className="p-4">
          <Field label="Season line" hint={season.trim() ? `Shown above “the wardrobe is open”. ${HERO_SEASON_MAX - season.length} characters left.` : "Leave empty to hide this line."}>
            <input value={season} maxLength={HERO_SEASON_MAX} onChange={(e) => setSeason(e.target.value)} placeholder={suggestions[0]} className="field" autoCapitalize="sentences" />
          </Field>
          <div className="mt-3 flex flex-wrap gap-2">
            {suggestions.map((s) => (
              <button key={s} type="button" onClick={() => setSeason(s)} aria-pressed={season === s} className={`min-h-10 rounded-full border px-3.5 text-[0.85rem] ${season === s ? "border-ink bg-ink text-ivory" : "border-line"}`}>
                {s}
              </button>
            ))}
          </div>
        </Card>
      </div>

      <StickyBar>
        <button onClick={save} disabled={saving} className="btn btn-primary flex-1 text-[0.82rem]">{saving ? "Saving…" : "Save homepage"}</button>
      </StickyBar>

      <AdminSheet open={picking} onClose={() => setPicking(false)} title="choose a product">
        <div className="p-4 pb-6">
          <SearchBox value={query} onChange={setQuery} placeholder="Name, colour or fabric" />
          {!term && (
            <button type="button" onClick={() => choose(null)} className="mt-2 flex min-h-16 w-full items-center gap-3 rounded-xl px-2 text-left hover:bg-mist">
              <span className="min-w-0 flex-1">
                <span className="block font-medium">Newest product</span>
                <span className="block text-[0.85rem] text-ink/60">Changes on its own when you add products</span>
              </span>
              {!chosen && <CheckIcon className="size-5 shrink-0" />}
            </button>
          )}
          <ul className="mt-1">
            {results.map((p) => (
              <li key={p.slug}>
                <button type="button" onClick={() => choose(p.slug)} className="flex min-h-20 w-full items-center gap-3 rounded-xl p-2 text-left hover:bg-mist">
                  <span className="relative h-16 w-12 shrink-0 overflow-hidden rounded-lg bg-sage-soft">
                    {p.images[0] && <Image src={p.images[0]} alt="" fill sizes="48px" className="object-cover" />}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-medium">{p.name}</span>
                    <span className="block text-[0.85rem] text-ink/60 tabular-nums">{num(p.stock) === 0 ? "Sold out" : `${formatLKR(fromPrice(p))} · ${num(p.stock)} in stock`}</span>
                  </span>
                  {chosen?.slug === p.slug && <CheckIcon className="size-5 shrink-0" />}
                </button>
              </li>
            ))}
          </ul>
          {results.length === 0 && <p className="py-8 text-center text-ink/60">No product matches “{query.trim()}”.</p>}
        </div>
      </AdminSheet>
    </>
  );
}
