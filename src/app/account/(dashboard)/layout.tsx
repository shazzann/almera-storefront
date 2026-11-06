import type { Metadata } from "next";
import type { ReactNode } from "react";
import { RealAccount } from "@/components/account/real-provider";
import { buildMetadata } from "@/lib/seo/metadata";

export const metadata: Metadata = buildMetadata({
  title: "My Account",
  description: "Manage your almera orders, delivery addresses, and profile settings.",
  path: "/account",
  noindex: true,
});

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return <RealAccount>{children}</RealAccount>;
}
