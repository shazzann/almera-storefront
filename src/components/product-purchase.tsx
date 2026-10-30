"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { SIZES, STITCHING_FEE, formatLKR, stitchingOptions, type Product, type Size, type Stitching } from "@/lib/catalog";
import { cart } from "@/lib/cart";
import { CheckIcon, InstagramIcon } from "./icons";
import { Sheet } from "./sheet";
import { SizeGuideTable } from "./size-guide";

export function ProductPurchase({ product: p }: { product: Product }) {
  const options = stitchingOptions(p);
  const [stitching, setStitching] = useState<Stitching>(options[0]);
  const [size, setSize] = useState<Size | null>(null);
  const [sizeError, setSizeError] = useState(false);
  const [guideOpen, setGuideOpen] = useState(false);
  const [added, setAdded] = useState(false);
  const [showBar, setShowBar] = useState(false);
  const mainButton = useRef<HTMLButtonElement>(null);
  const closeGuide = useCallback(() => setGuideOpen(false), [setGuideOpen]);

  const needsSize = stitching === "stitched";
  const price = p.price[stitching]!;
  const was = p.wasPrice?.[stitching];
  const soldOut = p.stock === 0;

  useLayoutEffect(() => () => setGuideOpen(false), []);

  // Show a sticky "Add to bag" bar on phones once the main button scrolls away.
  useEffect(() => {
    const el = mainButton.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => setShowBar(!e.isIntersecting && e.boundingClientRect.top < 0), { threshold: 0 });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  function add() {
    if (needsSize && !size) {
      setSizeError(true);
      document.getElementById("size-picker")?.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }
    cart.add(p.slug, stitching, needsSize ? size! : undefined);
    setAdded(true);
    setTimeout(() => setAdded(false), 2200);
  }

  const buttonLabel = soldOut ? "Sold out" : added ? "Added to bag" : `Add to bag · ${formatLKR(price)}`;

  return (
    <div>
      <div className="flex items-baseline gap-3">
        <p className="text-2xl font-semibold tabular-nums">{formatLKR(price)}</p>
        {was && <s className="text-ink/40">{formatLKR(was)}</s>}
      </div>
      {p.stock > 0 && p.stock <= 3 && (
        <p className="mt-2 flex items-center gap-2 text-sm font-medium text-gold-deep">
          <span className="size-1.5 animate-pulse rounded-full bg-gold" /> Only {p.stock} left
        </p>
      )}

      {options.length > 1 && (
        <fieldset className="mt-7">
          <legend className="eyebrow mb-3 text-ink/55">How would you like it?</legend>
          <div className="grid grid-cols-2 gap-2 rounded-2xl bg-ivory p-1.5" role="radiogroup">
            {options.map((o) => (
              <label key={o} className={`cursor-pointer rounded-xl px-3 py-3 text-center transition ${stitching === o ? "bg-ink text-ivory shadow" : "hover:bg-mist"}`}>
                <input type="radio" name="stitching" value={o} checked={stitching === o} onChange={() => { setStitching(o); setSizeError(false); }} className="sr-only" />
                <span className="block text-sm font-semibold capitalize">{o}</span>
                <span className={`block text-xs ${stitching === o ? "text-ivory/70" : "text-ink/55"}`}>
                  {o === "unstitched" ? "3-piece fabric" : `+ ${formatLKR(STITCHING_FEE)}, 5–7 days`}
                </span>
              </label>
            ))}
          </div>
        </fieldset>
      )}

      {needsSize && (
        <fieldset id="size-picker" className="mt-7">
          <div className="mb-3 flex items-center justify-between">
            <legend className="eyebrow text-ink/55">Size</legend>
            <button type="button" onClick={() => setGuideOpen(true)} className="text-sm underline underline-offset-4">
              Size guide
            </button>
          </div>
          <div className="grid grid-cols-5 gap-2">
            {(p.sizes ?? SIZES).map((s) => (
              <label key={s} className={`grid min-h-12 cursor-pointer place-items-center rounded-xl border text-sm font-semibold transition ${size === s ? "border-ink bg-ink text-ivory" : "border-line bg-ivory hover:border-ink"}`}>
                <input type="radio" name="size" value={s} checked={size === s} onChange={() => { setSize(s); setSizeError(false); }} className="sr-only" />
                {s}
              </label>
            ))}
          </div>
          {sizeError && <p role="alert" className="mt-2 text-sm text-[#a5432f]">Choose a size to add this to your bag.</p>}
        </fieldset>
      )}

      <button ref={mainButton} onClick={add} disabled={soldOut} className="btn btn-primary mt-7 w-full" aria-live="polite">
        {added && <CheckIcon className="size-4" />}
        {buttonLabel}
      </button>
      {soldOut && (
        <a href="https://www.instagram.com/almera.lk/" target="_blank" rel="noreferrer" className="btn btn-ghost mt-3 w-full">
          <InstagramIcon className="size-4" /> Ask about a restock
        </a>
      )}
      <p className="mt-4 text-center text-xs text-ink/55">Cash on delivery available · Island-wide delivery in 2–4 days</p>

      {/* Sticky purchase bar on phones */}
      {!soldOut && (
        <div
          className={`fixed inset-x-0 bottom-0 z-30 border-t border-line bg-ivory/95 px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur transition-[transform,visibility] duration-500 lg:hidden ${showBar ? "translate-y-0" : "invisible translate-y-full"}`}
          aria-hidden={!showBar}
          inert={!showBar}
        >
          <div className="flex items-center gap-3">
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">{p.name}</p>
              <p className="text-sm text-ink/60 capitalize">
                {stitching}
                {needsSize && size ? ` · ${size}` : ""} · <span className="font-semibold text-ink">{formatLKR(price)}</span>
              </p>
            </div>
            <button onClick={add} className="btn btn-primary shrink-0 px-6">
              {added ? "Added" : "Add to bag"}
            </button>
          </div>
        </div>
      )}

      <Sheet open={guideOpen} onClose={closeGuide} side="bottom" title="size guide">
        <div className="px-5 py-6">
          <SizeGuideTable kind={p.sizes ? "denim" : "standard"} />
        </div>
      </Sheet>
    </div>
  );
}
