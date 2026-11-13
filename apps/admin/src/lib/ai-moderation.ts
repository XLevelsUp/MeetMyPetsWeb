import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import { isSupabaseConfigured } from "@/lib/supabase/reference";
import { writeAuditLog } from "@/lib/audit";
import type { AdminRole } from "@/lib/roles";
import type {
  AiDecisionSummary,
  AiDecisionsQuery,
  AiDecisionsResponse,
  ResolveAiDecisionRequest,
} from "@/lib/ai-moderation-contract";
import { outcomeFor } from "@/lib/ai-moderation-contract";

/** AI moderation queue adapter — `moderation.decisions`. OWNERSHIP: this table is NOT ours. */

export type AiResult<T> =
  | { ok: true; data: T }
  | { ok: false; reason: "unconfigured" | "not_found" | "query_failed"; message: string };

/** Mirrors `reports.ts` — `unaudited` means the row DID change but the audit write failed. */
export type AiActionResult =
  | {
      ok: true;
      finalDecision: "APPROVED" | "REJECTED";
      contentHidden: boolean;
    }
  | {
      ok: false;
      reason:
        | "unconfigured"
        | "not_found"
        | "action_failed"
        | "unaudited"
        | "already_reviewed"
        | "forbidden";
      message: string;
    };

type TableRef = { schema: string; table: string };

const TABLES = {
  decisions: { schema: "moderation", table: "decisions" },
  accounts: { schema: "identity", table: "accounts" },
  pets: { schema: "pets", table: "pets" },
  petMedia: { schema: "pets", table: "pet_media" },
  postMedia: { schema: "social", table: "post_media" },
  breeds: { schema: "pets", table: "breeds" },
} as const;

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

type DecisionRow = {
  id: string;
  account_id: string;
  pet_id: string | null;
  media_type: string;
  media_id: string;
  storage_path: string;
  media_sha256: string | null;
  media_size_bytes: number | null;
  content_type: string;
  context: string;
  decision: string;
  rejection_code: string | null;
  hard_reject: boolean;
  pet_score: string | number | null;
  composite_score: string | number | null;
  dimension_scores: Record<string, number> | null;
  ai_generated: boolean | null;
  ai_score: string | number | null;
  reason_codes: string[];
  flags: string[];
  species_detected: string[];
  detected_objects: unknown;
  processing_ms: number;
  model_version: string;
  created_at: string;
  review_status: string | null;
  final_decision: string | null;
  final_rejection_code: string | null;
  incorrect_reason_codes: string[];
  missing_reason_codes: string[];
  remarks: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  declared_breed_id: string | null;
  declared_is_cross_breed: boolean | null;
  breed_status: string;
  breed_match_score: string | number | null;
  detected_breed_id: string | null;
  detected_breed_name: string | null;
  detected_breed_score: string | number | null;
};

const DECISION_COLUMNS = [
  "id,account_id,pet_id,media_type,media_id,storage_path,media_sha256,media_size_bytes",
  "content_type,context,decision,rejection_code,hard_reject,pet_score,composite_score",
  "dimension_scores,ai_generated,ai_score,reason_codes,flags,species_detected,detected_objects",
  "processing_ms,model_version,created_at,review_status,final_decision,final_rejection_code",
  "incorrect_reason_codes,missing_reason_codes,remarks,reviewed_by,reviewed_at",
  "declared_breed_id,declared_is_cross_breed,breed_status,breed_match_score",
  "detected_breed_id,detected_breed_name,detected_breed_score",
].join(",");

/** PostgREST returns `numeric` as a string to avoid precision loss. */
function num(value: string | number | null): number | null {
  if (value === null || value === undefined) return null;
  const n = typeof value === "number" ? value : Number.parseFloat(value);
  return Number.isFinite(n) ? n : null;
}

/* -------------------------------------------------------------------------
 * Cross-schema lookups — no FKs exist, so every join is resolved here
 * ---------------------------------------------------------------------- */

type AccountRow = { id: string; email: string | null; display_name: string | null };

async function accountsById(ids: string[]): Promise<Map<string, AccountRow>> {
  const map = new Map<string, AccountRow>();
  if (ids.length === 0) return map;
  const { data } = await from(TABLES.accounts).select("id,email,display_name").in("id", ids);
  for (const row of data ?? []) map.set(row.id, row as AccountRow);
  return map;
}

