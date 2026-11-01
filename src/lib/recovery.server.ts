import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";

const COOKIE = "almera-recovery";
const LIFETIME_SECONDS = 15 * 60;

const secret = () => process.env.AUTH_COOKIE_SECRET || process.env.CRON_SECRET || "";
const sign = (value: string) => createHmac("sha256", secret()).update(`almera-recovery:${value}`).digest("hex");

/**
 * Proof that someone just opened an emailed link. Without it, a stolen session alone
 * could set a new password and lock the customer out of their account.
 */
export async function markPasswordRecovery(userId: string) {
  if (!secret()) return;
  const value = `${userId}.${Math.floor(Date.now() / 1000) + LIFETIME_SECONDS}`;
  (await cookies()).set(COOKIE, `${value}.${sign(value)}`, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/account",
    maxAge: LIFETIME_SECONDS,
  });
}

export async function hasPasswordRecovery(userId: string) {
  if (!secret()) return false;
  const [id, expires, signature] = (await cookies()).get(COOKIE)?.value.split(".") ?? [];
  if (!id || !expires || !signature || id !== userId || Number(expires) < Date.now() / 1000) return false;
  const expected = Buffer.from(sign(`${id}.${expires}`));
  const given = Buffer.from(signature);
  return expected.length === given.length && timingSafeEqual(expected, given);
}

export async function clearPasswordRecovery() {
  (await cookies()).delete({ name: COOKIE, path: "/account" });
}
