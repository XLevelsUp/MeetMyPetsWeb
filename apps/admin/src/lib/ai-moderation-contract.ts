import { z } from "zod";

import { listQuerySchema, paginated, SORT_DIRECTIONS } from "@/lib/contract-shared";
import {
  AI_BREED_STATUSES,
  AI_CONTENT_TYPES,
  AI_DECISIONS,
  AI_FINAL_DECISIONS,
  AI_MEDIA_TYPES,
  AI_REJECTION_CODES,
  AI_REVIEW_STATUSES,
} from "@/lib/ai-moderation-constants";

/** Typed contract for the AI moderation queue over `moderation.decisions`. */

/** The six dimension scores, 0-100. Absent when the check never completed. */
export const dimensionScoresSchema = z.record(z.string(), z.number()).nullable();

/** The media under review, resolved to something displayable. */
export const aiMediaSchema = z.object({
  type: z.enum(AI_MEDIA_TYPES),
  contentType: z.enum(AI_CONTENT_TYPES),
  /** Public URL, or null when the row's file is missing from storage. */
  url: z.string().nullable(),
  storagePath: z.string(),
  sizeBytes: z.number().int().nullable(),
  sha256: z.string().nullable(),
});

/** Owner and pet, merged in from `identity` and `pets`. */
export const aiSubjectSchema = z.object({
  accountId: z.string(),
  ownerEmail: z.string().nullable(),
  ownerName: z.string().nullable(),
  /** Null for media that belongs to no pet — a post image, typically. */
  petId: z.string().nullable(),
  petName: z.string().nullable(),
});

/** Breed verification. Recorded only — it never changes moderation status. */
export const aiBreedSchema = z.object({
  status: z.enum(AI_BREED_STATUSES),
  declaredBreedName: z.string().nullable(),
  declaredIsCrossBreed: z.boolean().nullable(),
  matchScore: z.number().nullable(),
  detectedBreedName: z.string().nullable(),
  detectedBreedScore: z.number().nullable(),
});

/** The human's verdict, when one exists. */
export const aiReviewSchema = z.object({
  status: z.enum(AI_REVIEW_STATUSES).nullable(),
  finalDecision: z.enum(AI_FINAL_DECISIONS).nullable(),
  finalRejectionCode: z.enum(AI_REJECTION_CODES).nullable(),
  incorrectReasonCodes: z.array(z.string()),
  missingReasonCodes: z.array(z.string()),
  remarks: z.string().nullable(),
  reviewedById: z.string().nullable(),
  reviewedByEmail: z.string().nullable(),
  reviewedAt: z.string().nullable(),
});

export const aiDecisionSummarySchema = z.object({
  id: z.string(),
  createdAt: z.string(),

  decision: z.enum(AI_DECISIONS),
  rejectionCode: z.enum(AI_REJECTION_CODES).nullable(),
  /** A policy-level reject: not overridable by tuning a threshold. */
  hardReject: z.boolean(),

  petScore: z.number().nullable(),
  compositeScore: z.number().nullable(),
  dimensionScores: dimensionScoresSchema,

  /** Only surfaced when true — a synthetic image must not hide in a list. */
  aiGenerated: z.boolean().nullable(),
  aiScore: z.number().nullable(),

  reasonCodes: z.array(z.string()),
  flags: z.array(z.string()),
  speciesDetected: z.array(z.string()),
  detectedObjects: z.unknown().nullable(),

  processingMs: z.number().int(),
  modelVersion: z.string(),

  media: aiMediaSchema,
  subject: aiSubjectSchema,
  breed: aiBreedSchema,
  review: aiReviewSchema,
});
export type AiDecisionSummary = z.infer<typeof aiDecisionSummarySchema>;

export const aiDecisionsResponseSchema = paginated(aiDecisionSummarySchema);
export type AiDecisionsResponse = z.infer<typeof aiDecisionsResponseSchema>;

/* -------------------------------------------------------------------------
 * Filters
 * ---------------------------------------------------------------------- */

/** `review` is the primary filter, not `decision`. "needs_review" is `review_status = 'pending'` — the work. */
/**
 * One list covering both "who decided" and "what they decided".
 *
 * Splitting them across two dropdowns meant "approved by a moderator" could not
 * be asked for at all — you could filter by reviewed, or by approved, but the
 * pair that a moderator actually wants needed both set correctly.
 */
