const FALLBACK = "/account";

/** Only ever returns a path on this site, so a crafted link can't send someone elsewhere after sign-in. */
export function safeNextPath(raw?: string | null): string {
  if (!raw) return FALLBACK;
  // Browsers strip tabs and newlines and treat \ as /, which can turn a path into another website.
  if (/[\\\u0000-\u001f]/.test(raw)) return FALLBACK;
  const value = raw.trim();
  if (!value.startsWith("/") || value.startsWith("//")) return FALLBACK;
  try {
    const base = "https://almera.invalid";
    const url = new URL(value, base);
    return url.origin === base ? `${url.pathname}${url.search}${url.hash}` : FALLBACK;
  } catch {
    return FALLBACK;
  }
}
