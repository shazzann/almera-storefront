import "server-only";
import { getSupabaseAdmin, isSupabaseAdminConfigured } from "@/lib/supabase/admin.server";

export const SOLE_ADMIN_EMAIL = "almeralk26@gmail.com";

export async function assertAdmin(accessToken?: string | null): Promise<{
  userId: string;
  email: string;
  mode: "supabase";
}> {
  if (!isSupabaseAdminConfigured()) {
    throw new Error("Server configuration error: Supabase admin credentials are not configured.");
  }

  if (!accessToken) {
    throw new Error("Unauthorized: Sign in with the Almera admin account.");
  }

  const supabase = getSupabaseAdmin(accessToken);
  const { data: userRes, error: userErr } = await supabase.auth.getUser(accessToken);
  if (userErr || !userRes.user) {
    throw new Error("Unauthorized: Invalid or expired session.");
  }

  const userEmail = (userRes.user.email ?? "").trim().toLowerCase();
  if (userEmail !== SOLE_ADMIN_EMAIL) {
    throw new Error(`Forbidden: Only ${SOLE_ADMIN_EMAIL} is authorized as admin.`);
  }

  // Verify role in public.user_roles (fail closed on error or missing row)
  const { data: roleRow, error: roleErr } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", userRes.user.id)
    .eq("role", "admin")
    .maybeSingle();

  if (roleErr || !roleRow) {
    throw new Error("Forbidden: Admin role required in user_roles.");
  }

  // Enforce AAL2 (TOTP Multi-Factor Authentication) when ENFORCE_ADMIN_MFA="true"
  if (process.env.ENFORCE_ADMIN_MFA === "true") {
    const { data: claims } = await supabase.auth.getClaims(accessToken);
    if (claims?.claims?.aal !== "aal2") {
      throw new Error("Admin access requires multi-factor authentication (AAL2).");
    }
  }

  return {
    userId: userRes.user.id,
    email: userEmail,
    mode: "supabase",
  };
}

export async function logAuditEvent(params: {
  userId: string | null;
  action: string;
  entityType: string;
  entityId?: string | null;
  details?: Record<string, unknown>;
  accessToken?: string | null;
}): Promise<void> {
  if (!isSupabaseAdminConfigured()) return;
  try {
    const supabase = getSupabaseAdmin(params.accessToken);
    await supabase.from("audit_log").insert({
      user_id: params.userId,
      action: params.action,
      entity_type: params.entityType,
      entity_id: params.entityId ?? null,
      details: params.details ?? {},
    });
  } catch (err) {
    console.error("[audit_log] Failed to record audit event:", err);
  }
}
