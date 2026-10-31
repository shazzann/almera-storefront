"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { getCurrentUser, requireUser } from "@/lib/auth.server";
import {
  AUTH_LOGIN_RATE_LIMIT,
  AUTH_SIGNUP_RATE_LIMIT,
  enforceRateLimit,
  getClientIp,
} from "@/lib/rate-limit.server";
import { getSupabaseAdmin } from "@/lib/supabase/admin.server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const SL_PHONE_REGEX = /^(?:\+94|0)?7\d{8}$/;

function sanitizeNextUrl(raw?: string | null): string {
  if (!raw) return "/account";
  const trimmed = raw.trim();
  if (trimmed.startsWith("/") && !trimmed.startsWith("//") && !trimmed.startsWith("/\\")) {
    return trimmed;
  }
  return "/account";
}

function normalizePhone(raw: string): string {
  const digits = raw.replace(/[\s-]/g, "").replace(/^\+94/, "0");
  return digits.startsWith("0") ? digits : `0${digits}`;
}

const signUpSchema = z.object({
  name: z.string().trim().min(2, "Please enter your name."),
  email: z.string().trim().email("Please enter a valid email address.").toLowerCase(),
  phone: z
    .string()
    .trim()
    .refine((v) => SL_PHONE_REGEX.test(v.replace(/[\s-]/g, "")), {
      message: "Please enter a valid Sri Lankan mobile number (e.g. 077 123 4567).",
    }),
  password: z.string().min(8, "Password must be at least 8 characters long."),
});

export async function signUpAction(rawInput: z.input<typeof signUpSchema>) {
  const hdrs = await headers();
  const ip = getClientIp({ headers: hdrs });
  enforceRateLimit(ip, AUTH_SIGNUP_RATE_LIMIT);

  const parsed = signUpSchema.parse(rawInput);
  const cleanPhone = normalizePhone(parsed.phone);

  const supabase = await createSupabaseServerClient();
  const origin = hdrs.get("origin") || process.env.NEXT_PUBLIC_SITE_URL || "https://almera.lk";

  const { data, error } = await supabase.auth.signUp({
    email: parsed.email,
    password: parsed.password,
    options: {
      emailRedirectTo: `${origin}/auth/callback?next=/account`,
      data: {
        full_name: parsed.name,
        name: parsed.name,
        phone: cleanPhone,
      },
    },
  });

  if (error) {
    if (error.message?.toLowerCase().includes("already registered")) {
      return {
        success: true,
        needsEmailConfirmation: true,
        message:
          "If an account exists with this email, a confirmation link has been sent. Please check your inbox.",
      };
    }
    throw new Error(error.message);
  }

  // If Supabase has email confirmation disabled, user session is immediate
  if (data.session) {
    return {
      success: true,
      needsEmailConfirmation: false,
      message: "Account created successfully!",
    };
  }

  return {
    success: true,
    needsEmailConfirmation: true,
    message: "We’ve sent a confirmation link to your email. Please check your inbox to activate your account.",
  };
}

const signInSchema = z.object({
  email: z.string().trim().email("Please enter a valid email address.").toLowerCase(),
  password: z.string().min(1, "Please enter your password."),
  next: z.string().optional().nullable(),
});

export async function signInAction(rawInput: z.input<typeof signInSchema>) {
  const hdrs = await headers();
  const ip = getClientIp({ headers: hdrs });
  enforceRateLimit(ip, AUTH_LOGIN_RATE_LIMIT);

  const parsed = signInSchema.parse(rawInput);
  const supabase = await createSupabaseServerClient();

  const { data, error } = await supabase.auth.signInWithPassword({
    email: parsed.email,
    password: parsed.password,
  });

  if (error || !data.user) {
    throw new Error("Invalid email or password. Please try again.");
  }

  // Link guest orders if not linked yet
  if (data.user.email) {
    try {
      const admin = getSupabaseAdmin();
      await admin.rpc("link_guest_orders_to_user", {
        p_user_id: data.user.id,
        p_email: data.user.email,
      });
    } catch {
      // non-blocking
    }
  }

  return {
    success: true,
    redirectUrl: sanitizeNextUrl(parsed.next),
  };
}

export async function signInWithGoogleAction(nextUrl?: string | null) {
  const hdrs = await headers();
  const origin = hdrs.get("origin") || process.env.NEXT_PUBLIC_SITE_URL || "https://almera.lk";
  const supabase = await createSupabaseServerClient();
  const sanitizedNext = sanitizeNextUrl(nextUrl);

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: `${origin}/auth/callback?next=${encodeURIComponent(sanitizedNext)}`,
    },
  });

  if (error || !data.url) {
    throw new Error(error?.message || "Could not initialize Google sign in.");
  }

  redirect(data.url);
}

export async function signOutAction() {
  const supabase = await createSupabaseServerClient();
  await supabase.auth.signOut();
  redirect("/account/login");
}

