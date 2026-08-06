import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import type { AdminRole } from "@/lib/roles";

/**
 * Audit trail writer — public.admin_audit_logs.
 *
 * The table is INSERT+SELECT only for service_role (see
 * supabase/migrations/20260806000003), so "append-only" is a grant, not a
 * convention: this module has no update or delete path by construction.
 *
 * House adapter pattern: discriminated union, never throws.
 */

export type AuditAction =
  | "account.suspend"
  | "account.ban"
  | "account.restore"
  | "pet.flag"
  | "pet.unflag";

export type AuditEntry = {
  actorId: string;
  actorEmail: string;
  actorRole: AdminRole;
  action: AuditAction;
  targetType: "account" | "pet";
  targetId: string;
  reason: string;
  /** Action-specific context: durations, before/after state, etc. */
  metadata?: Record<string, unknown>;
};

export type AuditResult = { ok: true } | { ok: false; message: string };

const AUDIT_TABLE = "admin_audit_logs";

export async function writeAuditLog(entry: AuditEntry): Promise<AuditResult> {
  try {
    const supabase = createAdminClient();
    const { error } = await supabase.from(AUDIT_TABLE).insert({
      actor_id: entry.actorId,
      actor_email: entry.actorEmail,
      actor_role: entry.actorRole,
      action: entry.action,
      target_type: entry.targetType,
      target_id: entry.targetId,
      reason: entry.reason,
      metadata: entry.metadata ?? {},
    });
    if (error) return { ok: false, message: error.message };
    return { ok: true };
  } catch (error) {
    return { ok: false, message: error instanceof Error ? error.message : "Unknown audit failure." };
  }
}
