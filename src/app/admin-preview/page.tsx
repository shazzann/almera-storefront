import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { AdminPreview } from "./preview";

export const metadata: Metadata = {
  title: "Admin preview",
  robots: { index: false, follow: false },
};

/** The admin console on sample data. Off in production unless built with ADMIN_PREVIEW=1. */
export default function AdminPreviewPage() {
  if (process.env.NODE_ENV === "production" && process.env.ADMIN_PREVIEW !== "1") notFound();
  return (
    <Suspense>
      <AdminPreview />
    </Suspense>
  );
}
