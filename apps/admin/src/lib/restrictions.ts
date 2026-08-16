import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import type { AdminRole } from "@/lib/roles";
import type { RestrictionKind } from "@/lib/users-contract";

/**
 * The single writer of `public.admin_restrictions`.
 *
 * Extracted from `lib/users.ts` when the trust review queue gained a permanent
 * ban: two adapters writing the same moderation table with their own copies of
 * the insert shape is how the `kind` vocabulary and the expiry semantics drift
 * apart. Anything that restricts an account or a pet goes through here.
 *
 * The table is ours (`public`), granted SELECT + INSERT + UPDATE to
 * service_role and nothing else — no DELETE, because restrictions are lifted
 * (`lifted_at` / `lifted_by`), never removed.
 */

export const RESTRICTIONS_TABLE = { schema: "public", table: "admin_restrictions" } as const;

export type RestrictionActor = { userId: string; email: string; role: AdminRole };

export type RestrictionWriteResult =
  | { ok: true }
  /**
   * `duplicate` means an ACTIVE restriction of this kind already exists — the
   * partial unique index `(target_type, target_id, kind) where lifted_at is
   * null` rejected it. Callers decide whether that is an error: re-banning an
   * already-banned pet is benign, whereas a caller that just lifted the
   * previous row would want to know.
   */
  | { ok: false; reason: "duplicate" | "failed"; message: string };

/** Postgres unique_violation. */
const UNIQUE_VIOLATION = "23505";

export async function insertRestriction(
  targetType: "account" | "pet",
  targetId: string,
  kind: RestrictionKind,
  reason: string,
  actor: RestrictionActor,
  expiresAt: string | null,
): Promise<RestrictionWriteResult> {
  const { error } = await createAdminClient()
    .schema(RESTRICTIONS_TABLE.schema)
    .from(RESTRICTIONS_TABLE.table)
    .insert({
      target_type: targetType,
      target_id: targetId,
      kind,
      reason,
      created_by: actor.userId,
      expires_at: expiresAt,
    });

  if (!error) return { ok: true };

  const code = (error as { code?: string }).code;
  if (code === UNIQUE_VIOLATION) {
    return { ok: false, reason: "duplicate", message: error.message };
  }
  return { ok: false, reason: "failed", message: error.message };
}

/**
 * Lifts every ACTIVE restriction of the given kinds, returning how many rows
 * were affected.
 *
 * Lifting, not deleting: `lifted_at` / `lifted_by` keep the moderation history
 * intact, and the table has no DELETE grant precisely so that cannot be
 * short-circuited. Rows already lifted are skipped, so this is idempotent.
 *
 * Throws on failure — every caller runs inside an adapter whose catch turns it
 * into `action_failed`.
 */
export async function liftRestrictions(
  targetType: "account" | "pet",
  targetId: string,
  kinds: RestrictionKind[],
  actor: RestrictionActor,
): Promise<number> {
  const { data, error } = await createAdminClient()
    .schema(RESTRICTIONS_TABLE.schema)
    .from(RESTRICTIONS_TABLE.table)
    .update({ lifted_at: new Date().toISOString(), lifted_by: actor.userId })
    .eq("target_type", targetType)
    .eq("target_id", targetId)
    .in("kind", kinds)
    .is("lifted_at", null)
    .select("id");
  if (error) throw new Error(`admin_restrictions: ${error.message}`);
  return (data ?? []).length;
}
