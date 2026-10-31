"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import {
  categories as defaultCategories,
  type Category,
  type CategorySlug,
} from "@/lib/catalog";

export function ShopHeader({
  title,
  blurb,
  active,
  categoryList = defaultCategories,
}: {
  title: React.ReactNode;
  blurb: string;
  active?: CategorySlug;
  categoryList?: Category[];
}) {
  const activePill = useRef<HTMLAnchorElement>(null);
  const pillRow = useRef<HTMLDivElement>(null);

  // With nine categories the active pill can start off-screen on phones.
  useEffect(() => {
    const pill = activePill.current;
    const row = pillRow.current;
    if (pill && row) row.scrollLeft = pill.offsetLeft - 16;
  }, []);

  const pills = [
    { href: "/shop", label: "All", slug: undefined },
    ...categoryList.map((c) => ({ href: `/shop/${c.slug}`, label: c.name, slug: c.slug })),
  ];
  return (
    <div className="mx-auto max-w-7xl px-4 pt-8 pb-6 sm:px-8 sm:pt-14">
      <nav aria-label="Breadcrumb" className="text-xs text-ink/55">
        <Link href="/" className="hover:text-ink">
          Home
        </Link>{" "}
        <span className="mx-1.5">/</span> <span>Shop</span>
      </nav>
      <h1 className="display mt-4 text-[3.2rem] sm:text-7xl [&_em]:text-sage-deep">{title}</h1>
      <p className="mt-4 max-w-xl leading-relaxed text-ink/70">{blurb}</p>
      <div
        ref={pillRow}
        className="no-scrollbar relative -mx-4 mt-7 flex gap-2 overflow-x-auto px-4 sm:mx-0 sm:px-0"
      >
        {pills.map((p) => {
          const on = p.slug === active;
          return (
            <Link
              key={p.href}
              ref={on ? activePill : undefined}
              href={p.href}
              aria-current={on ? "page" : undefined}
              className={`shrink-0 rounded-full border px-5 py-2.5 text-sm font-medium transition ${
                on
                  ? "border-ink bg-ink text-ivory"
                  : "border-line bg-ivory hover:border-ink"
              }`}
            >
              {p.label}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
