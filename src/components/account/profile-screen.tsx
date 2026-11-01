"use client";

import Link from "next/link";
import { useState } from "react";
import { SignOutIcon } from "@/components/admin/admin-icons";
import { AdminSheet, Field } from "@/components/admin/ui";
import { CheckIcon, ChevronIcon } from "@/components/icons";
import { checkPassword } from "@/lib/password-policy";
import { LockIcon, ShieldIcon } from "./account-icons";
import { useAccount } from "./context";
import { formatDate } from "./order-status";
import { PasswordChecklist, PasswordField } from "./password-field";
import { ScreenTitle } from "./shell";
import type { AccountProfile } from "./types";

export function ProfileScreen({ profile }: { profile: AccountProfile }) {
  const { api, toast } = useAccount();
  const [saved, setSaved] = useState({ name: profile.name, phone: profile.phone });
  const [name, setName] = useState(profile.name);
  const [phone, setPhone] = useState(profile.phone);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [passwordOpen, setPasswordOpen] = useState(false);
  const [everywhereOpen, setEverywhereOpen] = useState(false);
  const [linkBusy, setLinkBusy] = useState(false);
  const changed = name !== saved.name || phone !== saved.phone;

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    const res = await api.saveProfile({ fullName: name, phone });
    setBusy(false);
    if (res.ok) {
      setSaved({ name, phone });
      setErrors({});
      toast("Details saved");
    } else {
      setErrors(res.fields ?? {});
      if (!res.fields) toast(res.error, "err");
    }
  }

  async function sendLink() {
    setLinkBusy(true);
    const res = await api.sendPasswordLink();
    setLinkBusy(false);
    toast(res.ok ? `We’ve emailed a link to ${profile.email}` : res.error, res.ok ? "ok" : "err");
  }

  const rowClass = "flex min-h-16 w-full items-center gap-3.5 px-4 py-2 text-left";
  const iconClass = "grid size-10 shrink-0 place-items-center rounded-full bg-sage-soft text-sage-deep";

  return (
    <>
      <ScreenTitle title="profile" />
      <div className="mt-4 space-y-3 px-4 lg:px-0">
        <form onSubmit={save} noValidate className="space-y-4 rounded-[1.25rem] border border-line bg-ivory p-4">
          <h2 className="font-semibold">Your details</h2>
          <Field label="Full name" error={errors.fullName}>
            <input value={name} onChange={(e) => { setName(e.target.value); setErrors((x) => ({ ...x, fullName: "" })); }} autoComplete="name" autoCapitalize="words" enterKeyHint="next" className="field" />
          </Field>
          <Field label="Mobile number" error={errors.phone} hint="Filled in for you at checkout.">
            <input value={phone} onChange={(e) => { setPhone(e.target.value); setErrors((x) => ({ ...x, phone: "" })); }} type="tel" inputMode="tel" autoComplete="tel" placeholder="077 123 4567" enterKeyHint="done" className="field" />
          </Field>
          <div>
            <p className="mb-1.5 text-[0.9rem] font-medium">Email</p>
            <p className="flex min-h-[3.25rem] items-center justify-between gap-3 rounded-xl bg-mist px-4">
              <span className="min-w-0 truncate">{profile.email}</span>
              {profile.emailVerified && (
                <span className="inline-flex shrink-0 items-center gap-1 text-[0.8rem] font-semibold text-sage-deep"><CheckIcon className="size-4" /> Verified</span>
              )}
            </p>
          </div>
          <button type="submit" disabled={busy || !changed} className="btn btn-primary w-full disabled:opacity-50">{busy ? "Saving…" : "Save details"}</button>
        </form>

        <section className="divide-y divide-line rounded-[1.25rem] border border-line bg-ivory">
          <h2 className="px-4 pt-4 pb-3 font-semibold">Security</h2>
          {profile.hasPassword ? (
            <button type="button" onClick={() => setPasswordOpen(true)} className={rowClass}>
              <span className={iconClass}><LockIcon className="size-5" /></span>
              <span className="min-w-0 flex-1 font-medium">Change password</span>
              <ChevronIcon className="size-4 opacity-40" />
            </button>
          ) : (
            <button type="button" onClick={sendLink} disabled={linkBusy} className={rowClass}>
              <span className={iconClass}><LockIcon className="size-5" /></span>
              <span className="min-w-0 flex-1">
                <span className="block font-medium">{linkBusy ? "Sending…" : "Set a password"}</span>
                <span className="block text-[0.85rem] text-ink/60">You sign in with Google. We’ll email you a secure link.</span>
              </span>
            </button>
          )}
          <button type="button" onClick={() => setEverywhereOpen(true)} className={rowClass}>
            <span className={iconClass}><ShieldIcon className="size-5" /></span>
            <span className="min-w-0 flex-1">
              <span className="block font-medium">Sign out on all devices</span>
              <span className="block text-[0.85rem] text-ink/60">
                {profile.lastSignIn ? `Last sign-in ${formatDate(profile.lastSignIn)}` : "Use this if you lost a phone"}
                {profile.viaGoogle ? " · Google connected" : ""}
              </span>
            </span>
            <ChevronIcon className="size-4 opacity-40" />
          </button>
        </section>

        <button type="button" onClick={() => api.signOut()} className="flex min-h-14 w-full items-center justify-center gap-2.5 rounded-[1.25rem] border border-line bg-ivory font-medium">
          <SignOutIcon className="size-5" /> Sign out
        </button>

        <p className="pt-1 text-center text-[0.85rem] text-ink/60">
          <Link href="/help#policy" className="underline underline-offset-4">Order policy</Link>
        </p>
      </div>

      <AdminSheet open={passwordOpen} onClose={() => setPasswordOpen(false)} title="change password">
        <ChangePassword profile={profile} onDone={() => { setPasswordOpen(false); toast("Password changed. Other devices have been signed out."); }} />
      </AdminSheet>

      <AdminSheet open={everywhereOpen} onClose={() => setEverywhereOpen(false)} title="sign out everywhere?">
        <EverywhereConfirm onCancel={() => setEverywhereOpen(false)} />
      </AdminSheet>
    </>
  );
}

