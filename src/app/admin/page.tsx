import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import { AdminDashboard } from "@/components/admin-dashboard";
import { isAdminEmail } from "@/lib/admin-config";
import { getCurrentUser } from "@/lib/auth.server";

export const metadata: Metadata = {
  title: "Admin · Wardrobe & Orders",
  robots: { index: false, follow: false },
};

export const instant = false;

export default async function AdminPage() {
  await connection();

  const user = await getCurrentUser();

  if (!user) {
    redirect("/account/login?next=/admin");
  }

  if (!isAdminEmail(user.email)) {
    redirect("/");
  }

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

