"use client";

import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

/** Keeps store-only parts of the layout, like the footer and bag, out of the admin console. */
export function StoreOnly({ children, hideOnAccount }: { children: ReactNode; hideOnAccount?: boolean }) {
  const path = usePathname();
  if (path.startsWith("/admin")) return null;
  if (hideOnAccount && (path === "/account" || path.startsWith("/account/") || path.startsWith("/account-preview"))) return null;
  return children;
}
