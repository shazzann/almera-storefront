"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import type { AccountApi } from "./types";

type Toast = { id: number; text: string; kind: "ok" | "err" };

type AccountCtx = {
  api: AccountApi;
  /** Where the dashboard lives, so the preview can run the same screens. */
  base: string;
  toast: (text: string, kind?: Toast["kind"]) => void;
};

const Ctx = createContext<AccountCtx | null>(null);

export function useAccount() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useAccount must be used inside AccountProvider");
  return ctx;
}

export function AccountProvider({ api, base, children }: { api: AccountApi; base: string; children: ReactNode }) {
  const [message, setMessage] = useState<Toast | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const toast = useCallback<AccountCtx["toast"]>((text, kind = "ok") => {
    if (timer.current) clearTimeout(timer.current);
    setMessage({ id: Date.now(), text, kind });
    timer.current = setTimeout(() => setMessage(null), kind === "err" ? 6000 : 3500);
  }, []);

  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);

  const value = useMemo(() => ({ api, base, toast }), [api, base, toast]);

  return (
    <Ctx.Provider value={value}>
      {children}
      {message && (
        <div
          key={message.id}
          role={message.kind === "err" ? "alert" : "status"}
          className={`fixed inset-x-4 bottom-[calc(5.5rem+env(safe-area-inset-bottom))] z-[70] mx-auto max-w-sm rounded-2xl px-4 py-3 text-center text-[0.92rem] font-medium shadow-lg lg:bottom-6 ${message.kind === "err" ? "bg-[#a5432f] text-ivory" : "bg-ink text-ivory"}`}
        >
          {message.text}
        </div>
      )}
    </Ctx.Provider>
  );
}
