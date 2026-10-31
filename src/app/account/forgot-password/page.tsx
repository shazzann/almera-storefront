"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import { requestPasswordResetAction } from "@/actions/auth";
import { WardrobeMark } from "@/components/brand";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await requestPasswordResetAction(email);
      setMessage(res.message);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Request failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-md px-4 py-12 sm:px-6 sm:py-16">
      <div className="text-center">
        <WardrobeMark className="mx-auto h-16 w-auto text-gold" />
        <p className="eyebrow mt-4 text-gold-deep">Account Recovery</p>
        <h1 className="display mt-1 text-4xl sm:text-5xl">reset password</h1>
        <p className="mt-2 text-sm text-ink/70">
          Enter your email and we’ll send a link to reset your password.
        </p>
      </div>

      <div className="mt-8 rounded-[1.75rem] border border-line bg-ivory p-6 sm:p-8">
        {message ? (
          <div className="text-center">
            <div className="mx-auto grid size-12 place-items-center rounded-full bg-sage-soft text-sage-deep">
              <svg className="size-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2 className="display mt-4 text-3xl">email sent</h2>
            <p className="mt-2 text-sm leading-relaxed text-ink/75">{message}</p>
            <div className="mt-6">
              <Link href="/account/login" className="btn btn-primary w-full">
                Return to sign in
              </Link>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div
                role="alert"
                className="rounded-2xl border border-[#a5432f]/30 bg-[#a5432f]/10 p-3.5 text-xs text-[#a5432f]"
              >
                {error}
              </div>
            )}

            <div>
              <label className="mb-1.5 block text-xs font-semibold tracking-wider text-ink/65 uppercase">
                Account Email
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

            <button
              type="submit"
              disabled={loading}
              className="btn btn-primary w-full disabled:opacity-60"
            >
              {loading ? "Sending link…" : "Send reset link"}
            </button>

            <div className="pt-2 text-center text-xs">
              <Link
                href="/account/login"
                className="text-ink/65 underline underline-offset-4 hover:text-ink"
              >
                ← Back to sign in
              </Link>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

