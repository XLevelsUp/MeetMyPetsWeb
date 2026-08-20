import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import { isSupabaseConfigured } from "@/lib/supabase/reference";
import { writeAuditLog } from "@/lib/audit";
import type { AuditAction } from "@/lib/audit-actions";
import type { AdminRole } from "@/lib/roles";
import {
  REVERTS_TRUST,
  type ReportResolution,
  type ReportScope,
  type ReportStatus,
  type TrustRevertOutcome,
} from "@/lib/report-constants";
import {
  TRUST_RESTORE_SCORE,
  reportEventReason,
  trustStatusFor,
} from "@/lib/trust-constants";
import type {
  ReportSummary,
  ReportsQuery,
  ReportsResponse,
  TrustRevertPreview,
} from "@/lib/reports-contract";

/**
 * Moderation report queue adapter — the backend's `matching.pet_reports`.
 *
 * OWNERSHIP: this table is NOT ours. It belongs to the mobile/FastAPI team,
 * who insert into it from the app. The panel holds SELECT plus a
 * column-scoped `UPDATE (status)` (migration 20260815000000) — Postgres itself
 * rejects any attempt to touch `reason`, `details`, or either reporter id, so
 * "we only move the queue state" is a privilege rather than a promise. There is
 * no insert or delete path here by construction.
 *
 * We originally drafted our own `public.admin_reports`; that proposal is
 * withdrawn (docs/admin/reports-schema-proposal.md is marked superseded). A
 * second table would have split reporting data in half.
 *
 * SHAPE: a row with no context reports the PET PROFILE; one carrying
 * `context_entity_type = 'post'` reports a single post. PostgREST cannot join
 * across schemas, so a page of reports fans out into parallel lookups against
 * `pets`, `identity` and `social`, merged through Maps — the same pattern
 * `users.ts` uses for restrictions and `analytics.ts` for species names.
 *
 * House adapter pattern: discriminated unions, never throws.
 */

export type ReportsResult<T> =
  | { ok: true; data: T }
  | { ok: false; reason: "unconfigured" | "not_found" | "query_failed"; message: string };

/** Mirrors `users.ts` — `unaudited` means the status DID change but the audit write failed. */
export type ReportActionResult =
  | { ok: true; revert: TrustRevertPreview | null }
  | {
      ok: false;
      reason: "unconfigured" | "not_found" | "action_failed" | "unaudited";
      message: string;
    };

