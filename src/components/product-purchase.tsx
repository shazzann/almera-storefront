"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import {
  SIZES,
  STITCHING_FEE,
  formatLKR,
  getOptionStock,
  stitchingOptions,
  type Product,
  type Size,
  type Stitching,
} from "@/lib/catalog";
import { cart } from "@/lib/cart";
import { CheckIcon, InstagramIcon } from "./icons";
import { Sheet } from "./sheet";
import { SizeGuideTable } from "./size-guide";

const subscribeToNothing = () => () => {};

export function ProductPurchase({ product: p }: { product: Product }) {
  const inBrowser = useSyncExternalStore(subscribeToNothing, () => true, () => false);
  const options = stitchingOptions(p);
  const initialOption =
    options.find((o) => getOptionStock(p, o) > 0) ?? options[0] ?? "stitched";
  const [stitching, setStitching] = useState<Stitching>(initialOption);
  const [size, setSize] = useState<Size | null>(null);
  const [sizeError, setSizeError] = useState(false);
  const [guideOpen, setGuideOpen] = useState(false);
  const [added, setAdded] = useState(false);
  const [showBar, setShowBar] = useState(false);
  const mainButton = useRef<HTMLButtonElement>(null);
  const closeGuide = useCallback(() => setGuideOpen(false), [setGuideOpen]);

  // Switching colour keeps the customer's choices wherever the new colour has them in stock.
  const [shownSlug, setShownSlug] = useState(p.slug);
  if (shownSlug !== p.slug) {
    setShownSlug(p.slug);
    setStitching(options.includes(stitching) && getOptionStock(p, stitching) > 0 ? stitching : initialOption);
    setSize(size && (p.sizes ?? SIZES).includes(size) && getOptionStock(p, "stitched", size) > 0 ? size : null);
    setSizeError(false);
    setAdded(false);
  }

  const needsSize = stitching === "stitched";
  const price = p.price[stitching] ?? 0;
  const was = p.wasPrice?.[stitching];

  const activeStock = needsSize
    ? size
      ? getOptionStock(p, "stitched", size)
      : getOptionStock(p, "stitched")
    : getOptionStock(p, "unstitched");

  const soldOut = p.stock <= 0 || activeStock <= 0;

  useLayoutEffect(() => () => setGuideOpen(false), []);

  // Show a sticky "Add to bag" bar on phones once the main button scrolls away.
  useEffect(() => {
    const el = mainButton.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([e]) => setShowBar(!e.isIntersecting && e.boundingClientRect.top < 0),
      { threshold: 0 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  function add() {
    if (needsSize && !size) {
      setSizeError(true);
      document
        .getElementById("size-picker")
        ?.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }
    if (soldOut) return;
    cart.add(p, stitching, needsSize ? size! : undefined);
    setAdded(true);
    setTimeout(() => setAdded(false), 2200);
  }

  const buttonLabel = soldOut
    ? "Sold out"
    : added
      ? "Added to bag"
      : `Add to bag · ${formatLKR(price)}`;

  const isDenimChart = (p.sizes ?? SIZES).some((s) => /^\d+$/.test(s));

  return (
    <div>
      <div className="flex items-baseline gap-3">
        <p className="text-2xl font-semibold tabular-nums">{formatLKR(price)}</p>
        {was && <s className="text-ink/40">{formatLKR(was)}</s>}
      </div>
      {activeStock > 0 && activeStock <= 3 && (
        <p className="mt-2 flex items-center gap-2 text-sm font-medium text-gold-deep">
          <span className="size-1.5 animate-pulse rounded-full bg-gold" /> Only {activeStock} left
          {needsSize && size ? ` in size ${size}` : ""}
        </p>
      )}

      {options.length > 1 && (
        <fieldset className="mt-7">
          <legend className="eyebrow mb-3 text-ink/55">How would you like it?</legend>
          <div className="grid grid-cols-2 gap-2 rounded-2xl bg-ivory p-1.5" role="radiogroup">
            {options.map((o) => {
              const optStock = getOptionStock(p, o);
              const optOut = optStock <= 0;
              return (
                <label
                  key={o}
                  className={`cursor-pointer rounded-xl px-3 py-3 text-center transition ${
                    stitching === o
                      ? "bg-ink text-ivory shadow"
                      : optOut
                        ? "opacity-55 hover:bg-mist"
                        : "hover:bg-mist"
                  }`}
                >
                  <input
                    type="radio"
                    name="stitching"
                    value={o}
                    checked={stitching === o}
                    onChange={() => {
                      setStitching(o);
                      setSizeError(false);
                    }}
                    className="sr-only"
                  />
                  <span className="block text-sm font-semibold capitalize">{o}</span>
                  <span
                    className={`block text-xs ${
                      stitching === o ? "text-ivory/70" : "text-ink/55"
                    }`}
                  >
                    {optOut
                      ? "Sold out"
                      : o === "unstitched"
                        ? "3-piece fabric"
                        : `+ ${formatLKR(STITCHING_FEE)}, 5–7 days`}
                  </span>
                </label>
              );
            })}
          </div>
        </fieldset>
      )}

      {needsSize && (
        <fieldset id="size-picker" className="mt-7">
          <div className="mb-3 flex items-center justify-between">
            <legend className="eyebrow text-ink/55">Size</legend>
            <button
              type="button"
              onClick={() => setGuideOpen(true)}
              className="text-sm underline underline-offset-4"
            >
              Size guide
            </button>
          </div>
          <div className={`grid gap-2 ${(p.sizes ?? SIZES).length === 4 ? "grid-cols-4" : "grid-cols-5"}`}>
            {(p.sizes ?? SIZES).map((s) => {
              const sStock = getOptionStock(p, "stitched", s);
              const sOut = sStock <= 0;
              const selected = size === s && !sOut;
              return (
                <label
                  key={s}
                  title={sOut ? `Size ${s} is sold out` : `${sStock} in stock`}
                  className={`relative grid min-h-12 place-items-center rounded-xl border text-sm font-semibold transition ${
                    sOut
                      ? "cursor-not-allowed border-line bg-mist/40 text-ink/35 line-through"
                      : selected
                        ? "cursor-pointer border-ink bg-ink text-ivory"
                        : "cursor-pointer border-line bg-ivory hover:border-ink"
                  }`}
                >
                  <input
                    type="radio"
                    name="size"
                    value={s}
                    disabled={sOut}
                    checked={selected}
                    onChange={() => {
                      if (sOut) return;
                      setSize(s);
                      setSizeError(false);
                    }}
                    className="sr-only"
                  />
                  <span>{s}</span>
                </label>
              );
            })}
          </div>
          {sizeError && (
            <p role="alert" className="mt-2 text-sm text-[#a5432f]">
              Choose an available size to add this to your bag.
            </p>
          )}
        </fieldset>
      )}

      <button
        ref={mainButton}
        onClick={add}
        disabled={soldOut}
        className="btn btn-primary mt-7 w-full"
        aria-live="polite"
      >
        {added && <CheckIcon className="size-4" />}
        {buttonLabel}
      </button>
      {soldOut && (
        <a
          href="https://www.instagram.com/almera.lk/"
          target="_blank"
          rel="noreferrer"
          className="btn btn-ghost mt-3 w-full"
        >
          <InstagramIcon className="size-4" /> Ask about a restock
        </a>
      )}
      <p className="mt-4 text-center text-xs text-ink/55">
        Cash on delivery available · Island-wide delivery in 2–4 days
      </p>

      {/* Sticky purchase bar on phones */}
      {!soldOut && (
        <div
          className={`fixed inset-x-0 bottom-0 z-30 border-t border-line bg-ivory/95 px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur transition-[transform,visibility] duration-500 lg:hidden ${
            showBar ? "translate-y-0" : "invisible translate-y-full"
          }`}
          aria-hidden={!showBar}
          inert={!showBar}
        >
          <div className="flex items-center gap-3">
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">{p.name}</p>
              <p className="text-sm text-ink/60 capitalize">
                {stitching}
                {needsSize && size ? ` · ${size}` : ""} ·{" "}
                <span className="font-semibold text-ink">{formatLKR(price)}</span>
              </p>
            </div>
            <button onClick={add} className="btn btn-primary shrink-0 px-6">
              {added ? "Added" : "Add to bag"}
            </button>
          </div>
        </div>
      )}

      {/* The sticky column on large screens sits below the header, so the guide opens from the body. */}
      {inBrowser &&
        createPortal(
          <Sheet open={guideOpen} onClose={closeGuide} side="bottom" title="size guide">
            <div className="px-5 py-6">
              <SizeGuideTable kind={isDenimChart ? "denim" : "standard"} />
            </div>
          </Sheet>,
          document.body,
        )}
    </div>
  );
}
