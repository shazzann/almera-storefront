"use client";

import { AdminApp } from "@/components/admin/admin-app";
import { previewSource } from "@/components/admin/preview-source";

export function AdminPreview() {
  return <AdminApp source={previewSource} />;
}
