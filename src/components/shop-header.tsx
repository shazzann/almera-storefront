import Link from "next/link";
import { categories, type CategorySlug } from "@/lib/catalog";

export function ShopHeader({ title, blurb, active }: { title: React.ReactNode; blurb: string; active?: CategorySlug }) {
  const pills = [{ href: "/shop", label: "All", slug: undefined }, ...categories.map((c) => ({ href: `/shop/${c.slug}`, label: c.name, slug: c.slug }))];
  return (
    <div className="mx-auto max-w-7xl px-4 pt-8 pb-6 sm:px-8 sm:pt-14">
      <nav aria-label="Breadcrumb" className="text-xs text-ink/55">
        <Link href="/" className="hover:text-ink">Home</Link> <span className="mx-1.5">/</span> <span>Shop</span>
      </nav>
      <h1 className="display mt-4 text-[3.2rem] sm:text-7xl [&_em]:text-sage-deep">{title}</h1>
      <p className="mt-4 max-w-xl leading-relaxed text-ink/70">{blurb}</p>
      <div className="no-scrollbar -mx-4 mt-7 flex gap-2 overflow-x-auto px-4 sm:mx-0 sm:px-0">
        {pills.map((p) => {
          const on = p.slug === active;
          return (
            <Link
              key={p.href}
              href={p.href}
              aria-current={on ? "page" : undefined}
              className={`shrink-0 rounded-full border px-5 py-2.5 text-sm font-medium transition ${on ? "border-ink bg-ink text-ivory" : "border-line bg-ivory hover:border-ink"}`}
            >
              {p.label}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
