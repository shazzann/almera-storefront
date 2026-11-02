import "server-only";
import { createHash } from "node:crypto";
import { getSupabaseAdmin } from "@/lib/supabase/admin.server";

export type RateLimitConfig = {
  namespace: string;
  maxRequests: number;
  windowMs: number;
};

export const ORDER_RATE_LIMIT: RateLimitConfig = {
  namespace: "place-order",
  maxRequests: 5,
  windowMs: 15 * 60 * 1000, // 5 orders per 15 minutes per IP
};

export const COUPON_RATE_LIMIT: RateLimitConfig = {
  namespace: "validate-coupon",
  maxRequests: 15,
  windowMs: 5 * 60 * 1000, // 15 checks per 5 minutes per IP
};

export const AUTH_LOGIN_RATE_LIMIT: RateLimitConfig = {
  namespace: "auth-login",
  maxRequests: 10,
  windowMs: 15 * 60 * 1000, // 10 login attempts per 15 minutes per IP
};

export const AUTH_SIGNUP_RATE_LIMIT: RateLimitConfig = {
  namespace: "auth-signup",
  maxRequests: 5,
  windowMs: 30 * 60 * 1000, // 5 signups per 30 minutes per IP
};

const MINUTE = 60 * 1000;

export const AUTH_LIMITS = {
  // Generous per IP, because many Sri Lankan mobile customers share one carrier address.
  loginIp: { namespace: "login-ip", maxRequests: 30, windowMs: 15 * MINUTE },
  loginEmail: { namespace: "login-email", maxRequests: 8, windowMs: 15 * MINUTE },
  signupEmail: { namespace: "signup-email", maxRequests: 3, windowMs: 60 * MINUTE },
  resetIp: { namespace: "reset-ip", maxRequests: 5, windowMs: 60 * MINUTE },
  resetEmail: { namespace: "reset-email", maxRequests: 3, windowMs: 60 * MINUTE },
  passwordChange: { namespace: "password-change", maxRequests: 5, windowMs: 15 * MINUTE },
} satisfies Record<string, RateLimitConfig>;

const MAX_BUCKETS = 5000;
const buckets = new Map<string, number[]>();

export function getClientIp({ headers }: { headers: Headers }): string {
  return (
    headers.get("cf-connecting-ip")?.trim() ||
    headers.get("x-real-ip")?.trim() ||
    headers.get("x-vercel-ip")?.trim() ||
    headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    "unknown"
  );
}

export function enforceRateLimit(ip: string, config: RateLimitConfig): void {
  if (!allowRequest(ip, config)) {
    throw new Error("Too many requests. Please wait a few minutes and try again.");
  }
}

function allowRequest(ip: string, config: RateLimitConfig): boolean {
  const now = Date.now();
  const key = `${config.namespace}:${ip}`;
  const cutoff = now - config.windowMs;
  const recent = (buckets.get(key) ?? []).filter((ts) => ts > cutoff);

  if (recent.length >= config.maxRequests) return false;

  // Prune expired buckets and bound map size to prevent memory exhaustion
  if (buckets.size >= MAX_BUCKETS && !buckets.has(key)) {
    for (const [k, timestamps] of buckets) {
      if (timestamps.every((ts) => ts <= cutoff)) {
        buckets.delete(k);
      }
    }
    if (buckets.size >= MAX_BUCKETS) {
      const oldestKey = buckets.keys().next().value;
      if (oldestKey !== undefined) {
        buckets.delete(oldestKey);
      }
    }
  }

  recent.push(now);
  buckets.set(key, recent);
  return true;
}

/**
 * Counts an attempt against this identifier. The database count holds across every server
 * instance, and the in-memory count still protects sign-in if the database can't be reached.
 */
export async function allowAuthAttempt(identifier: string, config: RateLimitConfig): Promise<boolean> {
  const hashed = createHash("sha256").update(`${config.namespace}:${identifier.toLowerCase()}`).digest("hex");
  if (!allowRequest(hashed, config)) return false;
  try {
    const { data, error } = await getSupabaseAdmin().rpc("consume_auth_rate_limit", {
      p_key: hashed,
      p_max: config.maxRequests,
      p_window_seconds: Math.round(config.windowMs / 1000),
    });
    return error ? true : data !== false;
  } catch {
    return true;
  }
}
