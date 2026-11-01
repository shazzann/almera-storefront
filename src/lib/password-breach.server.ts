import "server-only";
import { createHash } from "node:crypto";

/**
 * Checks Have I Been Pwned without revealing the password: only the first 5 characters of its
 * SHA-1 hash leave the server. If the service is down, sign-up carries on rather than blocking.
 */
export async function isBreachedPassword(password: string): Promise<boolean> {
  const hash = createHash("sha1").update(password).digest("hex").toUpperCase();
  const prefix = hash.slice(0, 5);
  const suffix = hash.slice(5);
  try {
    const res = await fetch(`https://api.pwnedpasswords.com/range/${prefix}`, {
      headers: { "Add-Padding": "true", "User-Agent": "almera-storefront" },
      cache: "no-store",
      signal: AbortSignal.timeout(2500),
    });
    if (!res.ok) return false;
    const list = await res.text();
    return list.split("\n").some((line) => {
      const [candidate, count] = line.trim().split(":");
      return candidate === suffix && Number(count) > 0;
    });
  } catch {
    return false;
  }
}