function EverywhereConfirm({ onCancel }: { onCancel: () => void }) {
  const { api } = useAccount();
  const [busy, setBusy] = useState(false);

  return (
    <div className="p-5 pb-8">
      <p className="leading-relaxed text-ink/75">You’ll be signed out here and on every other phone or computer, and will need to sign in again.</p>
      <button type="button" disabled={busy} onClick={() => { setBusy(true); api.signOutEverywhere(); }} className="btn btn-primary mt-5 w-full">{busy ? "Signing out…" : "Sign out everywhere"}</button>
      <button type="button" disabled={busy} onClick={onCancel} className="btn btn-ghost mt-2.5 w-full">Stay signed in</button>
    </div>
  );
}

function ChangePassword({ profile, onDone }: { profile: AccountProfile; onDone: () => void }) {
  const { api } = useAccount();
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState("");
  const [busy, setBusy] = useState(false);
  const context = { email: profile.email, name: profile.name };

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const found: Record<string, string> = {};
    if (!current) found.current = "Enter your current password.";
    if (!checkPassword(next, context).valid) found.next = "This password doesn’t meet the rules below yet.";
    if (next !== confirm) found.confirm = "These passwords don’t match.";
    setErrors(found);
    setFormError("");
    if (Object.keys(found).length > 0) return;

    setBusy(true);
    const res = await api.changePassword({ current, next });
    setBusy(false);
    if (res.ok) {
      onDone();
    } else if (res.fields) {
      setErrors(res.fields);
    } else {
      setFormError(res.error);
    }
  }

  return (
    <form onSubmit={submit} noValidate className="space-y-4 p-5 pb-8">
      {formError && <p role="alert" className="rounded-xl bg-[#a5432f]/10 px-3.5 py-2.5 text-[0.92rem] text-[#a5432f]">{formError}</p>}
      <PasswordField label="Current password" value={current} onChange={setCurrent} autoComplete="current-password" error={errors.current} enterKeyHint="next" />
      <PasswordField label="New password" value={next} onChange={setNext} autoComplete="new-password" error={errors.next} enterKeyHint="next" />
      <PasswordChecklist password={next} context={context} />
      <PasswordField label="Type it again" value={confirm} onChange={setConfirm} autoComplete="new-password" error={errors.confirm} />
      <p className="text-[0.85rem] leading-snug text-ink/60">Other phones and computers will be signed out when you change it.</p>
      <button type="submit" disabled={busy} className="btn btn-primary w-full">{busy ? "Changing…" : "Change password"}</button>
    </form>
  );
}
