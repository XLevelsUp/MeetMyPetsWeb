import { createClient } from "@supabase/supabase-js";

/**
 * Service-key helpers for e2e fixtures.
 *
 * Moderation tests never touch a real account: they create a throwaway auth
 * user + identity.accounts row, act on it, assert the audit trail, and delete
 * it again. Anything created here is prefixed so a leaked row is obvious.
 */

export const E2E_EMAIL_PREFIX = "e2e-moderation-target";

export function serviceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SECRET_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
}

export type SeededTarget = { accountId: string; authUserId: string; email: string };

export async function createTargetUser(): Promise<SeededTarget> {
  const supabase = serviceClient();
  const email = `${E2E_EMAIL_PREFIX}-${Date.now()}@meetmypets.dev`;

  const { data, error } = await supabase.auth.admin.createUser({
    email,
    password: `E2e!${Math.random().toString(36).slice(2)}Aa1`,
    email_confirm: true,
  });
  if (error || !data.user) throw new Error(`Could not create e2e auth user: ${error?.message}`);

  // The backend's signup trigger may already have inserted the account row;
  // fall back to creating one so the panel has something to moderate.
  const existing = await supabase
    .schema("identity")
    .from("accounts")
    .select("id")
    .eq("auth_user_id", data.user.id)
    .maybeSingle();

  if (existing.data?.id) {
    return { accountId: existing.data.id, authUserId: data.user.id, email };
  }

  const inserted = await supabase
    .schema("identity")
    .from("accounts")
    .insert({ auth_user_id: data.user.id, email, display_name: "E2E Moderation Target" })
    .select("id")
    .single();
  if (inserted.error) throw new Error(`Could not create e2e account: ${inserted.error.message}`);

  return { accountId: inserted.data.id, authUserId: data.user.id, email };
}

export async function deleteTargetUser(target: SeededTarget): Promise<void> {
  const supabase = serviceClient();
  // Restrictions/audit rows are intentionally not deletable by service_role
  // (append-only grants), so they are left behind and are harmless: they point
  // at an id that no longer resolves.
  await supabase.schema("identity").from("accounts").delete().eq("id", target.accountId);
  await supabase.auth.admin.deleteUser(target.authUserId);
}

export async function auditRowsFor(targetId: string) {
  const { data, error } = await serviceClient()
    .from("admin_audit_logs")
    .select("action,reason,actor_email,target_id")
    .eq("target_id", targetId)
    .order("created_at", { ascending: false });
  if (error) throw new Error(`Could not read audit rows: ${error.message}`);
  return data ?? [];
}
