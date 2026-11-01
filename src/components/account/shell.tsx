"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { HomeIcon, OrdersIcon } from "@/components/admin/admin-icons";
import { PinIcon, UserIcon } from "./account-icons";
import { useAccount } from "./context";

const TABS = [
  { path: "", label: "Home", Icon: HomeIcon },
  { path: "/orders", label: "Orders", Icon: OrdersIcon },
  { path: "/addresses", label: "Addresses", Icon: PinIcon },
  { path: "/profile", label: "Profile", Icon: UserIcon },
];

export function AccountShell({ children }: { children: ReactNode }) {
  const { base } = useAccount();
  const pathname = usePathname();
  const isActive = (path: string) => (path === "" ? pathname === base : pathname.startsWith(`${base}${path}`));

  return (
    <div className="mx-auto w-full max-w-5xl lg:grid lg:grid-cols-[13rem_1fr] lg:gap-10 lg:px-8 lg:py-10">
      <nav aria-label="Account" className="sticky top-28 hidden self-start lg:block">
        <ul className="space-y-1">
          {TABS.map(({ path, label, Icon }) => (
            <li key={label}>
              <Link
                href={`${base}${path}`}
                aria-current={isActive(path) ? "page" : undefined}
                className={`flex min-h-12 items-center gap-3 rounded-xl px-3.5 font-medium transition ${isActive(path) ? "bg-ink text-ivory" : "hover:bg-ivory"}`}
              >
                <Icon className="size-5" /> {label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>

      <div className="min-w-0 pb-[calc(6rem+env(safe-area-inset-bottom))] lg:pb-0">{children}</div>

      <nav aria-label="Account" className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-ivory/95 pb-[env(safe-area-inset-bottom)] backdrop-blur lg:hidden">
        <ul className="mx-auto grid max-w-lg grid-cols-4">
          {TABS.map(({ path, label, Icon }) => {
            const on = isActive(path);
            return (
              <li key={label}>
                <Link
                  href={`${base}${path}`}
                  aria-current={on ? "page" : undefined}
                  className={`flex min-h-[4.25rem] flex-col items-center justify-center gap-1 text-[0.75rem] ${on ? "font-semibold text-ink" : "font-medium text-ink/60"}`}
                >
                  <span className={`grid h-8 w-14 place-items-center rounded-full transition ${on ? "bg-sage-soft" : ""}`}>
                    <Icon className="size-[1.35rem]" />
                  </span>
                  {label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </div>
  );
}

/** The heading each screen starts with. */
export function ScreenTitle({ title, subtitle }: { title: ReactNode; subtitle?: ReactNode }) {
  return (
    <header className="px-4 pt-6 pb-1 lg:px-0 lg:pt-0">
      <h1 className="display text-[2.6rem] leading-none sm:text-5xl [&_em]:text-sage-deep">{title}</h1>
      {subtitle && <p className="mt-2 text-[0.95rem] leading-snug text-ink/65">{subtitle}</p>}
    </header>
  );
}
