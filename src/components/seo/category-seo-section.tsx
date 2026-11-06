import Link from "next/link";
import type { Category, CategorySlug } from "@/lib/catalog";
import { CATEGORY_SEO_CONTENT, type FaqEntry } from "@/lib/seo/faq-content";

export function CategorySeoSection({
  categorySlug = "all",
  categoryList = [],
  customHeading,
  customParagraphs,
  customFaqs,
}: {
  categorySlug?: CategorySlug | "all";
  categoryList?: Category[];
  customHeading?: string;
  customParagraphs?: string[];
  customFaqs?: FaqEntry[];
}) {
  const copy = CATEGORY_SEO_CONTENT[categorySlug] ?? CATEGORY_SEO_CONTENT.all;
  const heading = customHeading ?? copy.heading;
  const paragraphs = customParagraphs ?? copy.paragraphs;
  const faqs = customFaqs ?? copy.faqs;

  return (
    <section
      aria-labelledby="category-seo-heading"
      className="mx-auto max-w-7xl border-t border-line px-4 py-14 sm:px-8 sm:py-20"
    >
      <div className="grid gap-12 lg:grid-cols-[1.15fr_0.85fr] lg:gap-16">
        <div>
          <p className="eyebrow text-gold-deep">The Almera Guide</p>
          <h2 id="category-seo-heading" className="display mt-3 text-3xl sm:text-4xl">
            {heading}
          </h2>
          <div className="mt-4 space-y-3 text-[0.95rem] leading-relaxed text-ink/75">
            {paragraphs.map((p, idx) => (
              <p key={idx}>{p}</p>
            ))}
          </div>

          {categoryList.length > 0 && (
            <div className="mt-8">
              <h3 className="text-xs font-semibold tracking-[0.16em] text-ink/60 uppercase">
                Explore by Category
              </h3>
              <ul className="mt-3 flex flex-wrap gap-2">
                <li>
                  <Link
                    href="/shop"
                    className="inline-block rounded-full border border-line bg-ivory px-3.5 py-1.5 text-xs font-medium transition hover:border-ink"
                  >
                    All New Arrivals
                  </Link>
                </li>
                {categoryList.map((c) => (
                  <li key={c.slug}>
                    <Link
                      href={`/shop/${c.slug}`}
                      className="inline-block rounded-full border border-line bg-ivory px-3.5 py-1.5 text-xs font-medium transition hover:border-ink"
                    >
                      {c.name}
                    </Link>
                  </li>
                ))}
                <li>
                  <Link
                    href="/brand/almera"
                    className="inline-block rounded-full border border-line bg-ivory px-3.5 py-1.5 text-xs font-medium transition hover:border-ink"
                  >
                    almera Collection
                  </Link>
                </li>
              </ul>
            </div>
          )}
        </div>

        {faqs.length > 0 && (
          <div>
            <p className="eyebrow text-gold-deep">Questions</p>
            <h2 className="display mt-3 text-3xl sm:text-4xl">
              frequently <em className="text-sage-deep">asked</em>
            </h2>
            <div className="mt-4 divide-y divide-line border-y border-line">
              {faqs.map((faq) => (
                <details key={faq.q} className="group">
                  <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between gap-4 py-3 text-sm font-medium [&::-webkit-details-marker]:hidden">
                    <span>{faq.q}</span>
                    <span
                      className="text-lg leading-none text-gold transition-transform group-open:rotate-45"
                      aria-hidden="true"
                    >
                      +
                    </span>
                  </summary>
                  <p className="pb-4 text-sm leading-relaxed text-ink/70">{faq.a}</p>
                </details>
              ))}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

