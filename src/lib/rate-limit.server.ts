import "server-only";

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

const MAX_BUCKETS = 5000;
const buckets = new Map<string, number[]>();

export function getClientIp({ headers }: { headers: Headers }): string {
  const forwarded = headers.get("x-forwarded-for");
  if (forwarded) {
    return forwarded.split(",")[0]?.trim() || "unknown";
  }
  return headers.get("x-real-ip")?.trim() || "unknown";
}

export function enforceRateLimit(ip: string, config: RateLimitConfig): void {
  const now = Date.now();
  const key = `${config.namespace}:${ip}`;
  const cutoff = now - config.windowMs;
  const recent = (buckets.get(key) ?? []).filter((ts) => ts > cutoff);

  if (recent.length >= config.maxRequests) {
    throw new Error("Too many requests. Please wait a few minutes and try again.");
  }

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
}

