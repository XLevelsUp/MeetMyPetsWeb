import { z } from "zod";

import { listQuerySchema, paginated, reasonSchema } from "@/lib/contract-shared";
import { TRUST_STATUSES } from "@/lib/trust-constants";

/**
 * Typed contract for the trust review queue.
 *
 * ⚠️ THESE PAYLOADS CARRY THE RAW TRUST SCORE, which the mobile app is
 * deliberately never shown. The app team enforce that with a test scanning
 * their Flutter source for `trust_score`, `trustScore` and even the string
 * "Trust Score" — their reasoning being that telling someone how far they are
 * from a ban "turns a moderation signal into a budget". Showing it to an
 * admin is the point of this screen; it must not leak anywhere else. Gated by
 * `requireRole`, `force-dynamic`, never cached.
 */

/** One row of `pets.trust_score_events` — the evidence behind a score. */
export const trustEventSchema = z.object({
  id: z.string(),
  reason: z.string(),
  delta: z.number().int(),
  actorPetId: z.string().nullable(),
  actorPetName: z.string().nullable(),
  createdAt: z.string(),
});
export type TrustEvent = z.infer<typeof trustEventSchema>;

export const trustQueueEntrySchema = z.object({
  petId: z.string(),
  petName: z.string().nullable(),
  petStatus: z.string().nullable(),
  score: z.number().int(),
  status: z.enum(TRUST_STATUSES),

  ownerAccountId: z.string().nullable(),
  ownerEmail: z.string().nullable(),

  /**
   * The date the owner was told to come back. Informational in the database —
   * `get_pet_trust_status` never reads it — so it is a promise to a user, not a
   * mechanism. Sorting the queue by it is what turns it into one.
   */
  banStartedAt: z.string().nullable(),
  reviewDueAt: z.string().nullable(),
  /** Past its stated review date and still banned. */
  reviewOverdue: z.boolean(),

  /**
   * True when the owner has already dismissed the warning dialog. Only
   * `get_pet_trust_status` still reports `warning` in that case; the app's
   * `my_pet_trust_status` reports `normal`, by design.
   */
  warningAcknowledged: z.boolean(),

  /** Reports filed against this pet — the usual reason a score fell. */
  reportCount: z.number().int().min(0),
});
export type TrustQueueEntry = z.infer<typeof trustQueueEntrySchema>;

export const trustQueueResponseSchema = paginated(trustQueueEntrySchema);
export type TrustQueueResponse = z.infer<typeof trustQueueResponseSchema>;

/** Per-pet ledger, fetched on demand when a reviewer opens an entry. */
export const trustLedgerResponseSchema = z.object({
  petId: z.string(),
  score: z.number().int(),
  events: z.array(trustEventSchema),
});
export type TrustLedgerResponse = z.infer<typeof trustLedgerResponseSchema>;

/* -------------------------------------------------------------------------
 * Filters
 * ---------------------------------------------------------------------- */

export const TRUST_STATUS_FILTERS = ["all", ...TRUST_STATUSES] as const;

/**
 * Defaults to `all` rather than a single band: a reviewer wants the whole
 * non-normal population in review-date order, and the bands are few enough
 * that splitting them by default would hide work.
 */
export const trustQuerySchema = listQuerySchema.extend({
  status: z.enum(TRUST_STATUS_FILTERS).catch("all"),
  /** Only entries past their stated review date. */
  overdueOnly: z
    .union([z.boolean(), z.string()])
    .transform((v) => v === true || v === "true")
    .catch(false),
});
export type TrustQuery = z.infer<typeof trustQuerySchema>;

/* -------------------------------------------------------------------------
 * Restore
 * ---------------------------------------------------------------------- */

/**
 * The only write. There is no partial restoration and therefore no score
 * parameter — the value is fixed at 555 by their trigger's equality test, so
 * accepting one from the client would imply a choice that does not exist.
 */
export const restoreTrustSchema = z.object({ reason: reasonSchema });
export type RestoreTrustRequest = z.infer<typeof restoreTrustSchema>;

/** `{ ok: true }` — the client refetches rather than trusting a returned row. */
export const trustActionResponseSchema = z.object({ ok: z.literal(true) });
