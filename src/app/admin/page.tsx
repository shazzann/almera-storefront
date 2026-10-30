import type { Metadata } from "next";
import { Suspense } from "react";
import { AdminDashboard } from "@/components/admin-dashboard";

export const metadata: Metadata = {
  title: "Admin · Wardrobe & Orders",
  robots: { index: false, follow: false },
};

export default function AdminPage() {
  return (
    <Suspense
      fallback={
        <div className="mx-auto max-w-7xl px-4 py-16 text-center text-sm text-ink/60">
          Loading admin console…
        </div>
      }
    >
      <AdminDashboard />
    </Suspense>
  );
}

