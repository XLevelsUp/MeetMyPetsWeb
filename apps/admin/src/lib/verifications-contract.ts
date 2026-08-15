import { z } from "zod";

import { listQuerySchema, paginated, reasonSchema } from "@/lib/contract-shared";
import {
  CERTIFICATE_DECISIONS,
  CERTIFICATE_STATUSES,
  CERTIFICATE_TYPES,
  REJECTION_REASONS,
} from "@/lib/certificate-constants";

/**
 * Typed contract for the certificate verification queue over
 * `pets.pet_certificates`.
 *
 * ⚠️ PRIVACY — these payloads carry the owner's email and the details they
 * typed off a veterinary document (vet name, clinic, certificate number).
 * Reviewing is impossible without them. Gated by
 * `requireRole(...VERIFICATION_ROLES)`, `force-dynamic`, never cached.
 *
 * The document itself is NOT in this payload — only `hasDocument`. Its URL is
 * minted per-item on demand (see `lib/storage.ts`), because a short-lived URL
 * embedded in a list response expires before a reviewer reaches it.
 */

/**
 * What the owner typed at upload. Every field is nullable and sparsely
 * populated in practice (7–15 of 15 rows depending on the field), which is
 * exactly what the reviewer is checking against the document.
 *
 * These are NOT OCR extractions and carry no confidence scores — no such data
 * exists in this database (verified 2026-08-15). This review is a human
 * transcription check.
 */
export const certificateClaimsSchema = z.object({
  title: z.string().nullable(),
  certificateNumber: z.string().nullable(),
  issuedBy: z.string().nullable(),
  issuedAt: z.string().nullable(),
  expiresAt: z.string().nullable(),
  nextDueAt: z.string().nullable(),
  veterinarian: z.string().nullable(),
  clinicName: z.string().nullable(),
  notes: z.string().nullable(),
});
export type CertificateClaims = z.infer<typeof certificateClaimsSchema>;

/**
 * The pet's current verification badge — READ ONLY. No trigger maintains this
 * table and its existing data contradicts any obvious level rule, so the panel
 * displays it and never writes it (see the migration 20260815000001 header).
 */
export const verificationLevelSchema = z.object({
  level: z.number().int().nullable(),
  levelCode: z.string().nullable(),
  ownershipVerified: z.boolean().nullable(),
  vaccinationVerified: z.boolean().nullable(),
  healthVerified: z.boolean().nullable(),
  breedingVerified: z.boolean().nullable(),
});
export type VerificationLevel = z.infer<typeof verificationLevelSchema>;

export const certificateSummarySchema = z.object({
  id: z.string(),
  status: z.enum(CERTIFICATE_STATUSES),
  certificateType: z.string(),
  createdAt: z.string().nullable(),

  petId: z.string(),
  petName: z.string().nullable(),
  ownerAccountId: z.string().nullable(),
  ownerEmail: z.string().nullable(),

  claims: certificateClaimsSchema,
  /** Null when the pet has no row in pet_verification_levels. */
  level: verificationLevelSchema.nullable(),

  /** False when `file_path` is empty — the queue still lists it, flagged. */
  hasDocument: z.boolean(),
  mimeType: z.string().nullable(),

  /** Review outcome, populated once decided. */
  reviewedAt: z.string().nullable(),
  remarks: z.string().nullable(),
});
export type CertificateSummary = z.infer<typeof certificateSummarySchema>;

export const certificatesResponseSchema = paginated(certificateSummarySchema);
export type CertificatesResponse = z.infer<typeof certificatesResponseSchema>;

/* -------------------------------------------------------------------------
 * Document URL
 * ---------------------------------------------------------------------- */

export const signedDocumentSchema = z.object({
  url: z.string(),
  mimeType: z.string().nullable(),
  expiresInSeconds: z.number().int().positive(),
});
export type SignedDocumentResponse = z.infer<typeof signedDocumentSchema>;

/* -------------------------------------------------------------------------
 * Filters
 * ---------------------------------------------------------------------- */

export const CERTIFICATE_STATUS_FILTERS = ["all", ...CERTIFICATE_STATUSES] as const;
export const CERTIFICATE_TYPE_FILTERS = ["all", ...CERTIFICATE_TYPES] as const;

/**
 * Defaults to `pending` — this screen is a work queue, so opening it should
 * show the work. Each `.catch()`-defaults so a stale URL degrades rather than
 * 400-ing an admin out of the page.
 */
export const certificatesQuerySchema = listQuerySchema.extend({
  status: z.enum(CERTIFICATE_STATUS_FILTERS).catch("pending"),
  certificateType: z.enum(CERTIFICATE_TYPE_FILTERS).catch("all"),
});
export type CertificatesQuery = z.infer<typeof certificatesQuerySchema>;

/* -------------------------------------------------------------------------
 * Decision
 * ---------------------------------------------------------------------- */

/**
 * ⚠️ `approve` writes `status = 'approved'`, which fires the backend's
 * `trust_on_certificate_verified` trigger and awards +500 trust to the pet.
 * That is their designed consequence of approval, verified live. The UI states
 * it in words before a moderator confirms.
 *
 * `rejectionReason` is required for a rejection and forbidden on an approval —
 * a discriminated union rather than an optional field, so "approved because
 * illegible" is unrepresentable.
 */
export const decideCertificateSchema = z.discriminatedUnion("decision", [
  z.object({ decision: z.literal("approve"), reason: reasonSchema }),
  z.object({
    decision: z.literal("reject"),
    reason: reasonSchema,
    rejectionReason: z.enum(REJECTION_REASONS),
  }),
]);
export type DecideCertificateRequest = z.infer<typeof decideCertificateSchema>;

export { CERTIFICATE_DECISIONS };

/** `{ ok: true }` — the client refetches rather than trusting a returned row. */
export const certificateActionResponseSchema = z.object({ ok: z.literal(true) });
