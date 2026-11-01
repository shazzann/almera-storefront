"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState, type ReactNode } from "react";
import {
  requestPasswordResetAction,
  resetPasswordAction,
  signInAction,
  signInWithGoogleAction,
  signUpAction,
} from "@/actions/auth";
import { Field } from "@/components/admin/ui";
import { WardrobeMark } from "@/components/brand";
import { CheckIcon } from "@/components/icons";
import { checkPassword } from "@/lib/password-policy";
import { safeNextPath } from "@/lib/safe-redirect";
import { PasswordChecklist, PasswordField } from "./password-field";

function AuthLayout({ title, subtitle, children }: { title: ReactNode; subtitle?: ReactNode; children: ReactNode }) {
  return (
    <div className="mx-auto w-full max-w-md px-4 pt-8 pb-12 sm:pt-14">
      <header className="text-center">
        <WardrobeMark className="mx-auto h-14 w-auto text-gold" />
        <h1 className="display mt-3 text-[2.6rem] leading-none sm:text-5xl">{title}</h1>
        {subtitle && <p className="mx-auto mt-2.5 max-w-xs text-[0.95rem] leading-snug text-ink/65">{subtitle}</p>}
      </header>
      <div className="mt-6">{children}</div>
    </div>
  );
}

const Alert = ({ children }: { children: ReactNode }) => (
  <p role="alert" className="rounded-xl bg-[#a5432f]/10 px-3.5 py-2.5 text-[0.92rem] leading-snug text-[#a5432f]">{children}</p>
);

function Done({ title, body, children }: { title: string; body: ReactNode; children?: ReactNode }) {
  return (
    <div className="rounded-[1.25rem] border border-line bg-ivory p-6 text-center" role="status">
      <span className="mx-auto grid size-12 place-items-center rounded-full bg-sage-soft text-sage-deep"><CheckIcon className="size-6" /></span>
      <h2 className="display mt-3 text-3xl">{title}</h2>
      <p className="mt-2 leading-relaxed text-ink/70">{body}</p>
      <div className="mt-5">{children}</div>
    </div>
  );
}

function GoogleButton({ next, onError }: { next: string; onError: (message: string) => void }) {
  const [busy, setBusy] = useState(false);

  async function start() {
    setBusy(true);
    const res = await signInWithGoogleAction(next);
    if (res && !res.ok) {
      onError(res.error);
      setBusy(false);
    }
  }

  return (
    <button type="button" onClick={start} disabled={busy} className="flex min-h-[3.25rem] w-full items-center justify-center gap-3 rounded-full border border-line bg-ivory font-medium transition active:scale-[0.98] disabled:opacity-60">
      <svg className="size-5" viewBox="0 0 24 24" aria-hidden>
        <path fill="#4285F4" d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17Z" />
        <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.33 24 12 24Z" />
        <path fill="#FBBC05" d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.14-1.55.38-2.27V6.58H1.25C.45 8.18 0 9.99 0 12s.45 3.82 1.25 5.42l4.03-3.15Z" />
        <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98Z" />
      </svg>
      {busy ? "Opening Google…" : "Continue with Google"}
    </button>
  );
}

const Divider = () => (
  <div className="my-5 flex items-center gap-3 text-[0.85rem] text-ink/50">
    <span className="h-px flex-1 bg-line" /> or <span className="h-px flex-1 bg-line" />
  </div>
);

const withNext = (path: string, next: string) => (next === "/account" ? path : `${path}?next=${encodeURIComponent(next)}`);

