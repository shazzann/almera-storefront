"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState, type ReactNode } from "react";
import type { Category } from "@/lib/catalog";
import { ArrowIcon } from "./icons";

/** Swipeable row of category arches. Arrows appear on larger screens, where most people use a mouse. */
export function CategoryRail({ heading, categories }: { heading: ReactNode; categories: Category[] }) {
  const rail = useRef<HTMLDivElement>(null);
  const [atStart, setAtStart] = useState(true);
  const [atEnd, setAtEnd] = useState(false);

  const update = () => {
    const el = rail.current;
    if (!el) return;
    setAtStart(el.scrollLeft < 4);
    setAtEnd(el.scrollLeft + el.clientWidth > el.scrollWidth - 4);
  };

  useEffect(() => {
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  const slide = (direction: 1 | -1) => {
    const el = rail.current;
    el?.scrollBy({ left: direction * el.clientWidth * 0.7, behavior: "smooth" });
  };

  return (
    <>
      <div className="mx-auto flex max-w-7xl items-end justify-between gap-6 px-4 sm:px-8">
        {heading}
        <div className="mb-2 hidden shrink-0 gap-2 md:flex">
          <button onClick={() => slide(-1)} disabled={atStart} aria-label="Previous categories" className="grid size-11 place-items-center rounded-full border border-line bg-ivory transition hover:border-ink disabled:opacity-35 disabled:hover:border-line">
            <ArrowIcon className="size-4 rotate-180" />
          </button>
          <button onClick={() => slide(1)} disabled={atEnd} aria-label="More categories" className="grid size-11 place-items-center rounded-full border border-line bg-ivory transition hover:border-ink disabled:opacity-35 disabled:hover:border-line">
            <ArrowIcon className="size-4" />
          </button>
        </div>
      </div>
      <div
        ref={rail}
        onScroll={update}
        className="no-scrollbar mt-8 flex snap-x snap-mandatory items-start gap-3 overflow-x-auto scroll-px-4 px-4 sm:gap-6 sm:scroll-px-8 sm:px-8 xl:scroll-px-[calc((100%-80rem)/2+2rem)] xl:px-[calc((100%-80rem)/2+2rem)]"
      >
        {categories.map((c) => (
          <Link key={c.slug} href={`/shop/${c.slug}`} className="group w-[28vw] shrink-0 snap-start sm:w-56">
            <div className="arch relative aspect-[3/4] overflow-hidden bg-sage-soft">
              {c.image && <Image src={c.image} alt="" fill sizes="(min-width: 640px) 224px, 28vw" className="object-cover transition duration-[1.4s] ease-[var(--ease-out-soft)] group-hover:scale-105" />}
            </div>
            <h3 className="display mt-3 text-center text-[1.15rem] leading-[1.05] group-hover:text-sage-deep sm:mt-4 sm:text-3xl">{c.name}</h3>
          </Link>
        ))}
      </div>
    </>
  );
}
