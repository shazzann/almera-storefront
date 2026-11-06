import type { Metadata } from "next";
import type { ReactNode } from "react";
import { buildMetadata } from "@/lib/seo/metadata";

export const metadata: Metadata = buildMetadata({
  title: "Sign In",
  description: "Sign in to your almera customer account to view orders and saved addresses.",
  path: "/account/login",
  noindex: true,
});

export default function AuthLayout({ children }: { children: ReactNode }) {
  return children;
}
