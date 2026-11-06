"use client";

import dynamic from "next/dynamic";

const DynamicCartDrawer = dynamic(
  () => import("@/components/cart-drawer").then((mod) => mod.CartDrawer),
  { ssr: false },
);

export function LazyCartDrawer() {
  return <DynamicCartDrawer />;
}

