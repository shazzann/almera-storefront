"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { resetPasswordAction } from "@/actions/auth";
import { WardrobeMark } from "@/components/brand";

export default function ResetPasswordPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);

    if (password.length < 8) {
      setError("Password must be at least 8 characters long.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);

    try {
      await resetPasswordAction(password);
      setSuccess(true);
      setTimeout(() => {
        router.push("/account");
      }, 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Password reset failed. The link may have expired.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-md px-4 py-12 sm:px-6 sm:py-16">
      <div className="text-center">
        <WardrobeMark className="mx-auto h-16 w-auto text-gold" />
        <p className="eyebrow mt-4 text-gold-deep">New Password</p>
        <h1 className="display mt-1 text-4xl sm:text-5xl">set password</h1>
        <p className="mt-2 text-sm text-ink/70">
          Enter a secure password for your Almera wardrobe account.
        </p>
      </div>

      <div className="mt-8 rounded-[1.75rem] border border-line bg-ivory p-6 sm:p-8">
        {success ? (
          <div className="text-center">
            <div className="mx-auto grid size-12 place-items-center rounded-full bg-sage-soft text-sage-deep">
              <svg className="size-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2 className="display mt-4 text-3xl">password updated</h2>
            <p className="mt-2 text-sm text-ink/70">
              Redirecting you to your account dashboard…
            </p>
            <div className="mt-6">
              <Link href="/account" className="btn btn-primary w-full">
                Go to my account
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
                New Password (min. 8 characters)
              </label>
              <input
                type="password"
                required
                minLength={8}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="field"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-semibold tracking-wider text-ink/65 uppercase">
                Confirm New Password
              </label>
              <input
                type="password"
                required
                minLength={8}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="field"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn btn-primary w-full disabled:opacity-60"
            >
              {loading ? "Updating password…" : "Update password"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

