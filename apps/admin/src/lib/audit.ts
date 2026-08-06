import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import { isSupabaseConfigured } from "@/lib/supabase/reference";
import type { AdminRole } from "@/lib/roles";
import type { AuditAction } from "@/lib/audit-actions";
import type { AuditEntry, AuditQuery, AuditResponse } from "@/lib/audit-contract";

/**
 * Audit trail adapter — public.admin_audit_logs.
 *
 * The table is INSERT+SELECT only for service_role (see
 * supabase/migrations/20260806000003), so "append-only" is a grant, not a
 * convention: this module has no update or delete path by construction.
 *
 * House adapter pattern: discriminated unions, never throws.
 */

export type { AuditAction };

export type AuditEntryInput = {
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

export type AuditReadResult<T> =
  | { ok: true; data: T }
  | { ok: false; reason: "unconfigured" | "query_failed"; message: string };

const AUDIT_TABLE = "admin_audit_logs";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * PostgREST's `or=(...)` mini-language treats commas and parens as structure,
 * so strip them from a search term rather than trying to escape them.
 */
function sanitizeSearch(term: string): string {
  return term.replace(/[,()"\\*]/g, "").trim();
}

export async function writeAuditLog(entry: AuditEntryInput): Promise<AuditResult> {
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

type AuditRow = {
  id: string;
  created_at: string;
  actor_id: string;
  actor_email: string;
  actor_role: string;
  action: string;
  target_type: string;
  target_id: string;
  reason: string;
  metadata: Record<string, unknown> | null;
};

export async function listAuditLogs(query: AuditQuery): Promise<AuditReadResult<AuditResponse>> {
  if (!isSupabaseConfigured()) {
    return { ok: false, reason: "unconfigured", message: "Supabase env vars are not set." };
  }

  try {
    const { page, pageSize, q, action, targetType, from, to } = query;
    const offset = (page - 1) * pageSize;

    let request = createAdminClient()
      .from(AUDIT_TABLE)
      .select(
        "id,created_at,actor_id,actor_email,actor_role,action,target_type,target_id,reason,metadata",
        { count: "exact" },
      );

    if (action !== "all") request = request.eq("action", action);
    if (targetType !== "all") request = request.eq("target_type", targetType);

    // Dates arrive as YYYY-MM-DD and are inclusive on both ends, so `to` is
    // pushed to the end of that day rather than midnight.
    if (from) request = request.gte("created_at", `${from}T00:00:00.000Z`);
    if (to) request = request.lte("created_at", `${to}T23:59:59.999Z`);

    if (q) {
      const term = sanitizeSearch(q);
      if (term) {
        request = UUID_RE.test(term)
          ? request.or(`target_id.eq.${term},actor_id.eq.${term}`)
          : request.or(`actor_email.ilike.*${term}*,reason.ilike.*${term}*`);
      }
    }

    const { data, count, error } = await request
      .order("created_at", { ascending: false })
      .range(offset, offset + pageSize - 1);
    if (error) throw new Error(`${AUDIT_TABLE}: ${error.message}`);

    const items: AuditEntry[] = ((data ?? []) as AuditRow[]).map((row) => ({
      id: row.id,
      createdAt: row.created_at,
      actorId: row.actor_id,
      actorEmail: row.actor_email,
      actorRole: row.actor_role,
      action: row.action,
      targetType: row.target_type,
      targetId: row.target_id,
      reason: row.reason,
      metadata: row.metadata ?? {},
    }));

    return { ok: true, data: { items, page, pageSize, total: count ?? 0 } };
  } catch (error) {
    return {
      ok: false,
      reason: "query_failed",
      message: error instanceof Error ? error.message : "Unknown query failure.",
    };
  }
}
