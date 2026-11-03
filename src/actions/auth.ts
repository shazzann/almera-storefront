"use server";

import { createClient } from "@supabase/supabase-js";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { after } from "next/server";
import { z } from "zod";
import { ADDRESS_COLUMNS, linkGuestOrders } from "@/lib/account.server";
import { getCurrentUser, requireUser } from "@/lib/auth.server";
import { DISTRICTS } from "@/lib/catalog";
import { getSiteUrl, isEmailConfigured, sendEmail } from "@/lib/email/mailer.server";
import { passwordResetEmail, signupConfirmationEmail } from "@/lib/email/templates";
import { isBreachedPassword } from "@/lib/password-breach.server";
import { passwordProblem, type PasswordContext } from "@/lib/password-policy";
import {
  AUTH_LIMITS,
  AUTH_SIGNUP_RATE_LIMIT,
  allowAuthAttempt,
  getClientIp,
} from "@/lib/rate-limit.server";
import { clearPasswordRecovery, hasPasswordRecovery } from "@/lib/recovery.server";
import { safeNextPath } from "@/lib/safe-redirect";
import { getSupabaseAdmin } from "@/lib/supabase/admin.server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

/**
 * These return their errors instead of throwing: a live Next.js site replaces thrown
 * messages with a generic one, and customers need to see what to fix.
 */
export type AuthResult<T = object> =
  | ({ ok: true } & T)
  | { ok: false; error: string; fields?: Record<string, string> };

const SL_PHONE_REGEX = /^(?:\+94|0)?7\d{8}$/;
const TOO_MANY = "Too many attempts. Please wait a few minutes and try again.";
const BREACHED = "This password has appeared in a known data leak, so it isn’t safe to use. Please choose another.";
const SOMETHING_WRONG = "Something went wrong. Please try again.";

function normalizePhone(raw: string): string {
  const digits = raw.replace(/[\s-]/g, "").replace(/^\+94/, "0");
  return digits.startsWith("0") ? digits : `0${digits}`;
}

const phoneSchema = z
  .string()
  .trim()
  .refine((v) => SL_PHONE_REGEX.test(v.replace(/[\s-]/g, "")), "Enter a Sri Lankan mobile number, like 077 123 4567.");
const nameSchema = z.string().trim().min(2, "Enter your name.").max(80, "Use 80 characters or fewer.");
const emailSchema = z.string().trim().toLowerCase().email("Enter a valid email address.").max(254);

function fieldErrors(error: z.ZodError) {
  const fields: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = String(issue.path[0] ?? "form");
    fields[key] ??= issue.message;
  }
  return fields;
}

async function requestContext() {
  const hdrs = await headers();
  return {
    ip: getClientIp({ headers: hdrs }),
    origin: hdrs.get("origin") || process.env.NEXT_PUBLIC_SITE_URL || "https://almera.lk",
  };
}

async function newPasswordProblem(password: string, context: PasswordContext) {
  return passwordProblem(password, context) ?? ((await isBreachedPassword(password)) ? BREACHED : null);
}

const signUpSchema = z.object({
  name: nameSchema,
  email: emailSchema,
  phone: phoneSchema,
  password: z.string().max(200),
  acceptedPolicy: z.literal(true, "Please accept the order policy to continue."),
});

