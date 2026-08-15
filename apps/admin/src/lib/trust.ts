import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import { isSupabaseConfigured } from "@/lib/supabase/reference";
import { writeAuditLog } from "@/lib/audit";
import { insertRestriction, liftRestrictions } from "@/lib/restrictions";
import type { AdminRole } from "@/lib/roles";
import {
  TRUST_PERMANENT_BAN_SCORE,
  TRUST_RESTORE_SCORE,
  TRUST_REVIEW_SCORE_CEILING,
  trustStatusFor,
} from "@/lib/trust-constants";
import type {
  TrustEvent,
  TrustLedgerResponse,
  TrustQueueEntry,
  TrustQuery,
  TrustQueueResponse,
} from "@/lib/trust-contract";

/**
 * Trust review queue — the human half of the app team's automated moderation.
 *
 * WHY THIS EXISTS. Their trust engine bans pets without a moderator: reports,
 * blocks and post-reports subtract points, and crossing a threshold shows the
 * owner a ban screen reading *"Our moderation team will manually review this
 * pet. Please visit again after 7 days to view the review result."*
 *
 * That review had nowhere to happen. `temporary_ban_until` is **informational**
 * — their own column comment says `get_pet_trust_status` does not consult it —
 * so a temporary ban is lifted by an admin restoring the score and by nothing
 * else. Without this screen, "temporary" means permanent.
 *
 * ⚠️ READ `get_pet_trust_status`, NEVER `my_pet_trust_status`. The latter is the
 * app's view of its own pet and deliberately reports `normal` for a warning the
 * owner has already acknowledged. A queue built on it would silently drop every
 * acknowledged warning — which is most of them. We derive the status from the
 * score instead (see lib/trust-constants.ts) to avoid an RPC per row.
 *
 * ⚠️ RESTORE IS EXACTLY 555 AND NOTHING ELSE. Their BEFORE UPDATE trigger
 * branches on `NEW.trust_score = 555` and, in that branch, clears
 * `trust_warning_acknowledged`, `temporary_banned_at` and
 * `temporary_ban_until`. We hold a column-scoped grant on `trust_score` alone,
 * so those three are unwritable here by construction — which is the point:
 * their footer warns that a manual reset forgetting one column "leaves a pet
 * banned with no ban date".
 *
 * House adapter pattern: discriminated unions, never throws.
 */

export type TrustResult<T> =
  | { ok: true; data: T }
  | { ok: false; reason: "unconfigured" | "not_found" | "query_failed"; message: string };

export type TrustActionResult =
  | { ok: true }
  | {
      ok: false;
      reason: "unconfigured" | "not_found" | "conflict" | "action_failed" | "unaudited";
      message: string;
    };

const TABLES = {
  pets: { schema: "pets", table: "pets" },
  events: { schema: "pets", table: "trust_score_events" },
  accounts: { schema: "identity", table: "accounts" },
  reports: { schema: "matching", table: "pet_reports" },
} as const;

type TableRef = { schema: string; table: string };

type Actor = { userId: string; email: string; role: AdminRole };

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function client() {
  return createAdminClient();
}

function from(ref: TableRef) {
  return client().schema(ref.schema).from(ref.table);
}

const PET_COLUMNS =
  "id,name,status,owner_account_id,trust_score,trust_warning_acknowledged,temporary_banned_at,temporary_ban_until";

type PetRow = {
  id: string;
  name: string | null;
  status: string | null;
  owner_account_id: string | null;
  trust_score: number | null;
  trust_warning_acknowledged: boolean | null;
  temporary_banned_at: string | null;
  temporary_ban_until: string | null;
};

async function ownerEmails(ids: string[]): Promise<Map<string, string | null>> {
  const map = new Map<string, string | null>();
  if (ids.length === 0) return map;

  const { data, error } = await from(TABLES.accounts).select("id,email").in("id", ids);
  if (error) throw new Error(`identity.accounts: ${error.message}`);

  for (const row of (data ?? []) as { id: string; email: string | null }[]) {
    map.set(row.id, row.email);
  }
  return map;
}

/** pet id → reports filed against it, across all statuses. */
async function reportCounts(petIds: string[]): Promise<Map<string, number>> {
  const counts = new Map<string, number>();
  if (petIds.length === 0) return counts;

  const { data, error } = await from(TABLES.reports)
    .select("reported_pet_id")
    .in("reported_pet_id", petIds);
  if (error) throw new Error(`matching.pet_reports: ${error.message}`);

  for (const row of (data ?? []) as { reported_pet_id: string }[]) {
    counts.set(row.reported_pet_id, (counts.get(row.reported_pet_id) ?? 0) + 1);
  }
  return counts;
}