async function petNamesById(ids: string[]): Promise<Map<string, string | null>> {
  const map = new Map<string, string | null>();
  if (ids.length === 0) return map;
  const { data } = await from(TABLES.pets).select("id,name").in("id", ids);
  for (const row of data ?? []) map.set(row.id as string, (row.name as string) ?? null);
  return map;
}

async function breedNamesById(ids: string[]): Promise<Map<string, string>> {
  const map = new Map<string, string>();
  if (ids.length === 0) return map;
  const { data } = await from(TABLES.breeds).select("id,name").in("id", ids);
  for (const row of data ?? []) map.set(row.id as string, row.name as string);
  return map;
}

/** Public URL for a decision's media. `storage_path` is `bucket/path/file.ext` — bucket first. */
function mediaUrl(storagePath: string): string | null {
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!base || !storagePath) return null;
  const slash = storagePath.indexOf("/");
  if (slash <= 0) return null;
  const bucket = storagePath.slice(0, slash);
  const path = storagePath.slice(slash + 1);
  return `${base}/storage/v1/object/public/${bucket}/${encodeURI(path)}`;
}

function toSummary(
  row: DecisionRow,
  accounts: Map<string, AccountRow>,
  petNames: Map<string, string | null>,
  breeds: Map<string, string>,
): AiDecisionSummary {
  const owner = accounts.get(row.account_id);
  const reviewer = row.reviewed_by ? accounts.get(row.reviewed_by) : undefined;

  return {
    id: row.id,
    createdAt: row.created_at,
    decision: row.decision as AiDecisionSummary["decision"],
    rejectionCode: row.rejection_code as AiDecisionSummary["rejectionCode"],
    hardReject: row.hard_reject,
    petScore: num(row.pet_score),
    compositeScore: num(row.composite_score),
    dimensionScores: row.dimension_scores,
    aiGenerated: row.ai_generated,
    aiScore: num(row.ai_score),
    reasonCodes: row.reason_codes ?? [],
    flags: row.flags ?? [],
    speciesDetected: row.species_detected ?? [],
    detectedObjects: row.detected_objects ?? null,
    processingMs: row.processing_ms,
    modelVersion: row.model_version,
    media: {
      type: row.media_type as AiDecisionSummary["media"]["type"],
      contentType: row.content_type as AiDecisionSummary["media"]["contentType"],
      url: mediaUrl(row.storage_path),
      storagePath: row.storage_path,
      sizeBytes: row.media_size_bytes,
      sha256: row.media_sha256,
    },
    subject: {
      accountId: row.account_id,
      ownerEmail: owner?.email ?? null,
      ownerName: owner?.display_name ?? null,
      petId: row.pet_id,
      petName: row.pet_id ? (petNames.get(row.pet_id) ?? null) : null,
    },
    breed: {
      status: row.breed_status as AiDecisionSummary["breed"]["status"],
      declaredBreedName: row.declared_breed_id
        ? (breeds.get(row.declared_breed_id) ?? null)
        : null,
      declaredIsCrossBreed: row.declared_is_cross_breed,
      matchScore: num(row.breed_match_score),
      detectedBreedName:
        row.detected_breed_name ??
        (row.detected_breed_id ? (breeds.get(row.detected_breed_id) ?? null) : null),
      detectedBreedScore: num(row.detected_breed_score),
    },
    review: {
      status: row.review_status as AiDecisionSummary["review"]["status"],
      finalDecision: row.final_decision as AiDecisionSummary["review"]["finalDecision"],
      finalRejectionCode:
        row.final_rejection_code as AiDecisionSummary["review"]["finalRejectionCode"],
      incorrectReasonCodes: row.incorrect_reason_codes ?? [],
      missingReasonCodes: row.missing_reason_codes ?? [],
      remarks: row.remarks,
      reviewedById: row.reviewed_by,
      reviewedByEmail: reviewer?.email ?? null,
      reviewedAt: row.reviewed_at,
    },
  };
}

/* -------------------------------------------------------------------------
 * List
 * ---------------------------------------------------------------------- */

