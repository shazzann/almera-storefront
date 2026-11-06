import Link from "next/link";
import type { BreadcrumbItem } from "@/lib/seo/schema";

export function Breadcrumbs({
  items,
  className = "text-xs text-ink/55",
}: {
  items: BreadcrumbItem[];
  className?: string;
}) {
  if (items.length === 0) return null;

  return (
    <nav aria-label="Breadcrumb" className={className}>
      <ol className="flex flex-wrap items-center gap-1.5">
        {items.map((item, idx) => {
          const isLast = idx === items.length - 1;
          return (
            <li key={`${item.path}-${idx}`} className="flex items-center gap-1.5">
              {idx > 0 && (
                <span aria-hidden="true" className="select-none text-ink/40">
                  /
                </span>
              )}
              {isLast ? (
                <span aria-current="page" className="font-medium text-ink/80">
                  {item.name}
                </span>
              ) : (
                <Link href={item.path} className="transition hover:text-ink">
                  {item.name}
                </Link>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