function unique(values: string[]): string[] {
  return [...new Set(values)];
}

/* -------------------------------------------------------------------------
 * Read
 * ---------------------------------------------------------------------- */

export async function listTrustQueue(query: TrustQuery): Promise<TrustResult<TrustQueueResponse>> {
  if (!isSupabaseConfigured()) {
    return { ok: false, reason: "unconfigured", message: "Supabase env vars are not set." };
  }

  try {
    const { page, pageSize, q, status, overdueOnly } = query;
    const offset = (page - 1) * pageSize;

    // `get_pet_trust_status` is a function, so it cannot be a PostgREST filter.
    // Every non-normal status is at or below the ceiling, so filtering on the
    // raw score selects exactly the review population and the band is derived
    // below. Soft-deleted pets are excluded: there is nothing to review.
    let request = from(TABLES.pets)
      .select(PET_COLUMNS, { count: "exact" })
      .lte("trust_score", TRUST_REVIEW_SCORE_CEILING)
      .is("deleted_at", null);

    if (q) {
      const term = q.replace(/[,()"\\*]/g, "").trim();
      if (term) {
        request = UUID_RE.test(term)
          ? request.or(`id.eq.${term},owner_account_id.eq.${term}`)
          : request.ilike("name", `%${term}%`);
      }
    }

    // Review deadline first, nulls last: a warning has no deadline, a ban does,
    // and the overdue ones are the whole point of the screen.
    const { data, count, error } = await request
      .order("temporary_ban_until", { ascending: true, nullsFirst: false })
      .order("trust_score", { ascending: true })
      .range(offset, offset + pageSize - 1);
    if (error) throw new Error(`pets.pets: ${error.message}`);

    const rows = (data ?? []) as PetRow[];
    if (rows.length === 0) {
      return { ok: true, data: { items: [], page, pageSize, total: count ?? 0 } };
    }

    const petIds = rows.map((r) => r.id);
    const [owners, reports] = await Promise.all([
      ownerEmails(unique(rows.map((r) => r.owner_account_id).filter((v): v is string => Boolean(v)))),
      reportCounts(petIds),
    ]);

    const now = Date.now();

    let items: TrustQueueEntry[] = rows.map((row) => {
      const score = row.trust_score ?? 0;
      const derived = trustStatusFor(score) ?? "normal";
      const dueAt = row.temporary_ban_until;

      return {
        petId: row.id,
        petName: row.name,
        petStatus: row.status,
        score,
        status: derived,

        ownerAccountId: row.owner_account_id,
        ownerEmail: row.owner_account_id ? owners.get(row.owner_account_id) ?? null : null,

        banStartedAt: row.temporary_banned_at,
        reviewDueAt: dueAt,
        /**
         * Only meaningful for a pet actually awaiting review. Excludes
         * `permanently_banned` as well as `normal`: their trigger stamps a
         * 7-day window for ANY score under 100, so a permanently banned pet
         * carries a date nobody intends to act on. Filtering it out here keeps
         * it out of the "overdue reviews only" view as well as the column.
         */
        reviewOverdue:
          Boolean(dueAt) &&
          new Date(dueAt as string).getTime() < now &&
          derived !== "normal" &&
          derived !== "permanently_banned",

        warningAcknowledged: row.trust_warning_acknowledged ?? false,
        reportCount: reports.get(row.id) ?? 0,
      };
    });

    // Applied after derivation because both filters are computed, not stored.
    // The count is corrected to match, so the pager doesn't promise rows that
    // were filtered away.
    if (status !== "all") items = items.filter((item) => item.status === status);
    if (overdueOnly) items = items.filter((item) => item.reviewOverdue);

    const total = status === "all" && !overdueOnly ? count ?? 0 : items.length;

    return { ok: true, data: { items, page, pageSize, total } };
  } catch (error) {
    return {
      ok: false,
      reason: "query_failed",
      message: error instanceof Error ? error.message : "Unknown query failure.",
    };
  }
}

/**
 * The ledger for one pet — every automatic movement, newest first.
 *
 * This is the evidence a reviewer judges on: which events cost the pet its
 * score, who triggered them, and when. Note that an admin restore writes NO row
 * here (their ledger is trigger-driven and we hold no insert grant), so a
 * restored pet's score will not reconcile against this list. That gap is raised
 * with the app team; our own audit log carries the restore.
 */
export async function getTrustLedger(petId: string): Promise<TrustResult<TrustLedgerResponse>> {
  if (!isSupabaseConfigured()) {
    return { ok: false, reason: "unconfigured", message: "Supabase env vars are not set." };
  }
  if (!UUID_RE.test(petId)) {
    return { ok: false, reason: "not_found", message: "No pet with that id." };
  }

  try {
    const { data: pet, error: petError } = await from(TABLES.pets)
      .select("id,trust_score")
      .eq("id", petId)
      .maybeSingle();
    if (petError) throw new Error(`pets.pets: ${petError.message}`);
    if (!pet) return { ok: false, reason: "not_found", message: "No pet with that id." };

    const { data, error } = await from(TABLES.events)
      .select("id,reason,delta,actor_pet_id,created_at")
      .eq("target_pet_id", petId)
      .order("created_at", { ascending: false })
      .limit(200);
    if (error) throw new Error(`pets.trust_score_events: ${error.message}`);

    const rows = (data ?? []) as {
      id: string;
      reason: string;
      delta: number;
      actor_pet_id: string | null;
      created_at: string;
    }[];

    // Actor names make the ledger readable ("blocked by Rex") instead of a
    // column of uuids. One lookup for the page, not one per row.
    const actorIds = unique(rows.map((r) => r.actor_pet_id).filter((v): v is string => Boolean(v)));
    const actorNames = new Map<string, string | null>();
    if (actorIds.length > 0) {
      const { data: actors, error: actorError } = await from(TABLES.pets)
        .select("id,name")
        .in("id", actorIds);
      if (actorError) throw new Error(`pets.pets: ${actorError.message}`);
      for (const row of (actors ?? []) as { id: string; name: string | null }[]) {
        actorNames.set(row.id, row.name);
      }
    }

    const events: TrustEvent[] = rows.map((row) => ({
      id: row.id,
      reason: row.reason,
      delta: row.delta,
      actorPetId: row.actor_pet_id,
      actorPetName: row.actor_pet_id ? actorNames.get(row.actor_pet_id) ?? null : null,
      createdAt: row.created_at,
    }));

    return {
      ok: true,
      data: { petId, score: (pet as { trust_score: number | null }).trust_score ?? 0, events },
    };
  } catch (error) {
    return {
      ok: false,
      reason: "query_failed",
      message: error instanceof Error ? error.message : "Unknown query failure.",
    };
  }
}

/* -------------------------------------------------------------------------
 * Restore
 * ---------------------------------------------------------------------- */

/**
 * Permanently ban one pet: a moderator's decision expressed through the
 * backend's own mechanism.
 *
 * TWO WRITES, deliberately, because a trust ban alone is weaker than it sounds.
 * It stops the OWNER acting as that pet — their router redirects to the
 * permanent-ban screen — but hides the pet from nobody: it stays in every other
 * user's discovery and its posts stay in feeds. So we also record a
 * `kind = 'banned'` restriction, which surfaces the ban in `/users` and puts the
 * pet into `public.active_moderation_targets`, the view the app reads to filter
 * moderated content out of discovery.
 *
 * Order matters: the score first. If the restriction insert fails afterwards
 * the pet is still locked out of the app — the safety-critical half — and the
 * audit row records that the restriction did not land.
 *
 * REVERSIBLE. `restoreTrust` writes 555, which their trigger turns back into
 * `normal` and clears the ban columns. "Permanent" describes the effect on the
 * user, not our ability to undo it.
 */
export async function banPetPermanently(
  petId: string,
  reason: string,
  actor: Actor,
): Promise<TrustActionResult> {
  if (!isSupabaseConfigured()) {
    return { ok: false, reason: "unconfigured", message: "Supabase env vars are not set." };
  }
  if (!UUID_RE.test(petId)) {
    return { ok: false, reason: "not_found", message: "No pet with that id." };
  }

  try {
    const { data: existing, error: readError } = await from(TABLES.pets)
      .select("id,name,trust_score,temporary_banned_at")
      .eq("id", petId)
      .maybeSingle();
    if (readError) throw new Error(`pets.pets: ${readError.message}`);
    if (!existing) return { ok: false, reason: "not_found", message: "No pet with that id." };

    const before = existing as {
      id: string;
      name: string | null;
      trust_score: number | null;
      temporary_banned_at: string | null;
    };
    const previousScore = before.trust_score ?? 0;
    const previousStatus = trustStatusFor(previousScore);

    if (previousStatus === "permanently_banned") {
      return {
        ok: false,
        reason: "conflict",
        message: "This pet is already permanently banned.",
      };
    }

    // ONLY trust_score. Their trigger owns the lifecycle columns, and writing
    // 0 will stamp a 7-day window on a pet that had none — an artifact of the
    // trigger's `< 100` branch, recorded below and suppressed in the UI.
    const { data: updated, error: updateError } = await from(TABLES.pets)
      .update({ trust_score: TRUST_PERMANENT_BAN_SCORE })
      .eq("id", petId)
      .select("id");
    if (updateError) throw new Error(`pets.pets: ${updateError.message}`);
    if ((updated ?? []).length === 0) {
      return { ok: false, reason: "not_found", message: "No pet with that id." };
    }

    // A duplicate means an active ban restriction already exists, which is
    // benign here — the score write is the authoritative half and a second row
    // would say nothing new.
    const restriction = await insertRestriction("pet", petId, "banned", reason, actor, null);
    const restrictionWritten = restriction.ok || restriction.reason === "duplicate";

    const result = await writeAuditLog({
      actorId: actor.userId,
      actorEmail: actor.email,
      actorRole: actor.role,
      action: "trust.ban",
      targetType: "pet",
      targetId: petId,
      reason,
      metadata: {
        previousScore,
        newScore: TRUST_PERMANENT_BAN_SCORE,
        previousStatus,
        petName: before.name,
        restrictionWritten,
        ...(restrictionWritten ? {} : { restrictionError: restriction.ok ? null : restriction.message }),
        // The trigger stamps a review window for anything under 100. True here
        // means this ban created a review date that means nothing.
        stampedReviewWindow: before.temporary_banned_at === null,
      },
    });
    if (!result.ok) {
      return {
        ok: false,
        reason: "unaudited",
        message: `Pet banned, but the audit write failed: ${result.message}`,
      };
    }

    return { ok: true };
  } catch (error) {
    return {
      ok: false,
      reason: "action_failed",
      message: error instanceof Error ? error.message : "Unknown action failure.",
    };
  }
}

export async function restoreTrust(
  petId: string,
  reason: string,
  actor: Actor,
): Promise<TrustActionResult> {
  if (!isSupabaseConfigured()) {
    return { ok: false, reason: "unconfigured", message: "Supabase env vars are not set." };
  }
  if (!UUID_RE.test(petId)) {
    return { ok: false, reason: "not_found", message: "No pet with that id." };
  }

  try {
    const { data: existing, error: readError } = await from(TABLES.pets)
      .select("id,name,trust_score,temporary_ban_until")
      .eq("id", petId)
      .maybeSingle();
    if (readError) throw new Error(`pets.pets: ${readError.message}`);
    if (!existing) return { ok: false, reason: "not_found", message: "No pet with that id." };

    const before = existing as {
      id: string;
      name: string | null;
      trust_score: number | null;
      temporary_ban_until: string | null;
    };
    const previousScore = before.trust_score ?? 0;
    const previousStatus = trustStatusFor(previousScore);

    // Restoring an already-normal pet is refused rather than silently applied:
    // it would still fire the trigger and clear an acknowledged warning,
    // re-showing the dialog to someone who was never restricted.
    if (previousStatus === "normal") {
      return {
        ok: false,
        reason: "conflict",
        message: "This pet is already in good standing — nothing to restore.",
      };
    }

    // ONLY trust_score. The trigger owns the three lifecycle columns and the
    // grant does not cover them; writing 555 is what clears the ban window.
    const { data: updated, error: updateError } = await from(TABLES.pets)
      .update({ trust_score: TRUST_RESTORE_SCORE })
      .eq("id", petId)
      .select("id");
    if (updateError) throw new Error(`pets.pets: ${updateError.message}`);
    if ((updated ?? []).length === 0) {
      return { ok: false, reason: "not_found", message: "No pet with that id." };
    }

    // Undo the other half of a permanent ban. Restoring only the score would
    // leave an active `banned` restriction behind, keeping the pet in
    // `active_moderation_targets` and therefore hidden from discovery — a pet
    // that reads "normal" everywhere while still being suppressed in the app.
    const liftedRestrictions = await liftRestrictions("pet", petId, ["banned"], actor);

    const result = await writeAuditLog({
      actorId: actor.userId,
      actorEmail: actor.email,
      actorRole: actor.role,
      action: "trust.restore",
      // Trust belongs to a pet, so the existing target type is the right one —
      // this keeps a pet's whole moderation history on one /audit filter.
      targetType: "pet",
      targetId: petId,
      reason,
      metadata: {
        previousScore,
        newScore: TRUST_RESTORE_SCORE,
        previousStatus,
        petName: before.name,
        // Records what the trigger did on our behalf, since none of it is
        // visible in the columns we wrote.
        clearedBanWindow: true,
        previousReviewDueAt: before.temporary_ban_until,
        /** Ban restrictions lifted alongside the score — 0 for a plain review. */
        liftedRestrictions,
      },
    });
    if (!result.ok) {
      return {
        ok: false,
        reason: "unaudited",
        message: `Trust restored, but the audit write failed: ${result.message}`,
      };
    }

    return { ok: true };
  } catch (error) {
    return {
      ok: false,
      reason: "action_failed",
      message: error instanceof Error ? error.message : "Unknown action failure.",
    };
  }
}
