/**
 * The report vocabulary — mirrors the CHECK constraints on the backend's
 * `matching.pet_reports` table (verified live 2026-08-15).
 *
 * Its own module rather than living in `lib/reports.ts` for the same reason
 * `lib/audit-actions.ts` exists: the adapter is `server-only`, but the filter
 * dropdowns are client components and need these lists.
 *
 * ⚠️ These are NOT ours to extend. They are enforced by CHECK constraints in a
 * table owned by the mobile/FastAPI team — adding a value here without a
 * matching backend migration produces a runtime constraint violation, not a
 * type error. Adding one requires a matching label in `copy.reports`.
 */

/**
 * Status vocabulary, in queue order.
 *
 * `pending` is the open queue. Our reading of the other three — confirmed as an
 * open question with the app team (docs/admin/app-team-handoff.md §3.2):
 *   reviewed  — a human looked; the report was legitimate but needs no action
 *   actioned  — the report was acted on (the pet was flagged, the owner banned)
 *   dismissed — not a legitimate report
 */
export const REPORT_STATUSES = ["pending", "reviewed", "actioned", "dismissed"] as const;
export type ReportStatus = (typeof REPORT_STATUSES)[number];

/** The three a moderator can move a report *to*; `pending` is the inbox. */
export const REPORT_RESOLUTIONS = ["reviewed", "actioned", "dismissed"] as const;
export type ReportResolution = (typeof REPORT_RESOLUTIONS)[number];

export const REPORT_REASONS = [
  "spam",
  "harassment",
  "inappropriate_content",
  "fake_profile",
  "animal_welfare",
  "scam",
  "other",
] as const;
export type ReportReason = (typeof REPORT_REASONS)[number];

/**
 * What a report is about. A row with no context reports the PET PROFILE; one
 * carrying `context_entity_type = 'post'` reports a single post (the backend's
 * table comment, and the `pet_reports_context_pair` constraint, which requires
 * the type/id pair to be both-null or both-set).
 */
export const REPORT_SCOPES = ["profile", "post"] as const;
export type ReportScope = (typeof REPORT_SCOPES)[number];