export function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const next = safeNextPath(params.get("next"));
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState(params.get("error") === "link" ? "That link has expired or was already used. Please sign in or request a new one." : "");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setBusy(true);
    const res = await signInAction({ email, password, next });
    if (res.ok) {
      router.replace(res.redirectUrl);
      router.refresh();
      return;
    }
    setBusy(false);
    setErrors(res.fields ?? {});
    if (!res.fields) {
      setError(res.error);
      setPassword("");
    }
  }

  return (
    <AuthLayout title="sign in" subtitle="Follow your orders and check out faster.">
      <GoogleButton next={next} onError={setError} />
      <Divider />
      <form onSubmit={submit} noValidate className="space-y-4">
        {error && <Alert>{error}</Alert>}
        <Field label="Email" error={errors.email}>
          <input type="email" inputMode="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="username" autoCapitalize="none" autoCorrect="off" spellCheck={false} enterKeyHint="next" className="field" />
        </Field>
        <PasswordField label="Password" value={password} onChange={setPassword} autoComplete="current-password" error={errors.password} enterKeyHint="go" />
        <button type="submit" disabled={busy} className="btn btn-primary w-full">{busy ? "Signing in…" : "Sign in"}</button>
      </form>
      <p className="mt-4 text-center">
        <Link href="/account/forgot-password" className="inline-block py-2 text-[0.92rem] font-medium text-sage-deep">Forgot your password?</Link>
      </p>
      <p className="mt-4 border-t border-line pt-5 text-center text-[0.95rem] text-ink/70">
        New to almera?{" "}
        <Link href={withNext("/account/signup", next)} className="py-2 font-semibold text-ink underline underline-offset-4">Create an account</Link>
      </p>
    </AuthLayout>
  );
}

export function SignupForm() {
  const params = useSearchParams();
  const next = safeNextPath(params.get("next"));
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [accepted, setAccepted] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState("");
  const context = { email, name };

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    const found: Record<string, string> = {};
    if (!checkPassword(password, context).valid) found.password = "This password doesn’t meet the rules below yet.";
    if (password !== confirm) found.confirm = "These passwords don’t match.";
    if (!accepted) found.acceptedPolicy = "Please accept the order policy to continue.";
    setErrors(found);
    if (found.password || found.confirm || found.acceptedPolicy) return;

    setBusy(true);
    const res = await signUpAction({ name, email, phone, password, acceptedPolicy: true });
    setBusy(false);
    if (res.ok) {
      setSent(res.message);
      setPassword("");
      setConfirm("");
    } else {
      setErrors(res.fields ?? {});
      if (!res.fields) setError(res.error);
    }
  }

  if (sent) {
    return (
      <AuthLayout title="almost done">
        <Done title="check your email" body={sent}>
          <Link href={withNext("/account/login", next)} className="btn btn-primary w-full">Back to sign in</Link>
        </Done>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout title="join almera" subtitle="Save your addresses and follow every order.">
      <GoogleButton next={next} onError={setError} />
      <Divider />
      <form onSubmit={submit} noValidate className="space-y-4">
        {error && <Alert>{error}</Alert>}
        <Field label="Full name" error={errors.name}>
          <input value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" autoCapitalize="words" enterKeyHint="next" className="field" />
        </Field>
        <Field label="Email" error={errors.email} hint="We’ll send a link to confirm it’s yours.">
          <input type="email" inputMode="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="username" autoCapitalize="none" autoCorrect="off" spellCheck={false} enterKeyHint="next" className="field" />
        </Field>
        <Field label="Mobile number" error={errors.phone}>
          <input type="tel" inputMode="tel" value={phone} onChange={(e) => setPhone(e.target.value)} autoComplete="tel" placeholder="077 123 4567" enterKeyHint="next" className="field" />
        </Field>
        <PasswordField label="Password" value={password} onChange={setPassword} autoComplete="new-password" error={errors.password} enterKeyHint="next" />
        <PasswordChecklist password={password} context={context} />
        <PasswordField label="Type it again" value={confirm} onChange={setConfirm} autoComplete="new-password" error={errors.confirm} />
        <div>
          <label className="flex min-h-11 items-start gap-3 py-1 text-[0.92rem] leading-snug">
            <input type="checkbox" checked={accepted} onChange={(e) => { setAccepted(e.target.checked); setErrors((x) => ({ ...x, acceptedPolicy: "" })); }} className="mt-0.5 size-5 shrink-0 accent-[var(--color-ink)]" />
            <span>I understand all sales are final, as explained in the <Link href="/help#policy" target="_blank" className="underline underline-offset-4">order policy</Link>.</span>
          </label>
          {errors.acceptedPolicy && <p role="alert" className="mt-1 text-[0.85rem] text-[#a5432f]">{errors.acceptedPolicy}</p>}
        </div>
        <button type="submit" disabled={busy} className="btn btn-primary w-full">{busy ? "Creating your account…" : "Create account"}</button>
      </form>
      <p className="mt-5 border-t border-line pt-5 text-center text-[0.95rem] text-ink/70">
        Already with us?{" "}
        <Link href={withNext("/account/login", next)} className="py-2 font-semibold text-ink underline underline-offset-4">Sign in</Link>
      </p>
    </AuthLayout>
  );
}

