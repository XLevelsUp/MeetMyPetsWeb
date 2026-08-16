/**
 * The certificate review vocabulary for `pets.pet_certificates`.
 *
 * Its own module rather than living in `lib/verifications.ts` for the same
 * reason `lib/report-constants.ts` exists: the adapter is `server-only`, but
 * the filter dropdowns are client components.
 *
 * ⚠️ UNLIKE `report-constants.ts`, THESE ARE NOT BACKED BY A CHECK CONSTRAINT.
 * `pet_certificates.status` is a bare `varchar` with no constraint at all. The
 * value `'approved'` is read off the backend's own trigger —
 * `trust_on_certificate_verified` fires `IF NEW.status = 'approved'` — and
 * `'rejected'` is inferred by symmetry, since no row has ever been reviewed
 * (all 15 are `pending` as of 2026-08-15).
 *
 * Note this CONFLICTS with the `pending`/`verified`/`rejected` vocabulary the
 * app team proposed for `identity.account_verifications`. Writing `'verified'`
 * here would silently fail to award trust, because the trigger tests for
 * `'approved'`. Raised with them (app-team-handoff.md §3.4); until they add the
 * constraint, this file is the contract.
 */

export const CERTIFICATE_STATUSES = ["pending", "approved", "rejected"] as const;
export type CertificateStatus = (typeof CERTIFICATE_STATUSES)[number];

/** What a moderator can move a certificate to; `pending` is the inbox. */
export const CERTIFICATE_DECISIONS = ["approve", "reject"] as const;
export type CertificateDecision = (typeof CERTIFICATE_DECISIONS)[number];

/** Live values in `certificate_type` (verified 2026-08-15): all three are in use. */
export const CERTIFICATE_TYPES = ["vaccination", "health", "license"] as const;
export type CertificateType = (typeof CERTIFICATE_TYPES)[number];

/**
 * Structured rejection reasons for the dropdown. Ours, not the backend's —
 * they are recorded in `remarks` and in the audit row, so the owner and a later
 * reviewer both get a specific cause rather than "rejected".
 */
export const REJECTION_REASONS = [
  "illegible",
  "expired",
  "wrong_pet",
  "wrong_document_type",
  "incomplete",
  "suspected_forgery",
  "other",
] as const;
export type RejectionReason = (typeof REJECTION_REASONS)[number];

/**
 * Trust awarded by the backend when a certificate is approved
 * (`pets.trust_score_delta('certificate_verified')`). Duplicated here ONLY to
 * warn the moderator in the confirmation dialog — the panel never applies it,
 * their trigger does. Verified live: approving moved a pet 575 → 1075.
 */
export const CERTIFICATE_APPROVAL_TRUST_DELTA = 500;
