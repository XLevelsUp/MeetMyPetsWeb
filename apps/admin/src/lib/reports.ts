import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import { isSupabaseConfigured } from "@/lib/supabase/reference";
import { writeAuditLog } from "@/lib/audit";
import type { AuditAction } from "@/lib/audit-actions";
import type { AdminRole } from "@/lib/roles";
import type { ReportResolution, ReportScope, ReportStatus } from "@/lib/report-constants";
import type {
  ReportSummary,
  ReportsQuery,
  ReportsResponse,
  TrustSignal,
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
  | { ok: true }
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
 * Same thresholds as the backend's `pets.get_pet_trust_status` (verified
 * 2026-08-15). Derived here rather than called as an RPC because we already
 * hold the score from the pet lookup, and a per-row RPC would be N+1.
 *
 * Kept deliberately close to the SQL, including the `<= 0` case: a score can go
 * negative, and treating that as anything but permanently banned would let a
 * deeply negative pet read as merely warned.
 */
export function trustStatusFor(score: number | null): TrustSignal["status"] {
  if (score === null) return null;
  if (score <= 0) return "permanently_banned";
  if (score < 100) return "temporary_banned";
  if (score <= 250) return "warning";
  return "normal";
}

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

    // Owner emails need the pet lookup first, so this one can't join the fan-out.
    const owners = await ownerEmails(
      unique(
        reportedPetIds
          .map((id) => pets.get(id)?.owner_account_id)
          .filter((v): v is string => Boolean(v)),
      ),
    );

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
      .select("id,status,reported_pet_id,reason,context_entity_type")
      .eq("id", reportId)
      .maybeSingle();
    if (readError) throw new Error(`matching.pet_reports: ${readError.message}`);
    if (!existing) return { ok: false, reason: "not_found", message: "No report with that id." };

    const before = existing as {
      id: string;
      status: string;
      reported_pet_id: string;
      reason: string;
      context_entity_type: string | null;
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
        scope: before.context_entity_type === "post" ? "post" : "profile",
      },
    });
    if (!result.ok) {
      return {
        ok: false,
        reason: "unaudited",
        message: `Report updated, but the audit write failed: ${result.message}`,
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