export function ForgotForm() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [sent, setSent] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setBusy(true);
    const res = await requestPasswordResetAction(email);
    setBusy(false);
    if (res.ok) setSent(res.message);
    else setError(res.error);
  }

  if (sent) {
    return (
      <AuthLayout title="reset password">
        <Done title="check your email" body={sent}>
          <Link href="/account/login" className="btn btn-primary w-full">Back to sign in</Link>
        </Done>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout title="reset password" subtitle="We’ll email you a link to choose a new one.">
      <form onSubmit={submit} noValidate className="space-y-4">
        {error && <Alert>{error}</Alert>}
        <Field label="Email">
          <input type="email" inputMode="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="username" autoCapitalize="none" autoCorrect="off" spellCheck={false} enterKeyHint="send" className="field" />
        </Field>
        <button type="submit" disabled={busy} className="btn btn-primary w-full">{busy ? "Sending…" : "Send link"}</button>
      </form>
      <p className="mt-4 text-center">
        <Link href="/account/login" className="inline-block py-2 text-[0.92rem] font-medium text-sage-deep">Back to sign in</Link>
      </p>
    </AuthLayout>
  );
}

export function ResetForm({ email, name, linkValid }: { email: string; name: string; linkValid: boolean }) {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const context = { email, name };

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    const found: Record<string, string> = {};
    if (!checkPassword(password, context).valid) found.password = "This password doesn’t meet the rules below yet.";
    if (password !== confirm) found.confirm = "These passwords don’t match.";
    setErrors(found);
    if (Object.keys(found).length > 0) return;

    setBusy(true);
    const res = await resetPasswordAction(password);
    setBusy(false);
    if (res.ok) {
      setDone(true);
      setPassword("");
      setConfirm("");
      router.refresh();
    } else {
      setError(res.error);
    }
  }

  if (!linkValid) {
    return (
      <AuthLayout title="link expired" subtitle="Reset links only work for a short time, and only once.">
        <Link href="/account/forgot-password" className="btn btn-primary w-full">Request a new link</Link>
      </AuthLayout>
    );
  }

  if (done) {
    return (
      <AuthLayout title="all set">
        <Done title="password changed" body="You’re signed in here, and any other devices have been signed out.">
          <Link href="/account" className="btn btn-primary w-full">Go to my account</Link>
        </Done>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout title="new password" subtitle="Choose one you don’t use anywhere else.">
      <form onSubmit={submit} noValidate className="space-y-4">
        {error && <Alert>{error}</Alert>}
        <input type="email" value={email} readOnly autoComplete="username" className="sr-only" tabIndex={-1} aria-hidden />
        <PasswordField label="New password" value={password} onChange={setPassword} autoComplete="new-password" error={errors.password} enterKeyHint="next" />
        <PasswordChecklist password={password} context={context} />
        <PasswordField label="Type it again" value={confirm} onChange={setConfirm} autoComplete="new-password" error={errors.confirm} />
        <button type="submit" disabled={busy} className="btn btn-primary w-full">{busy ? "Saving…" : "Save new password"}</button>
      </form>
    </AuthLayout>
  );
}
