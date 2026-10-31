"use client";

import { useEffect, useState, type FormEvent } from "react";
import {
  getCustomerProfileAction,
  resetPasswordAction,
  updateCustomerProfileAction,
} from "@/actions/auth";
import { AccountNav } from "@/components/account-nav";
import { DISTRICTS } from "@/lib/catalog";

export default function AccountProfilePage() {
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<{
    id: string;
    email: string;
    full_name: string;
    phone: string;
    default_shipping_address: string;
    default_shipping_city: string;
    default_shipping_district: string;
  } | null>(null);

  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileBanner, setProfileBanner] = useState<{ kind: "ok" | "err"; text: string } | null>(
    null,
  );

  // Password update
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [savingPassword, setSavingPassword] = useState(false);
  const [passwordBanner, setPasswordBanner] = useState<{ kind: "ok" | "err"; text: string } | null>(
    null,
  );

  useEffect(() => {
    getCustomerProfileAction()
      .then((data) => {
        setProfile(data);
        setFullName(data.full_name);
        setPhone(data.phone);
        setLoading(false);
      })
      .catch(() => {
        setLoading(false);
      });
  }, []);

  const handleUpdateProfile = async (e: FormEvent) => {
    e.preventDefault();
    setProfileBanner(null);
    setSavingProfile(true);

    try {
      await updateCustomerProfileAction({
        fullName,
        phone,
      });
      setProfileBanner({ kind: "ok", text: "Profile details updated successfully." });
    } catch (err) {
      setProfileBanner({
        kind: "err",
        text: err instanceof Error ? err.message : "Failed to update profile.",
      });
    } finally {
      setSavingProfile(false);
    }
  };

  const handleUpdatePassword = async (e: FormEvent) => {
    e.preventDefault();
    setPasswordBanner(null);

    if (password.length < 8) {
      setPasswordBanner({ kind: "err", text: "Password must be at least 8 characters long." });
      return;
    }

    if (password !== confirmPassword) {
      setPasswordBanner({ kind: "err", text: "Passwords do not match." });
      return;
    }

    setSavingPassword(true);

    try {
      await resetPasswordAction(password);
      setPasswordBanner({ kind: "ok", text: "Password updated successfully." });
      setPassword("");
      setConfirmPassword("");
    } catch (err) {
      setPasswordBanner({
        kind: "err",
        text: err instanceof Error ? err.message : "Failed to update password.",
      });
    } finally {
      setSavingPassword(false);
    }
  };

  if (loading) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-16 text-center text-sm text-ink/60">
        Loading profile details…
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 sm:py-12">
      <div className="mb-6">
        <p className="eyebrow text-gold-deep">Wardrobe Settings</p>
        <h1 className="display mt-1 text-4xl sm:text-5xl">profile &amp; security</h1>
        <p className="mt-1 text-xs text-ink/60">
          Manage your personal details, contact information and account security.
        </p>
      </div>

      <AccountNav />

      <div className="mt-8 grid gap-8 md:grid-cols-2">
        {/* Profile Information */}
        <div className="rounded-2xl border border-line bg-ivory p-6">
          <h2 className="display text-2xl">personal details</h2>
          <p className="mt-1 text-xs text-ink/65">
            This name and mobile number will be pre-filled at checkout.
          </p>

          {profileBanner && (
            <div
              className={`mt-4 rounded-xl p-3 text-xs ${
                profileBanner.kind === "ok"
                  ? "bg-sage-soft text-sage-deep"
                  : "bg-[#a5432f]/10 text-[#a5432f]"
              }`}
            >
              {profileBanner.text}
            </div>
          )}

          <form onSubmit={handleUpdateProfile} className="mt-5 space-y-4">
            <div>
              <label className="mb-1 block text-xs font-semibold tracking-wider text-ink/65 uppercase">
                Account Email
              </label>
              <input
                type="email"
                disabled
                value={profile?.email ?? ""}
                className="field cursor-not-allowed bg-mist/60 font-mono text-xs text-ink/60"
              />
              <p className="mt-1 text-[11px] text-ink/50">Email cannot be changed.</p>
            </div>

            <div>
              <label className="mb-1 block text-xs font-semibold tracking-wider text-ink/65 uppercase">
                Full Name
              </label>
              <input
                type="text"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="field text-sm"
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-semibold tracking-wider text-ink/65 uppercase">
                Mobile Number
              </label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="077 123 4567"
                className="field text-sm"
              />
              <p className="mt-1 text-[11px] text-ink/50">
                Used to coordinate delivery dispatch on WhatsApp or phone.
              </p>
            </div>

            <button
              type="submit"
              disabled={savingProfile}
              className="btn btn-primary mt-2 w-full disabled:opacity-60"
            >
              {savingProfile ? "Saving changes…" : "Save details"}
            </button>
          </form>
        </div>

        {/* Password Security */}
        <div className="rounded-2xl border border-line bg-ivory p-6">
          <h2 className="display text-2xl">change password</h2>
          <p className="mt-1 text-xs text-ink/65">
            Choose a strong password with at least 8 characters.
          </p>

          {passwordBanner && (
            <div
              className={`mt-4 rounded-xl p-3 text-xs ${
                passwordBanner.kind === "ok"
                  ? "bg-sage-soft text-sage-deep"
                  : "bg-[#a5432f]/10 text-[#a5432f]"
              }`}
            >
              {passwordBanner.text}
            </div>
          )}

          <form onSubmit={handleUpdatePassword} className="mt-5 space-y-4">
            <div>
              <label className="mb-1 block text-xs font-semibold tracking-wider text-ink/65 uppercase">
                New Password
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
              <label className="mb-1 block text-xs font-semibold tracking-wider text-ink/65 uppercase">
                Confirm Password
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
              disabled={savingPassword || !password}
              className="btn btn-primary mt-2 w-full disabled:opacity-60"
            >
              {savingPassword ? "Updating password…" : "Update password"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