const TABLES = {
  reports: { schema: "matching", table: "pet_reports" },
  pets: { schema: "pets", table: "pets" },
  accounts: { schema: "identity", table: "accounts" },
  posts: { schema: "social", table: "posts" },
  /** The app's trust ledger — SELECT only. We read it to find what to credit. */
  trustEvents: { schema: "pets", table: "trust_score_events" },
  /** Ours: the counter-entry their ledger will not let us write. */
  reversals: { schema: "public", table: "admin_trust_reversals" },
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

/** See the identical note in `users.ts` — strip PostgREST `or=()` structure. */
function sanitizeSearch(term: string): string {
  return term.replace(/[,()"\\*]/g, "").trim();
}

/**
 * Re-exported for the existing callers and tests. The thresholds moved to
 * `lib/trust-constants.ts` when the trust review queue landed — two copies of
 * the same ladder would be exactly the drift the constants file warns about.
 */
export { trustStatusFor };

type ReportRow = {
  id: string;
  reporter_pet_id: string;
  reported_pet_id: string;
  reporter_account_id: string | null;
  reason: string;
  details: string | null;
  status: string;
  context_entity_type: string | null;
  context_entity_id: string | null;
  created_at: string;
};

type PetRow = {
  id: string;
  name: string | null;
  owner_account_id: string | null;
  trust_score: number | null;
  temporary_ban_until: string | null;
};

type PostRow = {
  id: string;
  caption: string | null;
  created_at: string | null;
  deleted_at: string | null;
};

const REPORT_COLUMNS =
  "id,reporter_pet_id,reported_pet_id,reporter_account_id,reason,details,status,context_entity_type,context_entity_id,created_at";

/** id → row, for a set of pets across the schema boundary. */
async function petsById(ids: string[]): Promise<Map<string, PetRow>> {
  const map = new Map<string, PetRow>();
  if (ids.length === 0) return map;

  const { data, error } = await from(TABLES.pets)
    .select("id,name,owner_account_id,trust_score,temporary_ban_until")
    .in("id", ids);
  if (error) throw new Error(`pets.pets: ${error.message}`);

  for (const row of (data ?? []) as PetRow[]) map.set(row.id, row);
  return map;
}

/** account id → email. */
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

/** post id → row. Soft-deleted posts are still fetched: a moderator needs to
 *  see what was reported even after the owner removed it. */
async function postsById(ids: string[]): Promise<Map<string, PostRow>> {
  const map = new Map<string, PostRow>();
  if (ids.length === 0) return map;

  const { data, error } = await from(TABLES.posts)
    .select("id,caption,created_at,deleted_at")
    .in("id", ids);
  if (error) throw new Error(`social.posts: ${error.message}`);

  for (const row of (data ?? []) as PostRow[]) map.set(row.id, row);
  return map;
}

/**
 * pet id → total reports ever filed against it. The repeat-offender signal:
 * one report is noise, six is a pattern.
 *
 * Counts across ALL statuses on purpose — a pet with five dismissed reports is
 * telling you something different from a pet with five pending ones, and the
 * moderator should see the difference rather than have it filtered away.
 */
async function reportCountsFor(petIds: string[]): Promise<Map<string, number>> {
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

/* -------------------------------------------------------------------------
 * Trust reversal
 *
 * Filing a report costs the reported pet points. Dismissing it — "not a
 * legitimate report" — should give them back.
 *
 * FINDING THE RIGHT DEDUCTION IS EXACT, NOT A GUESS. `trust_score_events`
 * carries no report id (profile rows have `event_ref = NULL`; post rows point
 * at the POST). But the app dedups its own writes with a unique index on
 * `(target_pet_id, coalesce(actor_pet_id,0), reason, coalesce(event_ref,0))`,
 * and every one of those is reconstructible from the report row — so the lookup
 * below matches at most one event, by that same key. Verified live: 15 of 15
 * reports resolve to exactly one deduction.
 *
 * That dedup index also creates the `still_earned` case: two reports from the
 * same reporter against the same pet share ONE deduction, so dismissing one of
 * them must not refund a penalty the other still justifies.
 * ---------------------------------------------------------------------- */

type ReportIdentity = {
  id: string;
  reportedPetId: string;
  reporterPetId: string;
  scope: ReportScope;
  /** The post id for a post-scoped report; null for a profile report. */
  contextEntityId: string | null;
};

type TrustEventRow = { id: string; delta: number };

/**
 * The single ledger row this report's penalty was written as, or null.
 *
 * `is()` rather than `eq()` for the nullable columns: PostgREST renders
 * `eq.null` as the literal string "null", which matches nothing.
 */
async function deductionFor(report: ReportIdentity): Promise<TrustEventRow | null> {
  let request = from(TABLES.trustEvents)
    .select("id,delta")
    .eq("target_pet_id", report.reportedPetId)
    .eq("actor_pet_id", report.reporterPetId)
    .eq("reason", reportEventReason(report.scope));

  request = report.contextEntityId
    ? request.eq("event_ref", report.contextEntityId)
    : request.is("event_ref", null);

  const { data, error } = await request.limit(1);
  if (error) throw new Error(`pets.trust_score_events: ${error.message}`);

  const rows = (data ?? []) as TrustEventRow[];
  return rows[0] ?? null;
}

/** Other reports that would map to this same ledger row. */
async function siblingReportCount(report: ReportIdentity): Promise<number> {
  let request = from(TABLES.reports)
    .select("id")
    .eq("reported_pet_id", report.reportedPetId)
    .eq("reporter_pet_id", report.reporterPetId)
    .neq("id", report.id);

  request = report.contextEntityId
    ? request.eq("context_entity_id", report.contextEntityId)
    : request.is("context_entity_id", null);

  const { data, error } = await request;
  if (error) throw new Error(`matching.pet_reports: ${error.message}`);
  return (data ?? []).length;
}

/** Has this ledger row already been credited back? */
async function alreadyReverted(trustEventId: string): Promise<boolean> {
  const { data, error } = await from(TABLES.reversals)
    .select("id")
    .eq("trust_event_id", trustEventId)
    .limit(1);
  if (error) throw new Error(`admin_trust_reversals: ${error.message}`);
  return (data ?? []).length > 0;
}

/**
 * Decide what a dismissal would do, without doing it.
 *
 * Shared by the list preview and the write path so the dialog cannot promise
 * something the write then refuses. The write re-runs this: a score can move
 * between rendering a row and submitting the dialog.
 */
async function planRevert(
  report: ReportIdentity,
): Promise<{ preview: TrustRevertPreview; event: TrustEventRow | null; scoreBefore: number | null }> {
  const none = (outcome: TrustRevertOutcome): TrustRevertPreview => ({
    outcome,
    delta: null,
    scoreAfter: null,
  });

  const event = await deductionFor(report);
  if (!event) return { preview: none("no_deduction"), event: null, scoreBefore: null };

  if (await alreadyReverted(event.id)) {
    return { preview: none("already_reverted"), event, scoreBefore: null };
  }
  if ((await siblingReportCount(report)) > 0) {
    return { preview: none("still_earned"), event, scoreBefore: null };
  }

  const { data, error } = await from(TABLES.pets)
    .select("trust_score")
    .eq("id", report.reportedPetId)
    .maybeSingle();
  if (error) throw new Error(`pets.pets: ${error.message}`);

  const scoreBefore = (data as { trust_score: number | null } | null)?.trust_score ?? null;
  if (scoreBefore === null) return { preview: none("no_deduction"), event, scoreBefore: null };

  // The credit is the magnitude of the penalty the app actually recorded, not
  // our constant — if they ever change a delta, existing rows keep their own.
  const delta = Math.abs(event.delta);
  const scoreAfter = scoreBefore + delta;

  // Their trigger reads exactly 555 as a full restoration and clears the ban
  // window. Landing there by arithmetic would lift a ban this dismissal did not
  // adjudicate. Blocked on purpose — see TRUST_REVERT_OUTCOMES.
  if (scoreAfter === TRUST_RESTORE_SCORE) {
    return { preview: none("would_restore"), event, scoreBefore };
  }

  return { preview: { outcome: "reverted", delta, scoreAfter }, event, scoreBefore };
}

/**
 * The dedup key the app writes its deductions under, as a string.
 *
 * One helper so the report side and the ledger side are always keyed the same
 * way — building this string twice is how the two halves would drift.
 */
function dedupKey(parts: {
  petId: string;
  actorPetId: string | null;
  reason: string;
  eventRef: string | null;
}): string {
  return [parts.petId, parts.actorPetId ?? "-", parts.reason, parts.eventRef ?? "-"].join("|");
}

/**
 * Revert previews for a whole page, in THREE queries rather than four per row.
 *
 * The per-row `planRevert` is correct but would be ~100 round trips for a page
 * of 25. This resolves the same guards in bulk and matches them in memory —
 * the same fan-out-then-merge shape `listReports` already uses for pets, posts
 * and counts.
 */
async function revertPreviewsFor(
  rows: ReportRow[],
  pets: Map<string, PetRow>,
): Promise<Map<string, TrustRevertPreview>> {
  const previews = new Map<string, TrustRevertPreview>();
  if (rows.length === 0) return previews;

  const petIds = unique(rows.map((r) => r.reported_pet_id));

  const [eventsRes, siblingRes] = await Promise.all([
    from(TABLES.trustEvents)
      .select("id,delta,target_pet_id,actor_pet_id,reason,event_ref")
      .in("target_pet_id", petIds)
      .in("reason", ["report", "post_report"]),
    // Every report against these pets, to find ones sharing a dedup key.
    from(TABLES.reports)
      .select("id,reported_pet_id,reporter_pet_id,context_entity_type,context_entity_id")
      .in("reported_pet_id", petIds),
  ]);
  if (eventsRes.error) throw new Error(`pets.trust_score_events: ${eventsRes.error.message}`);
  if (siblingRes.error) throw new Error(`matching.pet_reports: ${siblingRes.error.message}`);

  const eventByKey = new Map<string, TrustEventRow>();
  for (const e of (eventsRes.data ?? []) as {
    id: string;
    delta: number;
    target_pet_id: string;
    actor_pet_id: string | null;
    reason: string;
    event_ref: string | null;
  }[]) {
    eventByKey.set(
      dedupKey({
        petId: e.target_pet_id,
        actorPetId: e.actor_pet_id,
        reason: e.reason,
        eventRef: e.event_ref,
      }),
      { id: e.id, delta: e.delta },
    );
  }

  const reportsPerKey = new Map<string, number>();
  for (const r of (siblingRes.data ?? []) as {
    reported_pet_id: string;
    reporter_pet_id: string;
    context_entity_type: string | null;
    context_entity_id: string | null;
  }[]) {
    const key = dedupKey({
      petId: r.reported_pet_id,
      actorPetId: r.reporter_pet_id,
      reason: r.context_entity_type === "post" ? "post_report" : "report",
      eventRef: r.context_entity_id,
    });
    reportsPerKey.set(key, (reportsPerKey.get(key) ?? 0) + 1);
  }

  const eventIds = [...eventByKey.values()].map((e) => e.id);
  const reverted = new Set<string>();
  if (eventIds.length > 0) {
    const { data, error } = await from(TABLES.reversals)
      .select("trust_event_id")
      .in("trust_event_id", eventIds);
    if (error) throw new Error(`admin_trust_reversals: ${error.message}`);
    for (const row of (data ?? []) as { trust_event_id: string }[]) {
      reverted.add(row.trust_event_id);
    }
  }

  const none = (outcome: TrustRevertOutcome): TrustRevertPreview => ({
    outcome,
    delta: null,
    scoreAfter: null,
  });

  for (const row of rows) {
    const scope: ReportScope = row.context_entity_type === "post" ? "post" : "profile";
    const key = dedupKey({
      petId: row.reported_pet_id,
      actorPetId: row.reporter_pet_id,
      reason: reportEventReason(scope),
      eventRef: row.context_entity_id,
    });

    const event = eventByKey.get(key);
    if (!event) {
      previews.set(row.id, none("no_deduction"));
      continue;
    }
    if (reverted.has(event.id)) {
      previews.set(row.id, none("already_reverted"));
      continue;
    }
    if ((reportsPerKey.get(key) ?? 0) > 1) {
      previews.set(row.id, none("still_earned"));
      continue;
    }

    const score = pets.get(row.reported_pet_id)?.trust_score ?? null;
    if (score === null) {
      previews.set(row.id, none("no_deduction"));
      continue;
    }

    const delta = Math.abs(event.delta);
    const scoreAfter = score + delta;
    previews.set(
      row.id,
      scoreAfter === TRUST_RESTORE_SCORE
        ? none("would_restore")
        : { outcome: "reverted", delta, scoreAfter },
    );
  }

  return previews;
}

/* -------------------------------------------------------------------------
 * Read
 * ---------------------------------------------------------------------- */

export async function listReports(query: ReportsQuery): Promise<ReportsResult<ReportsResponse>> {
  if (!isSupabaseConfigured()) {
    return { ok: false, reason: "unconfigured", message: "Supabase env vars are not set." };
  }

  try {
    const { page, pageSize, q, status, reason, scope } = query;
    const offset = (page - 1) * pageSize;

    let request = from(TABLES.reports).select(REPORT_COLUMNS, { count: "exact" });

    if (status !== "all") request = request.eq("status", status);
    if (reason !== "all") request = request.eq("reason", reason);

    // Scope is derived from the context pair, which the backend's
    // `pet_reports_context_pair` constraint keeps both-null or both-set.
    if (scope === "profile") request = request.is("context_entity_type", null);
    else if (scope === "post") request = request.eq("context_entity_type", "post");

    if (q) {
      const term = sanitizeSearch(q);
      if (term) {
        request = UUID_RE.test(term)
          ? request.or(`id.eq.${term},reported_pet_id.eq.${term},reporter_pet_id.eq.${term}`)
          : request.ilike("details", `%${term}%`);
      }
    }

    const { data, count, error } = await request
      .order("created_at", { ascending: false })
      .range(offset, offset + pageSize - 1);
    if (error) throw new Error(`matching.pet_reports: ${error.message}`);

    const rows = (data ?? []) as ReportRow[];
    if (rows.length === 0) {
      return { ok: true, data: { items: [], page, pageSize, total: count ?? 0 } };
    }

    const petIds = unique(rows.flatMap((r) => [r.reported_pet_id, r.reporter_pet_id]));
    const postIds = unique(
      rows
        .filter((r) => r.context_entity_type === "post" && r.context_entity_id)
        .map((r) => r.context_entity_id as string),
    );
    const reportedPetIds = unique(rows.map((r) => r.reported_pet_id));

    const [pets, posts, counts] = await Promise.all([
      petsById(petIds),
      postsById(postIds),
      reportCountsFor(reportedPetIds),
    ]);

    // Owner emails and revert previews both need the pet lookup first, so they
    // form a second wave rather than joining the fan-out above.
    const [owners, reverts] = await Promise.all([
      ownerEmails(
        unique(
          reportedPetIds
            .map((id) => pets.get(id)?.owner_account_id)
            .filter((v): v is string => Boolean(v)),
        ),
      ),
      revertPreviewsFor(rows, pets),
    ]);

    const items: ReportSummary[] = rows.map((row) => {
      const reported = pets.get(row.reported_pet_id) ?? null;
      const reporter = pets.get(row.reporter_pet_id) ?? null;
      const ownerId = reported?.owner_account_id ?? null;
      const post =
        row.context_entity_type === "post" && row.context_entity_id
          ? posts.get(row.context_entity_id) ?? null
          : null;

      return {
        id: row.id,
        status: row.status as ReportStatus,
        reason: row.reason as ReportSummary["reason"],
        details: row.details,
        scope: (row.context_entity_type === "post" ? "post" : "profile") as ReportScope,
        createdAt: row.created_at,

        reportedPetId: row.reported_pet_id,
        reportedPetName: reported?.name ?? null,
        reportedOwnerAccountId: ownerId,
        reportedOwnerEmail: ownerId ? owners.get(ownerId) ?? null : null,

        reporterPetId: row.reporter_pet_id,
        reporterPetName: reporter?.name ?? null,

        post: post
          ? {
              id: post.id,
              caption: post.caption,
              createdAt: post.created_at,
              deletedAt: post.deleted_at,
            }
          : null,
        trust: {
          score: reported?.trust_score ?? null,
          status: trustStatusFor(reported?.trust_score ?? null),
          bannedUntil: reported?.temporary_ban_until ?? null,
        },
        reportsAgainstPet: counts.get(row.reported_pet_id) ?? 0,
        revert: reverts.get(row.id) ?? { outcome: "no_deduction", delta: null, scoreAfter: null },
      };
    });

    return { ok: true, data: { items, page, pageSize, total: count ?? 0 } };
  } catch (error) {
    return {
      ok: false,
      reason: "query_failed",
      message: error instanceof Error ? error.message : "Unknown query failure.",
    };
  }
}

function unique(values: string[]): string[] {
  return [...new Set(values)];
}

/* -------------------------------------------------------------------------
 * Resolution
 *
 * status change → audit row. A failed audit write returns `unaudited` (the
 * change already happened) rather than pretending nothing occurred — same
 * contract as every action in `users.ts`.
 * ---------------------------------------------------------------------- */

const RESOLUTION_ACTIONS: Record<ReportResolution, AuditAction> = {
  reviewed: "report.review",
  actioned: "report.action",
  dismissed: "report.dismiss",
};

/**
 * Credit the deduction back. Called only after the status change succeeded.
 *
 * Never throws and never fails the dismissal: the moderator asked for the
 * report to be dismissed, and trust plumbing must not hold that hostage. Every
 * path returns an outcome the caller reports verbatim.
 */
async function applyRevert(
  report: ReportIdentity,
  reason: string,
  actor: Actor,
): Promise<TrustRevertPreview> {
  try {
    const { preview, event, scoreBefore } = await planRevert(report);
    if (preview.outcome !== "reverted" || !event || scoreBefore === null) return preview;

    /**
     * Compare-and-swap. PostgREST cannot express `trust_score = trust_score +
     * 80`, so the read and the write are separate statements — the `.eq` on the
     * old value is what makes that safe. Zero rows back means something else
     * moved the score in between (another dismissal, a restore, the app itself)
     * and our arithmetic is stale.
     */
    const { data: updated, error: updateError } = await from(TABLES.pets)
      .update({ trust_score: preview.scoreAfter })
      .eq("id", report.reportedPetId)
      .eq("trust_score", scoreBefore)
      .select("id");
    if (updateError) throw new Error(`pets.pets: ${updateError.message}`);
    if ((updated ?? []).length === 0) {
      return { outcome: "score_moved", delta: null, scoreAfter: null };
    }

    // Only after a confirmed score change. The unique constraint on
    // trust_event_id is the real idempotency guarantee — the `alreadyReverted`
    // check above is a courtesy that avoids the error in the common case.
    const { error: insertError } = await from(TABLES.reversals).insert({
      report_id: report.id,
      trust_event_id: event.id,
      pet_id: report.reportedPetId,
      delta: preview.delta,
      score_before: scoreBefore,
      score_after: preview.scoreAfter,
      reverted_by: actor.userId,
      reason,
    });
    if (insertError) throw new Error(`admin_trust_reversals: ${insertError.message}`);

    return preview;
  } catch {
    // The score may or may not have moved; the audit metadata records the
    // attempt either way, and `failed` tells the moderator to check /trust
    // rather than assuming a credit landed.
    return { outcome: "failed", delta: null, scoreAfter: null };
  }
}

export async function resolveReport(
  reportId: string,
  resolution: ReportResolution,
  reason: string,
  actor: Actor,
): Promise<ReportActionResult> {
  if (!isSupabaseConfigured()) {
    return { ok: false, reason: "unconfigured", message: "Supabase env vars are not set." };
  }
  if (!UUID_RE.test(reportId)) {
    return { ok: false, reason: "not_found", message: "No report with that id." };
  }

  try {
    const { data: existing, error: readError } = await from(TABLES.reports)
      .select("id,status,reported_pet_id,reporter_pet_id,reason,context_entity_type,context_entity_id")
      .eq("id", reportId)
      .maybeSingle();
    if (readError) throw new Error(`matching.pet_reports: ${readError.message}`);
    if (!existing) return { ok: false, reason: "not_found", message: "No report with that id." };

    const before = existing as {
      id: string;
      status: string;
      reported_pet_id: string;
      reporter_pet_id: string;
      reason: string;
      context_entity_type: string | null;
      context_entity_id: string | null;
    };

    // Only `status` — the grant is column-scoped, so a wider update would be
    // rejected by Postgres rather than silently succeeding.
    const { data: updated, error: updateError } = await from(TABLES.reports)
      .update({ status: resolution })
      .eq("id", reportId)
      .select("id");
    if (updateError) throw new Error(`matching.pet_reports: ${updateError.message}`);
    if ((updated ?? []).length === 0) {
      return { ok: false, reason: "not_found", message: "No report with that id." };
    }

    /**
     * Trust comes AFTER the status change, and only for a dismissal.
     *
     * A dismissal says the report was not legitimate, so the penalty it caused
     * should not stand. `reviewed` and `actioned` both mean the report WAS
     * legitimate — crediting there would undo a deduction the pet earned.
     */
    const scope: ReportScope = before.context_entity_type === "post" ? "post" : "profile";
    const revert =
      resolution === REVERTS_TRUST
        ? await applyRevert(
            {
              id: before.id,
              reportedPetId: before.reported_pet_id,
              reporterPetId: before.reporter_pet_id,
              scope,
              contextEntityId: before.context_entity_id,
            },
            reason,
            actor,
          )
        : null;

    const result = await writeAuditLog({
      actorId: actor.userId,
      actorEmail: actor.email,
      actorRole: actor.role,
      action: RESOLUTION_ACTIONS[resolution],
      targetType: "report",
      targetId: reportId,
      reason,
      metadata: {
        previousStatus: before.status,
        newStatus: resolution,
        reportedPetId: before.reported_pet_id,
        reportReason: before.reason,
        scope,
        // What happened to the trust score, recorded whether or not it moved —
        // "we chose not to" is as much a decision as "we did".
        ...(revert
          ? { trustRevert: revert.outcome, trustDelta: revert.delta, trustScoreAfter: revert.scoreAfter }
          : {}),
      },
    });
    if (!result.ok) {
      return {
        ok: false,
        reason: "unaudited",
        message: `Report updated, but the audit write failed: ${result.message}`,
      };
    }

    return { ok: true, revert };
  } catch (error) {
    return {
      ok: false,
      reason: "action_failed",
      message: error instanceof Error ? error.message : "Unknown action failure.",
    };
  }
}
