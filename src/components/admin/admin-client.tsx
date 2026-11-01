"use client";

import { AdminApp } from "./admin-app";
import { realSource } from "./real-source";

export function AdminClient() {
  return <AdminApp source={realSource} />;
}
