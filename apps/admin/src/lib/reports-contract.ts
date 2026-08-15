import { z } from "zod";

import { listQuerySchema, paginated, reasonSchema } from "@/lib/contract-shared";
import {
  REPORT_REASONS,
  REPORT_RESOLUTIONS,
  REPORT_SCOPES,
  REPORT_STATUSES,
} from "@/lib/report-constants";

/**
 * Typed contract for the moderation report queue over the backend's
 * `matching.pet_reports`.
 *
 * ⚠️ PRIVACY — like `users-contract.ts`, these payloads carry PII: the free
 * text a reporter wrote, and the email of the reported pet's owner. Triage is
 * impossible without knowing who is involved. Gated by
 * `requireRole(...REPORTS_ROLES)`, `force-dynamic`, never cached. The
 * *reporter's* email is deliberately NOT exposed — a moderator needs to know
 * which pet filed a report, not how to contact its owner.
 */

/** The reported post, when `scope` is "post". Null if it was deleted since. */
export const reportedPostSchema = z.object({
  id: z.string(),
  caption: z.string().nullable(),
  createdAt: z.string().nullable(),
  deletedAt: z.string().nullable(),
});

/**
 * The backend's automated trust signal for the reported pet — read-only
 * context so a moderator can see that a pet is already sinking before they
 * decide. `status` is derived here with the same thresholds as
 * `pets.get_pet_trust_status` (schema-notes.md §trust engine).
 */
export const trustSignalSchema = z.object({
  score: z.number().int().nullable(),
  status: z.enum(["permanently_banned", "temporary_banned", "warning", "normal"]).nullable(),
  /** Set while an automated 7-day ban window is open. */
  bannedUntil: z.string().nullable(),
});
export type TrustSignal = z.infer<typeof trustSignalSchema>;

export const reportSummarySchema = z.object({
  id: z.string(),
  status: z.enum(REPORT_STATUSES),
  reason: z.enum(REPORT_REASONS),
  /** Reporter's free text. Null when they filed with no note. */
  details: z.string().nullable(),
  scope: z.enum(REPORT_SCOPES),
  createdAt: z.string(),

  reportedPetId: z.string(),
  reportedPetName: z.string().nullable(),
  reportedOwnerAccountId: z.string().nullable(),
  reportedOwnerEmail: z.string().nullable(),

  /** Which pet filed it — id only; see the privacy note above. */
  reporterPetId: z.string(),
  reporterPetName: z.string().nullable(),

  post: reportedPostSchema.nullable(),
  trust: trustSignalSchema,
  /** Total reports ever filed against this pet, this one included. */
  reportsAgainstPet: z.number().int().min(0),
});
export type ReportSummary = z.infer<typeof reportSummarySchema>;

export const reportsResponseSchema = paginated(reportSummarySchema);
export type ReportsResponse = z.infer<typeof reportsResponseSchema>;

/* -------------------------------------------------------------------------
 * Filters
 * ---------------------------------------------------------------------- */

/**
 * Defaults to `pending` rather than `all`: this screen is a work queue, and
 * opening it should show the work. Each `.catch()`-defaults so a stale URL
 * degrades instead of 400-ing an admin out of the page.
 */
export const REPORT_STATUS_FILTERS = ["all", ...REPORT_STATUSES] as const;
export const REPORT_REASON_FILTERS = ["all", ...REPORT_REASONS] as const;
export const REPORT_SCOPE_FILTERS = ["all", ...REPORT_SCOPES] as const;

export const reportsQuerySchema = listQuerySchema.extend({
  status: z.enum(REPORT_STATUS_FILTERS).catch("pending"),
  reason: z.enum(REPORT_REASON_FILTERS).catch("all"),
  scope: z.enum(REPORT_SCOPE_FILTERS).catch("all"),
});
export type ReportsQuery = z.infer<typeof reportsQuerySchema>;

/* -------------------------------------------------------------------------
 * Resolution
 * ---------------------------------------------------------------------- */

/**
 * The only write the panel makes to `matching.pet_reports`, and the grant is
 * column-scoped to `status` so Postgres rejects anything wider
 * (migration 20260815000000). A reason is mandatory — it goes in the audit log,
 * not into the backend's row.
 */
export const resolveReportSchema = z.object({
  resolution: z.enum(REPORT_RESOLUTIONS),
  reason: reasonSchema,
});
export type ResolveReportRequest = z.infer<typeof resolveReportSchema>;

/** `{ ok: true }` — the client refetches rather than trusting a returned row. */
export const reportActionResponseSchema = z.object({ ok: z.literal(true) });