export async function requestPasswordResetAction(rawEmail: string) {
  const hdrs = await headers();
  const ip = getClientIp({ headers: hdrs });
  enforceRateLimit(ip, {
    namespace: "password-reset",
    maxRequests: 3,
    windowMs: 15 * 60 * 1000,
  });

  const email = z.string().trim().email().toLowerCase().parse(rawEmail);
  const origin = hdrs.get("origin") || process.env.NEXT_PUBLIC_SITE_URL || "https://almera.lk";
  const supabase = await createSupabaseServerClient();

  await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${origin}/auth/callback?next=/account/reset-password`,
  });

  return {
    success: true,
    message: "If an account exists with this email, a password reset link has been sent. Please check your inbox.",
  };
}

export async function resetPasswordAction(newPassword: string) {
  const user = await requireUser();
  const validPassword = z.string().min(8, "Password must be at least 8 characters long.").parse(newPassword);

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.updateUser({
    password: validPassword,
  });

  if (error) {
    throw new Error(error.message);
  }

  return {
    success: true,
    message: "Your password has been updated successfully.",
  };
}

export async function getCustomerProfileAction() {
  const user = await requireUser();
  const supabase = await createSupabaseServerClient();

  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();

  if (error || !data) {
    return {
      id: user.id,
      email: user.email ?? "",
      full_name: (user.user_metadata?.full_name || user.user_metadata?.name || "") as string,
      phone: (user.user_metadata?.phone || "") as string,
      default_shipping_address: "",
      default_shipping_city: "",
      default_shipping_district: "",
    };
  }

  return {
    id: data.id,
    email: data.email || user.email || "",
    full_name: data.full_name || "",
    phone: data.phone || "",
    default_shipping_address: data.default_shipping_address || "",
    default_shipping_city: data.default_shipping_city || "",
    default_shipping_district: data.default_shipping_district || "",
  };
}

export async function updateCustomerProfileAction(input: {
  fullName: string;
  phone: string;
  defaultAddress?: string;
  defaultCity?: string;
  defaultDistrict?: string;
}) {
  const user = await requireUser();
  const cleanPhone = input.phone.trim() ? normalizePhone(input.phone) : "";

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from("profiles")
    .update({
      full_name: input.fullName.trim(),
      phone: cleanPhone || null,
      default_shipping_address: input.defaultAddress?.trim() || null,
      default_shipping_city: input.defaultCity?.trim() || null,
      default_shipping_district: input.defaultDistrict?.trim() || null,
    })
    .eq("id", user.id);

  if (error) {
    throw new Error(error.message);
  }

  return { success: true };
}

export async function getCustomerAddressesAction() {
  const user = await requireUser();
  const supabase = await createSupabaseServerClient();

  const { data, error } = await supabase
    .from("customer_addresses")
    .select("*")
    .eq("user_id", user.id)
    .order("is_default", { ascending: false })
    .order("created_at", { ascending: false });

  if (error || !data) return [];
  return data;
}

export async function upsertCustomerAddressAction(input: {
  id?: string;
  label?: string;
  recipientName: string;
  phone: string;
  address: string;
  city: string;
  district: string;
  postalCode?: string;
  isDefault?: boolean;
}) {
  const user = await requireUser();
  const supabase = await createSupabaseServerClient();
  const cleanPhone = normalizePhone(input.phone);

  if (input.isDefault) {
    // Clear default flag on existing addresses
    await supabase
      .from("customer_addresses")
      .update({ is_default: false })
      .eq("user_id", user.id);
  }

  const row = {
    user_id: user.id,
    label: input.label?.trim() || "Home",
    recipient_name: input.recipientName.trim(),
    phone: cleanPhone,
    address: input.address.trim(),
    city: input.city.trim(),
    district: input.district.trim(),
    postal_code: input.postalCode?.trim() || null,
    is_default: Boolean(input.isDefault),
    updated_at: new Date().toISOString(),
    ...(input.id ? { id: input.id } : {}),
  };

  const { data, error } = await supabase
    .from("customer_addresses")
    .upsert(row)
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data;
}

export async function deleteCustomerAddressAction(addressId: string) {
  const user = await requireUser();
  const supabase = await createSupabaseServerClient();

  const { error } = await supabase
    .from("customer_addresses")
    .delete()
    .eq("id", addressId)
    .eq("user_id", user.id);

  if (error) throw new Error(error.message);
  return { success: true };
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

export async function getCheckoutCustomerDataAction() {
  const user = await getCurrentUser();
  if (!user) return null;

  const supabase = await createSupabaseServerClient();
  const [profileRes, addressesRes] = await Promise.all([
    supabase.from("profiles").select("*").eq("id", user.id).maybeSingle(),
    supabase
      .from("customer_addresses")
      .select("*")
      .eq("user_id", user.id)
      .order("is_default", { ascending: false })
      .order("created_at", { ascending: false }),
  ]);

  return {
    user: { id: user.id, email: user.email ?? "" },
    profile: profileRes.data || {
      full_name: (user.user_metadata?.full_name || user.user_metadata?.name || "") as string,
      phone: (user.user_metadata?.phone || "") as string,
    },
    addresses: (addressesRes.data || []) as CustomerAddressRecord[],
  };
}

