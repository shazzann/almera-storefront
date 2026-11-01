import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense, type ReactNode } from "react";
import { AccountPreview } from "./preview";

export const metadata: Metadata = {
  title: "Account preview · almera",
  robots: { index: false },
};

/** The customer dashboard on sample data. Off in production unless built with ADMIN_PREVIEW=1. */
export default function Layout({ children }: { children: ReactNode }) {
  if (process.env.NODE_ENV === "production" && process.env.ADMIN_PREVIEW !== "1") notFound();
  return (
    <Suspense>
      <AccountPreview />
      {children}
    </Suspense>
  );
}
