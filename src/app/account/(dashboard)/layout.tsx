import type { Metadata } from "next";
import type { ReactNode } from "react";
import { RealAccount } from "@/components/account/real-provider";

export const metadata: Metadata = {
  title: "My account",
  robots: { index: false },
};

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return <RealAccount>{children}</RealAccount>;
}