export async function signUpAction(rawInput: z.input<typeof signUpSchema>): Promise<AuthResult<{ message: string }>> {
  const parsed = signUpSchema.safeParse(rawInput);
  if (!parsed.success) {
    return { ok: false, error: "Please check the highlighted details.", fields: fieldErrors(parsed.error) };
  }
  const { name, email, phone, password } = parsed.data;

  const passwordIssue = await newPasswordProblem(password, { email, name });
  if (passwordIssue) return { ok: false, error: passwordIssue, fields: { password: passwordIssue } };

  // The same reply for new and existing emails, so nobody can test who has an account.
  const message = "If this email can be used, we’ve sent it a link to activate your account. Check your inbox and spam folder.";

  const { ip, origin } = await requestContext();
  if (!(await allowAuthAttempt(ip, AUTH_SIGNUP_RATE_LIMIT))) return { ok: false, error: TOO_MANY };
  if (!(await allowAuthAttempt(email, AUTH_LIMITS.signupEmail))) return { ok: true, message };

  const profile = { full_name: name, name, phone: normalizePhone(phone) };
  const supabase = await createSupabaseServerClient();
  let error;
  if (isEmailConfigured()) {
    const generated = await getSupabaseAdmin().auth.admin.generateLink({
      type: "signup",
      email,
      password,
      options: { data: profile },
    });
    error = generated.error;
    const tokenHash = generated.data?.properties?.hashed_token;
    if (!error && tokenHash) {
      const siteUrl = getSiteUrl();
      const url = `${siteUrl}/auth/confirm?token_hash=${encodeURIComponent(tokenHash)}&type=signup`;
      // After the reply, so a new email doesn't answer more slowly than a registered one.
      after(() => sendEmail(email, signupConfirmationEmail({ name, url, siteUrl })));
    }
  } else {
    ({ error } = await supabase.auth.signUp({
      email,
      password,
      options: { emailRedirectTo: `${origin}/auth/callback?next=/account`, data: profile },
    }));
  }

  if (error && error.code !== "user_already_exists" && error.code !== "email_exists") {
    if (error.code === "weak_password") return { ok: false, error: BREACHED, fields: { password: BREACHED } };
    console.error("[auth] Sign-up failed:", error.code);
    return { ok: false, error: SOMETHING_WRONG };
  }
  return { ok: true, message };
}

const signInSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, "Enter your password.").max(200),
  next: z.string().optional().nullable(),
});

export async function signInAction(rawInput: z.input<typeof signInSchema>): Promise<AuthResult<{ redirectUrl: string }>> {
  const parsed = signInSchema.safeParse(rawInput);
  if (!parsed.success) {
    return { ok: false, error: "Please check your details.", fields: fieldErrors(parsed.error) };
  }

  const { ip } = await requestContext();
  const allowed = (await allowAuthAttempt(ip, AUTH_LIMITS.loginIp)) && (await allowAuthAttempt(parsed.data.email, AUTH_LIMITS.loginEmail));
  if (!allowed) {
    return { ok: false, error: "Too many sign-in attempts. Please wait 15 minutes, or reset your password." };
  }

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.signInWithPassword({
    email: parsed.data.email,
    password: parsed.data.password,
  });

  if (error || !data.user) {
    return { ok: false, error: "Incorrect email or password. If you’ve just signed up, confirm your email first." };
  }

  await linkGuestOrders(data.user);
  return { ok: true, redirectUrl: safeNextPath(parsed.data.next) };
}

export async function signInWithGoogleAction(nextUrl?: string | null): Promise<AuthResult> {
  const { origin } = await requestContext();
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: { redirectTo: `${origin}/auth/callback?next=${encodeURIComponent(safeNextPath(nextUrl))}` },
  });

  if (error || !data.url) return { ok: false, error: "Google sign-in isn’t available right now. Please try again." };
  redirect(data.url);
}

export async function signOutAction() {
  const supabase = await createSupabaseServerClient();
  await supabase.auth.signOut();
  await clearPasswordRecovery();
  redirect("/account/login");
}

export async function signOutEverywhereAction() {
  const supabase = await createSupabaseServerClient();
  await supabase.auth.signOut({ scope: "global" });
  await clearPasswordRecovery();
  redirect("/account/login");
}

export async function requestPasswordResetAction(rawEmail: string): Promise<AuthResult<{ message: string }>> {
  const parsed = emailSchema.safeParse(rawEmail);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };

  const message = "If there’s an account with this email, we’ve sent it a link to set a new password. It works for a short time, so use it soon.";

  const { ip, origin } = await requestContext();
  if (!(await allowAuthAttempt(ip, AUTH_LIMITS.resetIp))) return { ok: false, error: TOO_MANY };
  if (await allowAuthAttempt(parsed.data, AUTH_LIMITS.resetEmail)) {
    if (isEmailConfigured()) {
      // Unknown emails simply get no link, and the reply stays the same.
      const generated = await getSupabaseAdmin().auth.admin.generateLink({ type: "recovery", email: parsed.data });
      const tokenHash = generated.data?.properties?.hashed_token;
      if (tokenHash) {
        const siteUrl = getSiteUrl();
        const url = `${siteUrl}/auth/confirm?token_hash=${encodeURIComponent(tokenHash)}&type=recovery`;
        after(() => sendEmail(parsed.data, passwordResetEmail({ url, siteUrl })));
      }
    } else {
      const supabase = await createSupabaseServerClient();
      await supabase.auth.resetPasswordForEmail(parsed.data, {
        redirectTo: `${origin}/auth/callback?next=/account/reset-password`,
      });
    }
  }
  return { ok: true, message };
}