export async function listAiDecisions(
  query: AiDecisionsQuery,
): Promise<AiResult<AiDecisionsResponse>> {
  if (!isSupabaseConfigured()) {
    return { ok: false, reason: "unconfigured", message: "Supabase is not configured." };
  }

  let request = from(TABLES.decisions).select(DECISION_COLUMNS, { count: "exact" });

  // One filter over two columns: who decided (review_status) and what they
  // decided (final_decision for a human, decision for the AI).
  if (query.review === "needs_review") {
    request = request.eq("review_status", "pending");
  } else if (query.review === "needs_review_ai_approved") {
    request = request.eq("review_status", "pending").eq("decision", "APPROVED");
  } else if (query.review === "needs_review_ai_rejected") {
    request = request.eq("review_status", "pending").eq("decision", "REJECTED");
  } else if (query.review === "needs_review_ai_unsure") {
    request = request.eq("review_status", "pending").eq("decision", "HUMAN_REVIEW");
  } else if (query.review === "approved_by_moderator") {
    request = request.eq("review_status", "done").eq("final_decision", "APPROVED");
  } else if (query.review === "rejected_by_moderator") {
    request = request.eq("review_status", "done").eq("final_decision", "REJECTED");
  } else if (query.review === "approved_by_ai") {
    request = request.is("review_status", null).eq("decision", "APPROVED");
  } else if (query.review === "rejected_by_ai") {
    request = request.is("review_status", null).eq("decision", "REJECTED");
  }

  if (query.decision !== "all") request = request.eq("decision", query.decision);
  if (query.media !== "all") request = request.eq("media_type", query.media);
  if (query.content !== "all") request = request.eq("content_type", query.content);

  // Free text searches the model's own output, not the owner — owner lives in
  // another schema and cannot be filtered server-side without a pre-resolved
  // id list. A uuid is matched exactly so pasting an id from a log works.
  const term = query.q ? sanitizeSearch(query.q) : "";
  if (term) {
    if (UUID_RE.test(term)) {
      request = request.or(`id.eq.${term},account_id.eq.${term},pet_id.eq.${term}`);
    } else {
      request = request.or(
        `model_version.ilike.*${term}*,storage_path.ilike.*${term}*,rejection_code.ilike.*${term}*`,
      );
    }
  }

  const fromRow = (query.page - 1) * query.pageSize;
  const { data, error, count } = await request
    .order(query.sort, { ascending: query.dir === "asc", nullsFirst: false })
    // Stable tiebreak: two rows sharing a score must not swap between pages.
    .order("id", { ascending: true })
    .range(fromRow, fromRow + query.pageSize - 1);

  if (error) {
    return { ok: false, reason: "query_failed", message: error.message };
  }

  // Double cast: the `.or()` branches widen PostgREST's inferred row type.
  const rows = (data ?? []) as unknown as DecisionRow[];
  const [accounts, petNames, breeds] = await Promise.all([
    accountsById(
      [...new Set(rows.flatMap((r) => [r.account_id, r.reviewed_by]).filter(Boolean))] as string[],
    ),
    petNamesById([...new Set(rows.map((r) => r.pet_id).filter(Boolean))] as string[]),
    breedNamesById(
      [
        ...new Set(rows.flatMap((r) => [r.declared_breed_id, r.detected_breed_id]).filter(Boolean)),
      ] as string[],
    ),
  ]);

  return {
    ok: true,
    data: {
      items: rows.map((row) => toSummary(row, accounts, petNames, breeds)),
      total: count ?? 0,
      page: query.page,
      pageSize: query.pageSize,
    },
  };
}

/* -------------------------------------------------------------------------
 * Resolve
 * ---------------------------------------------------------------------- */

/** Flips the content's own moderation_status so an approval or rejection reaches the app. */
async function applyToContent(
  row: Pick<DecisionRow, "media_type" | "media_id" | "pet_id">,
  status: "approved" | "rejected",
  rejectionCode: string | null,
): Promise<boolean> {
  const code = status === "rejected" ? rejectionCode : null;

  if (row.media_type === "pet_profile_photo") {
    const { error } = await from(TABLES.pets)
      .update({
        profile_photo_moderation_status: status,
        profile_photo_moderation_rejection_code: code,
      })
      .eq("id", row.media_id);
    return !error;
  }

  const target = row.media_type === "post_media" ? TABLES.postMedia : TABLES.petMedia;
  const { error } = await from(target)
    .update({ moderation_status: status, moderation_rejection_code: code })
    .eq("id", row.media_id);
  return !error;
}

