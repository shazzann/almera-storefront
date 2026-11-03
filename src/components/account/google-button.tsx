"use client";

import { useEffect, useRef, useState } from "react";
import { completeGoogleSignInAction, signInWithGoogleAction } from "@/actions/auth";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";

const CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
const SCRIPT_URL = "https://accounts.google.com/gsi/client";

type GoogleId = {
  initialize(config: {
    client_id: string;
    nonce: string;
    callback: (response: { credential?: string }) => void;
    ux_mode?: "popup";
    itp_support?: boolean;
  }): void;
  renderButton(element: HTMLElement, options: Record<string, string | number>): void;
};

declare global {
  interface Window {
    google?: { accounts?: { id?: GoogleId } };
  }
}

let scriptPromise: Promise<GoogleId> | null = null;

/** Loads Google's sign-in script once, and gives up after a few seconds so the backup button stays. */
function loadGoogle(): Promise<GoogleId> {
  scriptPromise ??= new Promise<GoogleId>((resolve, reject) => {
    const ready = () => (window.google?.accounts?.id ? resolve(window.google.accounts.id) : reject(new Error("unavailable")));
    const script = document.createElement("script");
    script.src = SCRIPT_URL;
    script.async = true;
    script.onload = ready;
    script.onerror = () => reject(new Error("blocked"));
    document.head.appendChild(script);
    setTimeout(() => reject(new Error("timeout")), 6000);
  }).catch((err) => {
    scriptPromise = null;
    throw err;
  });
  return scriptPromise;
}

/** Google draws an empty button on addresses it hasn't approved, so wait until it really has a size. */
function buttonAppeared(holder: HTMLElement) {
  return new Promise<boolean>((resolve) => {
    const started = Date.now();
    const check = () => {
      const frame = holder.querySelector("iframe");
      if (frame && frame.getBoundingClientRect().height > 20) return resolve(true);
      if (Date.now() - started > 5000) return resolve(false);
      setTimeout(check, 150);
    };
    check();
  });
}

async function sha256Hex(text: string) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, "0")).join("");
}

const GoogleLogo = () => (
  <svg className="size-5" viewBox="0 0 24 24" aria-hidden>
    <path fill="#4285F4" d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17Z" />
    <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.33 24 12 24Z" />
    <path fill="#FBBC05" d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.14-1.55.38-2.27V6.58H1.25C.45 8.18 0 9.99 0 12s.45 3.82 1.25 5.42l4.03-3.15Z" />
    <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98Z" />
  </svg>
);

/**
 * Google's own button, so its sign-in window names almera.lk instead of our Supabase address,
 * and the customer never leaves the site. Until it loads, or if it can't, the older redirect
 * button is shown instead, so Google sign-in always works.
 */
export function GoogleButton({ next, onError }: { next: string; onError: (message: string) => void }) {
  const holder = useRef<HTMLDivElement>(null);
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const supabase = getSupabaseBrowserClient();
    if (!CLIENT_ID || !supabase) return;
    let cancelled = false;

    (async () => {
      const google = await loadGoogle();
      const rawNonce = `${crypto.randomUUID()}${crypto.randomUUID()}`;
      const hashedNonce = await sha256Hex(rawNonce);
      if (cancelled || !holder.current) return;

      google.initialize({
        client_id: CLIENT_ID,
        // Google signs the hashed nonce into its token; Supabase checks it against the raw one.
        nonce: hashedNonce,
        ux_mode: "popup",
        itp_support: true,
        callback: async ({ credential }) => {
          if (!credential) return;
          setBusy(true);
          const { error } = await supabase.auth.signInWithIdToken({ provider: "google", token: credential, nonce: rawNonce });
          if (error) {
            setBusy(false);
            onError("Google sign-in didn’t work. Please try again.");
            return;
          }
          await completeGoogleSignInAction();
          window.location.assign(next);
        },
      });
      google.renderButton(holder.current, {
        type: "standard",
        theme: "outline",
        size: "large",
        shape: "pill",
        text: "continue_with",
        logo_alignment: "center",
        width: Math.min(400, Math.round(holder.current.getBoundingClientRect().width)) || 320,
      });
      if (!cancelled && (await buttonAppeared(holder.current))) setReady(true);
    })().catch(() => {
      // The backup button stays visible.
    });

    return () => {
      cancelled = true;
    };
  }, [next, onError]);

  async function redirectToGoogle() {
    setBusy(true);
    const res = await signInWithGoogleAction(next);
    if (res && !res.ok) {
      onError(res.error);
      setBusy(false);
    }
  }

  return (
    <div className="relative">
      <div ref={holder} aria-hidden={!ready} className={`flex min-h-[3.25rem] items-center justify-center ${ready && !busy ? "" : "pointer-events-none absolute inset-0 opacity-0"}`} />
      {(!ready || busy) && (
        <button type="button" onClick={redirectToGoogle} disabled={busy} className="flex min-h-[3.25rem] w-full items-center justify-center gap-3 rounded-full border border-line bg-ivory font-medium transition active:scale-[0.98] disabled:opacity-60">
          <GoogleLogo />
          {busy ? "Signing you in…" : "Continue with Google"}
        </button>
      )}
    </div>
  );
}
