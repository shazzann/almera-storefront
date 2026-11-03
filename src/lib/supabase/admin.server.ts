import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

function createSupabaseFetch(apiKey: string, bearerToken?: string): typeof fetch {
  return (input, init) => {
    const headers = new Headers(
      typeof Request !== "undefined" && input instanceof Request ? input.headers : undefined,
    );
    if (init?.headers) {
      new Headers(init.headers).forEach((v, k) => headers.set(k, v));
    }
    headers.set("Authorization", `Bearer ${bearerToken || apiKey}`);
    headers.set("apikey", apiKey);
    return fetch(input, { ...init, headers, cache: "no-store" });
  };
}

let _admin: SupabaseClient | undefined;

export function isSupabaseConfigured(): boolean {
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  return Boolean(
    url &&
      key &&
      !url.includes("your-project-id") &&
      !key.endsWith("..."),
  );
}

export function isSupabaseAdminConfigured(): boolean {
  return isSupabaseConfigured();
}

export function getSupabaseAdmin(accessToken?: string | null): SupabaseClient {
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  const key = serviceKey || publishableKey;

  if (!url || !key) {
    throw new Error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  }

  // If SUPABASE_SERVICE_ROLE_KEY is set to a publishable key and an admin user's JWT is provided,
  // authenticate requests with the admin user's JWT so RLS admin policies apply.
  const isPublishableKey = key.startsWith("sb_publishable_");
  if (accessToken && isPublishableKey) {
    return createClient(url, key, {
      global: { fetch: createSupabaseFetch(key, accessToken) },
      auth: { storage: undefined, persistSession: false, autoRefreshToken: false },
    });
  }

  if (_admin) return _admin;
  _admin = createClient(url, key, {
    global: { fetch: createSupabaseFetch(key) },
    auth: { storage: undefined, persistSession: false, autoRefreshToken: false },
  });
  return _admin;
}