/** Record the verdict and set the content's visibility — no trust change, no ban; both live on /trust. */
export async function resolveAiDecision(
  id: string,
  body: ResolveAiDecisionRequest,
  actor: Actor,
): Promise<AiActionResult> {
  if (!isSupabaseConfigured()) {
    return { ok: false, reason: "unconfigured", message: "Supabase is not configured." };
  }

  const { data: existing, error: readError } = await from(TABLES.decisions)
    .select("id,review_status,media_type,media_id,pet_id,decision,rejection_code,ai_generated")
    .eq("id", id)
    .maybeSingle();

  if (readError) return { ok: false, reason: "action_failed", message: readError.message };
  if (!existing) return { ok: false, reason: "not_found", message: "Decision not found." };

  const row = existing as Pick<
    DecisionRow,
    | "id"
    | "review_status"
    | "media_type"
    | "media_id"
    | "pet_id"
    | "decision"
    | "rejection_code"
    | "ai_generated"
  >;

  // Re-checked here rather than trusted from the list: the row can be resolved
  // by another moderator between rendering and submitting.
  if (row.review_status === "done") {
    return {
      ok: false,
      reason: "already_reviewed",
      message: "Another moderator has already reviewed this item.",
    };
  }

  // The outcome is derived here, never taken from the client.
  const finalDecision = outcomeFor(row.decision as AiDecisionSummary["decision"], body.aiWasRight);
  const rejected = finalDecision === "REJECTED";
  const reviewedAt = new Date().toISOString();

  // A code is only meaningful when the post ends up blocked.
  const rejectionCode = rejected ? (body.finalRejectionCode ?? row.rejection_code ?? null) : null;

  // Which retraining column the moderator's reason belongs in: the AI let
  // something through (missed) or flagged something innocent (incorrect).
  const wrong = body.aiWasRight ? [] : body.wrongReason ? [body.wrongReason] : [];
  const missed = !body.aiWasRight && row.decision === "APPROVED" ? wrong : [];
  const incorrect = !body.aiWasRight && row.decision !== "APPROVED" ? wrong : [];

  // A changed AI-generated flag is its own correction, independent of the verdict.
  const aiGenWrong = body.isAiGenerated !== (row.ai_generated ?? false);
  const missedCodes = aiGenWrong && body.isAiGenerated ? [...missed, "ai_generated"] : missed;
  const incorrectCodes = aiGenWrong && !body.isAiGenerated ? [...incorrect, "ai_generated"] : incorrect;

  // The record first: if a later step fails, the decision is still durable and
  // the audit metadata says which half did not land.
  const { error } = await from(TABLES.decisions)
    .update({
      review_status: "done",
      final_decision: finalDecision,
      final_rejection_code: rejectionCode,
      incorrect_reason_codes: incorrectCodes,
      missing_reason_codes: missedCodes,
      remarks: body.remarks?.trim() ? body.remarks.trim() : null,
      reviewed_by: actor.userId,
      reviewed_at: reviewedAt,
    })
    .eq("id", id);

  if (error) return { ok: false, reason: "action_failed", message: error.message };

  const contentHidden = await applyToContent(row, rejected ? "rejected" : "approved", rejectionCode);

  const audited = await writeAuditLog({
    action: rejected ? "ai_decision.reject" : "ai_decision.approve",
    actorId: actor.userId,
    actorEmail: actor.email,
    actorRole: actor.role,
    targetType: "ai_decision",
    targetId: id,
    reason:
      body.remarks?.trim() ||
      `Moderator says the AI was ${body.aiWasRight ? "right" : "wrong"}`,
    metadata: {
      aiDecision: row.decision,
      aiWasRight: body.aiWasRight,
      wrongReason: body.wrongReason,
      aiGenerated: row.ai_generated,
      isAiGenerated: body.isAiGenerated,
      finalDecision,
      finalRejectionCode: rejectionCode,
      contentHidden,
      petId: row.pet_id,
    },
  });

  if (!audited.ok) {
    return {
      ok: false,
      reason: "unaudited",
      message: "The decision was recorded but the audit log write failed.",
    };
  }

  return { ok: true, finalDecision, contentHidden };
}
