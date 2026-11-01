"use client";

import { useRouter } from "next/navigation";
import { useMemo, type ReactNode } from "react";
import {
  changePasswordAction,
  deleteCustomerAddressAction,
  sendPasswordLinkAction,
  setDefaultAddressAction,
  signOutAction,
  signOutEverywhereAction,
  updateCustomerProfileAction,
  upsertCustomerAddressAction,
} from "@/actions/auth";
import { AccountProvider } from "./context";
import { AccountShell } from "./shell";
import type { AccountApi } from "./types";

export function RealAccount({ children }: { children: ReactNode }) {
  const router = useRouter();

  const api = useMemo<AccountApi>(() => {
    // Other tabs of the dashboard show this data too, so they're refreshed after each change.
    const refreshed = async <T,>(work: Promise<T>) => {
      const result = await work;
      router.refresh();
      return result;
    };
    return {
      saveProfile: (input) => refreshed(updateCustomerProfileAction(input)),
      saveAddress: (input) => refreshed(upsertCustomerAddressAction(input)),
      setDefaultAddress: (id) => refreshed(setDefaultAddressAction(id)),
      deleteAddress: (id) => refreshed(deleteCustomerAddressAction(id)),
      changePassword: (input) => changePasswordAction(input),
      sendPasswordLink: () => sendPasswordLinkAction(),
      signOut: () => signOutAction(),
      signOutEverywhere: () => signOutEverywhereAction(),
    };
  }, [router]);

  return (
    <AccountProvider api={api} base="/account">
      <AccountShell>{children}</AccountShell>
    </AccountProvider>
  );
}
