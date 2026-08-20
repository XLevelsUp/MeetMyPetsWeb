import { z } from "zod";

import { listQuerySchema, paginated, reasonSchema } from "@/lib/contract-shared";
import {
  TAXONOMY_DESCRIPTION_MAX,
  TAXONOMY_NAME_MAX,
  TAXONOMY_STATUSES,
} from "@/lib/taxonomy-constants";

/**
 * Typed contract for species / breed taxonomy management.
 *
 * No PII here — this is platform reference data, not user content. The reason
 * it is nonetheless the most tightly gated surface in the panel
 * (`SETTINGS_ROLES` = super_admin only) is blast radius: the mobile app reads
 * these tables live, so a bad edit reaches pet creation immediately.
 */

const nameSchema = z
  .string()
  .trim()
  .min(1, "Give it a name.")
  .max(TAXONOMY_NAME_MAX, `Keep the name under ${TAXONOMY_NAME_MAX} characters.`);

const descriptionSchema = z
  .string()
  .trim()
  .max(TAXONOMY_DESCRIPTION_MAX)
  .optional()
  .transform((value) => (value?.length ? value : null))
  .nullable();

export const speciesSummarySchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().nullable(),
  status: z.string(),
  createdAt: z.string().nullable(),
  updatedAt: z.string().nullable(),
  /** Why a species can't simply be retired — surfaced in the UI, not hidden. */
  breedCount: z.number().int().min(0),
  activePetCount: z.number().int().min(0),
});
export type SpeciesSummary = z.infer<typeof speciesSummarySchema>;

export const breedSummarySchema = z.object({
  id: z.string(),
  speciesId: z.string(),
  speciesName: z.string().nullable(),
  name: z.string(),
  description: z.string().nullable(),
  status: z.string(),
  createdAt: z.string().nullable(),
  activePetCount: z.number().int().min(0),
});
export type BreedSummary = z.infer<typeof breedSummarySchema>;

export const speciesResponseSchema = paginated(speciesSummarySchema);
export type SpeciesResponse = z.infer<typeof speciesResponseSchema>;

export const breedsResponseSchema = paginated(breedSummarySchema);
export type BreedsResponse = z.infer<typeof breedsResponseSchema>;

/* -------------------------------------------------------------------------
 * Filters
 * ---------------------------------------------------------------------- */

export const TAXONOMY_STATUS_FILTERS = ["all", ...TAXONOMY_STATUSES] as const;

/**
 * Defaults to `all`, unlike the moderation queues. This is a configuration
 * screen, not a work queue — hiding retired rows by default would make an
 * admin wonder where a species went.
 */
export const speciesQuerySchema = listQuerySchema.extend({
  status: z.enum(TAXONOMY_STATUS_FILTERS).catch("all"),
});
export type SpeciesQuery = z.infer<typeof speciesQuerySchema>;

export const breedsQuerySchema = listQuerySchema.extend({
  status: z.enum(TAXONOMY_STATUS_FILTERS).catch("all"),
  /** A species id, or "all". Not `.uuid()` — a stale id degrades to "all". */
  speciesId: z.string().catch("all"),
});
export type BreedsQuery = z.infer<typeof breedsQuerySchema>;

/* -------------------------------------------------------------------------
 * Mutations
 *
 * Create and update are separate schemas rather than one partial: a create
 * must name the thing, whereas an update may only be flipping status, and
 * collapsing them would make `name` optional on the path that needs it most.
 * ---------------------------------------------------------------------- */

export const createSpeciesSchema = z.object({
  name: nameSchema,
  description: descriptionSchema,
});
export type CreateSpeciesRequest = z.infer<typeof createSpeciesSchema>;

export const updateSpeciesSchema = z.object({
  name: nameSchema.optional(),
  description: descriptionSchema,
  status: z.enum(TAXONOMY_STATUSES).optional(),
});
export type UpdateSpeciesRequest = z.infer<typeof updateSpeciesSchema>;

export const createBreedSchema = z.object({
  /**
   * ⚠️ `z.guid()`, NOT `z.uuid()` — do not "modernise" this back.
   *
   * The app team's species ids are sequential placeholders
   * (`00000000-0000-0000-0000-000000000001` = Dog) whose version and variant
   * nibbles are both `0`. That is not a conforming RFC 9562 UUID, and zod v4
   * tightened `.uuid()` to enforce the spec — so `.uuid()` rejects **every
   * species that exists**, and the breed form fails with "Pick a species."
   * while showing a perfectly populated dropdown. Verified against zod 4.4.3.
   *
   * `z.guid()` is zod's deliberately lenient 8-4-4-4-12 check, which is the
   * right validator for ids owned by someone else's system: we still reject
   * junk, without asserting a spec their data does not follow.
   */
  speciesId: z.guid("Pick a species."),
  name: nameSchema,
  description: descriptionSchema,
});
export type CreateBreedRequest = z.infer<typeof createBreedSchema>;

/**
 * `speciesId` is deliberately absent: moving a breed between species would
 * silently re-parent every pet that uses it. If that is ever wanted it should
 * be its own explicit, separately-audited action.
 */
export const updateBreedSchema = z.object({
  name: nameSchema.optional(),
  description: descriptionSchema,
  status: z.enum(TAXONOMY_STATUSES).optional(),
});
export type UpdateBreedRequest = z.infer<typeof updateBreedSchema>;

/**
 * Request bodies — the mutation payload plus the mandatory audit reason.
 *
 * Defined here rather than assembled in each route so the routes stay free of
 * schema-building and the reason requirement can't be forgotten on one of them.
 */
export const createSpeciesBodySchema = createSpeciesSchema.extend({ reason: reasonSchema });
export const updateSpeciesBodySchema = updateSpeciesSchema.extend({ reason: reasonSchema });
export const createBreedBodySchema = createBreedSchema.extend({ reason: reasonSchema });
export const updateBreedBodySchema = updateBreedSchema.extend({ reason: reasonSchema });

/** `{ ok: true }` — the client refetches rather than trusting a returned row. */
export const taxonomyActionResponseSchema = z.object({ ok: z.literal(true) });