/** Sends the link to the signed-in customer's own email, for accounts that only use Google. */
export async function sendPasswordLinkAction(): Promise<AuthResult<{ message: string }>> {
  const user = await getCurrentUser();
  if (!user?.email) return { ok: false, error: "Please sign in again." };
  return requestPasswordResetAction(user.email);
}

/** Needs the recovery proof set when the emailed link is opened, not just a session. */
export async function resetPasswordAction(newPassword: string): Promise<AuthResult> {
  const user = await getCurrentUser();
  if (!user || !(await hasPasswordRecovery(user.id))) {
    return { ok: false, error: "This link has expired. Please request a new one." };
  }

  const problem = await newPasswordProblem(String(newPassword).slice(0, 200), {
    email: user.email,
    name: user.user_metadata?.full_name,
  });
  if (problem) return { ok: false, error: problem };

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.updateUser({ password: newPassword });
  if (error) {
    return { ok: false, error: error.code === "same_password" ? "Please choose a different password from your last one." : SOMETHING_WRONG };
  }

  await clearPasswordRecovery();
  await supabase.auth.signOut({ scope: "others" });
  return { ok: true };
}

/** Asks for the current password, so someone at an unlocked phone can't take over the account. */
export async function changePasswordAction(input: { current: string; next: string }): Promise<AuthResult> {
  const user = await getCurrentUser();
  if (!user?.email) return { ok: false, error: "Please sign in again." };

  if (!(await allowAuthAttempt(user.id, AUTH_LIMITS.passwordChange))) return { ok: false, error: TOO_MANY };

  const current = String(input.current).slice(0, 200);
  const next = String(input.next).slice(0, 200);

  const problem = await newPasswordProblem(next, { email: user.email, name: user.user_metadata?.full_name });
  if (problem) return { ok: false, error: problem, fields: { next: problem } };
  if (next === current) {
    const same = "Please choose a different password from your current one.";
    return { ok: false, error: same, fields: { next: same } };
  }

  // A separate client, so checking the password leaves this device's session alone.
  const checker = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { error: wrongPassword } = await checker.auth.signInWithPassword({ email: user.email, password: current });
  if (wrongPassword) {
    const wrong = "That isn’t your current password.";
    return { ok: false, error: wrong, fields: { current: wrong } };
  }
  await checker.auth.signOut({ scope: "local" });

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.updateUser({ password: next });
  if (error) {
    return {
      ok: false,
      error: error.code === "reauthentication_needed" ? "For your security, please sign out and back in, then try again." : SOMETHING_WRONG,
    };
  }

  // Anyone else signed in to this account is removed once the password changes.
  await supabase.auth.signOut({ scope: "others" });
  return { ok: true };
}

const profileSchema = z.object({
  fullName: nameSchema,
  phone: z.union([z.literal(""), phoneSchema]),
});

export async function updateCustomerProfileAction(input: z.input<typeof profileSchema>): Promise<AuthResult> {
  const parsed = profileSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "Please check the highlighted details.", fields: fieldErrors(parsed.error) };
  }
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "Please sign in again." };

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from("profiles")
    .update({
      full_name: parsed.data.fullName,
      phone: parsed.data.phone ? normalizePhone(parsed.data.phone) : null,
    })
    .eq("id", user.id);

  return error ? { ok: false, error: SOMETHING_WRONG } : { ok: true };
}

export type CustomerAddressRecord = {
  id: string;
  label: string;
  recipient_name: string;
  phone: string;
  address: string;
  city: string;
  district: string;
  postal_code: string | null;
  is_default: boolean;
};

const MAX_ADDRESSES = 10;

const addressSchema = z.object({
  id: z.string().uuid().optional(),
  label: z.string().trim().max(30, "Use 30 characters or fewer.").optional(),
  recipientName: nameSchema,
  phone: phoneSchema,
  address: z.string().trim().min(5, "Enter your house number and street.").max(200, "Use 200 characters or fewer."),
  city: z.string().trim().min(2, "Enter your city or town.").max(80, "Use 80 characters or fewer."),
  district: z.string().refine((d) => (DISTRICTS as readonly string[]).includes(d), "Choose your district."),
  postalCode: z.union([z.literal(""), z.string().trim().regex(/^\d{5}$/, "Postal codes have 5 digits.")]).optional(),
  isDefault: z.boolean().optional(),
});

