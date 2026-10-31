"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState, type FormEvent } from "react";
import { signInAction, signInWithGoogleAction } from "@/actions/auth";
import { WardrobeMark } from "@/components/brand";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get("next") || "/account";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await signInAction({ email, password, next });
      if (res.success) {
        router.push(res.redirectUrl);
        router.refresh();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sign in failed. Please try again.");
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setError(null);
    try {
      await signInWithGoogleAction(next);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Google sign in failed.");
    }
  };

  return (
    <div className="mx-auto max-w-md px-4 py-12 sm:px-6 sm:py-16">
      <div className="text-center">
        <WardrobeMark className="mx-auto h-16 w-auto text-gold" />
        <p className="eyebrow mt-4 text-gold-deep">Welcome Back</p>
        <h1 className="display mt-1 text-4xl sm:text-5xl">sign in</h1>
        <p className="mt-2 text-sm text-ink/70">
          Access your wardrobe orders, saved addresses and faster checkout.
        </p>
      </div>

      <div className="mt-8 rounded-[1.75rem] border border-line bg-ivory p-6 sm:p-8">
        {error && (
          <div
            role="alert"
            className="mb-5 rounded-2xl border border-[#a5432f]/30 bg-[#a5432f]/10 p-3.5 text-xs text-[#a5432f]"
          >
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1.5 block text-xs font-semibold tracking-wider text-ink/65 uppercase">
              Email
            </label>
            <input
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="field"
            />
          </div>

          <div>
            <div className="mb-1.5 flex items-center justify-between">
              <label className="text-xs font-semibold tracking-wider text-ink/65 uppercase">
                Password
              </label>
              <Link
                href="/account/forgot-password"
                className="text-xs text-ink/60 underline underline-offset-4 hover:text-ink"
              >
                Forgot password?
              </Link>
            </div>
            <input
              type="password"
              required
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="field"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="btn btn-primary mt-2 w-full disabled:opacity-60"
          >
            {loading ? "Signing in…" : "Sign in"}
          </button>
        </form>

        <div className="relative my-6 text-center">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-line" />
          </div>
          <span className="relative bg-ivory px-3 text-xs tracking-wider text-ink/50 uppercase">
            or continue with
          </span>
        </div>

        {/* Google OAuth */}
        <button
          type="button"
          onClick={handleGoogleSignIn}
          className="flex min-h-12 w-full items-center justify-center gap-3 rounded-full border border-line bg-mist/60 px-4 py-2.5 text-sm font-medium transition hover:border-ink hover:bg-mist"
        >
          <svg className="size-4" viewBox="0 0 24 24" aria-hidden="true">
            <path
              fill="#4285F4"
              d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17Z"
            />
            <path
              fill="#34A853"
              d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.33 24 12 24Z"
            />
            <path
              fill="#FBBC05"
              d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.14-1.55.38-2.27V6.58H1.25C.45 8.18 0 9.99 0 12s.45 3.82 1.25 5.42l4.03-3.15Z"
            />
            <path
              fill="#EA4335"
              d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98Z"
            />
          </svg>
          Continue with Google
        </button>

        <div className="mt-6 border-t border-line pt-4 text-center text-xs text-ink/65">
          Don’t have an account yet?{" "}
          <Link
            href={`/account/signup${next !== "/account" ? `?next=${encodeURIComponent(next)}` : ""}`}
            className="font-semibold text-ink underline underline-offset-4 hover:text-sage-deep"
          >
            Create an account
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="mx-auto max-w-md px-4 py-20 text-center text-sm text-ink/60">
          Loading sign in…
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  );
}

