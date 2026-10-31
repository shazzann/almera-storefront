"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { signOutAction } from "@/actions/auth";
import { isAdminEmail } from "@/lib/admin-config";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";

const LINKS = [
  { href: "/account", label: "Overview" },
  { href: "/account/orders", label: "My Orders" },
  { href: "/account/addresses", label: "Saved Addresses" },
  { href: "/account/profile", label: "Profile" },
];

export function AccountNav() {
  const pathname = usePathname();
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    const sb = getSupabaseBrowserClient();
    if (!sb) return;
    sb.auth.getUser().then(({ data: { user } }) => {
      if (isAdminEmail(user?.email)) {
        setIsAdmin(true);
      }
    });
  }, []);

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line pb-4">
      <nav className="no-scrollbar flex gap-2 overflow-x-auto" aria-label="Account navigation">
        {LINKS.map((link) => {
          const active = pathname === link.href || (link.href !== "/account" && pathname.startsWith(link.href));
          return (
            <Link
              key={link.href}
              href={link.href}
              className={`shrink-0 rounded-full border px-4 py-1.5 text-xs font-medium transition ${
                active
                  ? "border-ink bg-ink text-ivory"
                  : "border-line bg-ivory text-ink/70 hover:border-ink hover:text-ink"
              }`}
            >
              {link.label}
            </Link>
          );
        })}
        {isAdmin && (
          <Link
            href="/admin"
            className="shrink-0 rounded-full border border-gold/50 bg-gold/15 px-4 py-1.5 text-xs font-semibold text-gold-deep transition hover:border-gold hover:bg-gold/25"
          >
            Admin Console ↗
          </Link>
        )}
      </nav>

      <form action={signOutAction}>
        <button
          type="submit"
          className="rounded-full border border-line bg-mist px-3.5 py-1.5 text-xs text-ink/70 transition hover:border-[#a5432f] hover:text-[#a5432f]"
        >
          Sign out
        </button>
      </form>
    </div>
  );
}

