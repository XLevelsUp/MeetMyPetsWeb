/**
 * The taxonomy vocabulary for `pets.species` and `pets.breeds`.
 *
 * Its own module rather than living in `lib/taxonomy.ts` for the same reason
 * `report-constants.ts` and `certificate-constants.ts` exist: the adapter is
 * `server-only`, but the filter dropdowns are client components.
 *
 * ⚠️ `'inactive'` IS A PROPOSED VALUE, NOT AN OBSERVED ONE. `status` on both
 * tables is a bare `varchar` with no CHECK constraint, and **every live row is
 * `'active'`** (verified 2026-08-16) — so nothing in the database or the data
 * tells us what the retired value should be. We picked the obvious antonym.
 *
 * ⚠️ AND THE MOBILE APP MAY NOT FILTER ON IT. The app reads
 * `/rest/v1/species` and `/rest/v1/breeds` directly; we have not confirmed that
 * it applies `status = 'active'`. If it doesn't, deactivating a species hides
 * it from this panel and changes nothing in the app. Both points are open asks
 * in docs/admin/taxonomy-schema-proposal.md — until they are answered, treat
 * deactivation as "flagged for retirement", not as an enforced control.
 */

export const TAXONOMY_STATUSES = ["active", "inactive"] as const;
export type TaxonomyStatus = (typeof TAXONOMY_STATUSES)[number];

/**
 * Matches the `char_length(...) <= 128` convention the backend uses on every
 * other name column in the `pets` schema (`pets.name`, `certificate_type`,
 * `veterinarian`, …). `species.name`/`breeds.name` carry no such constraint,
 * so this is the panel holding the line rather than the database.
 */
export const TAXONOMY_NAME_MAX = 128;
export const TAXONOMY_DESCRIPTION_MAX = 500;