async function listAddresses(supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>, userId: string) {
  const { data } = await supabase
    .from("customer_addresses")
    .select(ADDRESS_COLUMNS)
    .eq("user_id", userId)
    .order("is_default", { ascending: false })
    .order("created_at", { ascending: false });
  return (data ?? []) as CustomerAddressRecord[];
}

type AddressResult = AuthResult<{ addresses: CustomerAddressRecord[] }>;

export async function upsertCustomerAddressAction(input: z.input<typeof addressSchema>): Promise<AddressResult> {
  const parsed = addressSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "Please check the highlighted details.", fields: fieldErrors(parsed.error) };
  }
  const user = await requireUser().catch(() => null);
  if (!user) return { ok: false, error: "Please sign in again." };

  const { id, label, recipientName, phone, address, city, district, postalCode, isDefault } = parsed.data;
  const supabase = await createSupabaseServerClient();
  const existing = await listAddresses(supabase, user.id);

  if (!id && existing.length >= MAX_ADDRESSES) {
    return { ok: false, error: `You can save up to ${MAX_ADDRESSES} addresses. Remove one to add another.` };
  }

  const makeDefault = Boolean(isDefault) || existing.length === 0 || existing.every((a) => a.id === id);
  if (makeDefault) {
    await supabase.from("customer_addresses").update({ is_default: false }).eq("user_id", user.id);
  }

  const row = {
    label: label || "Home",
    recipient_name: recipientName,
    phone: normalizePhone(phone),
    address,
    city,
    district,
    postal_code: postalCode || null,
    is_default: makeDefault,
    updated_at: new Date().toISOString(),
  };

  const { error } = id
    ? await supabase.from("customer_addresses").update(row).eq("id", id).eq("user_id", user.id)
    : await supabase.from("customer_addresses").insert({ ...row, user_id: user.id });

  if (error) return { ok: false, error: SOMETHING_WRONG };
  return { ok: true, addresses: await listAddresses(supabase, user.id) };
}

export async function setDefaultAddressAction(addressId: string): Promise<AddressResult> {
  const id = z.string().uuid().safeParse(addressId);
  const user = await getCurrentUser();
  if (!id.success || !user) return { ok: false, error: SOMETHING_WRONG };

  const supabase = await createSupabaseServerClient();
  const existing = await listAddresses(supabase, user.id);
  if (!existing.some((a) => a.id === id.data)) return { ok: false, error: SOMETHING_WRONG };

  await supabase.from("customer_addresses").update({ is_default: false }).eq("user_id", user.id);
  const { error } = await supabase.from("customer_addresses").update({ is_default: true }).eq("id", id.data).eq("user_id", user.id);
  if (error) return { ok: false, error: SOMETHING_WRONG };
  return { ok: true, addresses: await listAddresses(supabase, user.id) };
}

export async function deleteCustomerAddressAction(addressId: string): Promise<AddressResult> {
  const id = z.string().uuid().safeParse(addressId);
  const user = await getCurrentUser();
  if (!id.success || !user) return { ok: false, error: SOMETHING_WRONG };

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.from("customer_addresses").delete().eq("id", id.data).eq("user_id", user.id);
  if (error) return { ok: false, error: SOMETHING_WRONG };

  // Checkout preselects the default, so another address takes over when it's removed.
  const addresses = await listAddresses(supabase, user.id);
  if (addresses.length > 0 && !addresses.some((a) => a.is_default)) {
    await supabase.from("customer_addresses").update({ is_default: true }).eq("id", addresses[0].id).eq("user_id", user.id);
    return { ok: true, addresses: await listAddresses(supabase, user.id) };
  }
  return { ok: true, addresses };
}

export async function getCheckoutCustomerDataAction() {
  const user = await getCurrentUser();
  if (!user) return null;

  const supabase = await createSupabaseServerClient();
  const [profileRes, addresses] = await Promise.all([
    supabase.from("profiles").select("*").eq("id", user.id).maybeSingle(),
    listAddresses(supabase, user.id),
  ]);

  return {
    user: { id: user.id, email: user.email ?? "" },
    profile: profileRes.data || {
      full_name: (user.user_metadata?.full_name || user.user_metadata?.name || "") as string,
      phone: (user.user_metadata?.phone || "") as string,
    },
    addresses,
  };
}
