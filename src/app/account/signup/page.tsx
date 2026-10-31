"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useState, type FormEvent } from "react";
import { signInWithGoogleAction, signUpAction } from "@/actions/auth";
import { WardrobeMark } from "@/components/brand";

function SignUpForm() {
  const searchParams = useSearchParams();
  const next = searchParams.get("next") || "/account";

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [policyAccepted, setPolicyAccepted] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    if (!policyAccepted) {
      setError("Please accept the order & sizing policy to proceed.");
      return;
    }

    setLoading(true);

    try {
      const res = await signUpAction({ name, email, phone, password });
      if (res.success) {
        setSuccessMessage(res.message);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Registration failed. Please try again.");
    } finally {
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
        <p className="eyebrow mt-4 text-gold-deep">Join the Wardrobe</p>
        <h1 className="display mt-1 text-4xl sm:text-5xl">create account</h1>
        <p className="mt-2 text-sm text-ink/70">
          Save your sizes, track orders and enjoy seamless checkout across Sri Lanka.
        </p>
      </div>

      <div className="mt-8 rounded-[1.75rem] border border-line bg-ivory p-6 sm:p-8">
        {successMessage ? (
          <div className="text-center">
            <div className="mx-auto grid size-12 place-items-center rounded-full bg-sage-soft text-sage-deep">
              <svg className="size-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2 className="display mt-4 text-3xl">check your email</h2>
            <p className="mt-2 text-sm leading-relaxed text-ink/75">{successMessage}</p>
            <div className="mt-6 flex flex-col gap-2">
              <Link href="/account/login" className="btn btn-primary">
                Return to sign in
              </Link>
            </div>
          </div>
        ) : (
          <>
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
                  Full Name
                </label>
                <input
                  type="text"
                  required
                  autoComplete="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Amina Perera"
                  className="field"
                />
              </div>

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
                  placeholder="amina@example.com"
                  className="field"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-semibold tracking-wider text-ink/65 uppercase">
                  Mobile Number (Sri Lanka)
                </label>
                <input
                  type="tel"
                  required
                  autoComplete="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="077 123 4567"
                  className="field"
                />
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-xs font-semibold tracking-wider text-ink/65 uppercase">
                    Password
                  </label>
                  <input
                    type="password"
                    required
                    minLength={8}
                    autoComplete="new-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="field"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-semibold tracking-wider text-ink/65 uppercase">
                    Confirm Password
                  </label>
                  <input
                    type="password"
                    required
                    minLength={8}
                    autoComplete="new-password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="field"
                  />
                </div>
              </div>

              <label className="flex items-start gap-2.5 pt-2 text-xs leading-relaxed text-ink/75">
                <input
                  type="checkbox"
                  required
                  checked={policyAccepted}
                  onChange={(e) => setPolicyAccepted(e.target.checked)}
                  className="mt-0.5"
                />
                <span>
                  I understand that all sales are final (no returns/refunds) as described in the{" "}
                  <Link href="/help#policy" target="_blank" className="underline underline-offset-4">
                    order policy
                  </Link>
                  .
                </span>
              </label>

              <button
                type="submit"
                disabled={loading}
                className="btn btn-primary mt-3 w-full disabled:opacity-60"
              >
                {loading ? "Creating your account…" : "Create account"}
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
              Sign up with Google
            </button>

            <div className="mt-6 border-t border-line pt-4 text-center text-xs text-ink/65">
              Already have an account?{" "}
              <Link
                href={`/account/login${next !== "/account" ? `?next=${encodeURIComponent(next)}` : ""}`}
                className="font-semibold text-ink underline underline-offset-4 hover:text-sage-deep"
              >
                Sign in
              </Link>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default function SignUpPage() {
  return (
    <Suspense
      fallback={
        <div className="mx-auto max-w-md px-4 py-20 text-center text-sm text-ink/60">
          Loading sign up…
        </div>
      }
    >
      <SignUpForm />
    </Suspense>
  );
}

