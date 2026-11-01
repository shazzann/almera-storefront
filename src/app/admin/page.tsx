import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import { AdminClient } from "@/components/admin/admin-client";
import { isAdminEmail } from "@/lib/admin-config";
import { getCurrentUser } from "@/lib/auth.server";

export const metadata: Metadata = {
  title: "Admin",
  robots: { index: false, follow: false },
  manifest: "/admin.webmanifest",
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
    <Suspense>
      <AdminClient />
    </Suspense>
  );
}

