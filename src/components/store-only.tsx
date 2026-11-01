"use client";

import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

/** Keeps store-only parts of the layout, like the footer and bag, out of the admin console. */
export function StoreOnly({ children }: { children: ReactNode }) {
  return usePathname().startsWith("/admin") ? null : children;
}