export const AI_REVIEW_FILTERS = [
  "all",
  "needs_review",
  // The queue split by what the AI thinks, so a moderator can work through its
  // rejections in one pass rather than switching judgement row by row.
  "needs_review_ai_approved",
  "needs_review_ai_rejected",
  "needs_review_ai_unsure",
  "approved_by_moderator",
  "rejected_by_moderator",
  "approved_by_ai",
  "rejected_by_ai",
] as const;
export type AiReviewFilter = (typeof AI_REVIEW_FILTERS)[number];

export const AI_DECISION_FILTERS = ["all", ...AI_DECISIONS] as const;
export const AI_MEDIA_FILTERS = ["all", ...AI_MEDIA_TYPES] as const;
export const AI_CONTENT_FILTERS = ["all", ...AI_CONTENT_TYPES] as const;

/** Sort keys — all real columns on `moderation.decisions`, so each becomes a PostgREST `.order()`. */
export const AI_SORTS = ["created_at", "composite_score", "pet_score", "decision"] as const;
export type AiSort = (typeof AI_SORTS)[number];

/** Defaults to the open queue, newest first. */
export const aiDecisionsQuerySchema = listQuerySchema.extend({
  review: z.enum(AI_REVIEW_FILTERS).catch("needs_review"),
  decision: z.enum(AI_DECISION_FILTERS).catch("all"),
  media: z.enum(AI_MEDIA_FILTERS).catch("all"),
  content: z.enum(AI_CONTENT_FILTERS).catch("all"),
  sort: z.enum(AI_SORTS).catch("created_at"),
  dir: z.enum(SORT_DIRECTIONS).catch("desc"),
});
export type AiDecisionsQuery = z.infer<typeof aiDecisionsQuerySchema>;

/** What an empty query string means — the open queue, newest first. */
export const DEFAULT_AI_QUERY: AiDecisionsQuery = aiDecisionsQuerySchema.parse({});

/* -------------------------------------------------------------------------
 * Resolution
 * ---------------------------------------------------------------------- */

/** The only write the panel makes, and the grant is column-scoped to exactly these eight columns so Postgres rejects anything wider. */
/**
 * The moderator answers one question: was the AI right?
 *
 * The post's outcome is DERIVED from that answer plus what the AI said, never
 * sent by the client — see `outcomeFor`. A client that could post its own
 * outcome could publish something the AI blocked while recording "agreed".
 */
export const resolveAiDecisionSchema = z
  .object({
    /** true = the AI got it right, false = it got it wrong. */
    aiWasRight: z.boolean(),
    /** Why it was wrong; one of the three lists. Required when aiWasRight is false. */
    wrongReason: z.string().max(64).nullable().default(null),
    /** The code the user is told, when the moderator's answer blocks the post. */
    finalRejectionCode: z.enum(AI_REJECTION_CODES).nullable().default(null),
    /** The moderator's verdict; the model's own `ai_generated` stays read-only beside it. */
    isAiGenerated: z.boolean(),
    remarks: z.string().trim().max(1000).optional(),
  })
  .refine((v) => v.aiWasRight || v.wrongReason !== null, {
    message: "Say why the AI was wrong.",
    path: ["wrongReason"],
  })
  .refine((v) => v.wrongReason !== "other" || Boolean(v.remarks?.trim()), {
    message: "A note is required when the reason is Other.",
    path: ["remarks"],
  });
export type ResolveAiDecisionRequest = z.infer<typeof resolveAiDecisionSchema>;

/**
 * What happens to the post, from the AI's verdict and the moderator's answer.
 *
 * `HUMAN_REVIEW` means the AI raised a concern without committing, so agreeing
 * with it BLOCKS — the concern was real. Confirmed with the product owner
 * 2026-11-13; it is the one case where "approve" does not mean "publish".
 */
export function outcomeFor(
  aiDecision: "APPROVED" | "REJECTED" | "HUMAN_REVIEW",
  aiWasRight: boolean,
): "APPROVED" | "REJECTED" {
  const aiLeansBlock = aiDecision === "REJECTED" || aiDecision === "HUMAN_REVIEW";
  if (aiWasRight) return aiLeansBlock ? "REJECTED" : "APPROVED";
  return aiLeansBlock ? "APPROVED" : "REJECTED";
}

/** What the rejection actually did, so the UI states it rather than implying it. */
export const aiActionResponseSchema = z.object({
  ok: z.literal(true),
  /** What the moderator's answer resolved to, so the toast can state it. */
  finalDecision: z.enum(AI_FINAL_DECISIONS),
  /** True when the post's own status was updated. */
  contentHidden: z.boolean(),
});
export type AiActionResponse = z.infer<typeof aiActionResponseSchema>;
