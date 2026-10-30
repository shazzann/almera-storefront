import "server-only";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function getCurrentUser() {
  try {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();
    if (error || !user) return null;
    return user;
  } catch {
    return null;
  }
}

export async function requireUser() {
  const user = await getCurrentUser();
  if (!user) {
    throw new Error("Unauthorized. Please sign in to your account.");
  }
  return user;
}

