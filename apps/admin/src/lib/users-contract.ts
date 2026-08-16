import { z } from "zod";

import { listQuerySchema, paginated, reasonSchema } from "@/lib/contract-shared";

/**
 * Typed contract for the Users & Pets moderation API.
 *
 * ⚠️ PRIVACY — these payloads DELIBERATELY carry PII (email, phone, city).
 * That is the opposite of `api-contract.ts`, whose aggregates-only rule still
 * stands for analytics. Moderation cannot work without identifying the person
 * being moderated, so instead of hiding the data these endpoints are:
 *   - gated by `requireRole(...USERS_VIEW_ROLES)` in the route,
 *   - `force-dynamic` and never cached,
 *   - narrow: only the columns the tables and detail view actually render.
 * Do not add columns here "just in case" — every field added is PII shown to
 * every admin role. Latitude/longitude are deliberately NOT exposed.
 */

/** Moderation state. `kind` mirrors public.admin_restrictions.kind. */
export const RESTRICTION_KINDS = ["suspended", "banned", "flagged"] as const;
export type RestrictionKind = (typeof RESTRICTION_KINDS)[number];

export const restrictionSchema = z.object({
  kind: z.enum(RESTRICTION_KINDS),
  reason: z.string(),
  createdAt: z.string(),
  /** Null for bans and flags, which have no scheduled expiry. */
  expiresAt: z.string().nullable(),
  liftedAt: z.string().nullable(),
});
export type Restriction = z.infer<typeof restrictionSchema>;

export const accountSummarySchema = z.object({
  id: z.string(),
  email: z.string().nullable(),
  phone: z.string().nullable(),
  displayName: z.string().nullable(),
  /** The backend's own lifecycle value: "active" | "archived". */
  status: z.string().nullable(),
  createdAt: z.string().nullable(),
  /**
   * ⚠️ Null for every account — nothing writes this column (verified
   * 2026-08-16, 0 of 41). Kept because the detail view renders it and the app
   * team may yet populate it; do NOT build a list column or a sort on it.
   * `lastLoginAt` is the one with data.
   */
  lastActivityAt: z.string().nullable(),
  lastLoginAt: z.string().nullable(),
  petCount: z.number().int().min(0),
  /** Highest-precedence active restriction, or null. */
  restriction: restrictionSchema.nullable(),
});
export type AccountSummary = z.infer<typeof accountSummarySchema>;

export const petSummarySchema = z.object({
  id: z.string(),
  name: z.string().nullable(),
  species: z.string().nullable(),
  breed: z.string().nullable(),
  status: z.string().nullable(),
  ownerAccountId: z.string().nullable(),
  createdAt: z.string().nullable(),
  photoUrl: z.string().nullable(),
  restriction: restrictionSchema.nullable(),
  /**
   * The app backend's automated moderation signal. Read-only here — the panel
   * never writes it (see lib/trust.ts). Null only if the column is somehow
   * absent; the band is derived with `trustStatusFor`, never re-thresholded.
   */
  trustScore: z.number().int().nullable(),
  /** Set while an automated 7-day ban window is open. */
  trustBannedUntil: z.string().nullable(),
});
export type PetSummary = z.infer<typeof petSummarySchema>;

export const accountProfileSchema = z.object({
  name: z.string().nullable(),
  bio: z.string().nullable(),
  city: z.string().nullable(),
  state: z.string().nullable(),
  country: z.string().nullable(),
  gender: z.string().nullable(),
  avatarUrl: z.string().nullable(),
});

export const accountVerificationSchema = z.object({
  id: z.string(),
  type: z.string().nullable(),
  status: z.string().nullable(),
  createdAt: z.string().nullable(),
  verifiedAt: z.string().nullable(),
});

export const accountDetailSchema = accountSummarySchema.extend({
  emailVerified: z.boolean().nullable(),
  phoneVerified: z.boolean().nullable(),
  lastLoginAt: z.string().nullable(),
  deletedAt: z.string().nullable(),
  profile: accountProfileSchema.nullable(),
  pets: z.array(petSummarySchema),
  /** Full history, newest first — includes lifted rows. */
  restrictions: z.array(restrictionSchema),
  verifications: z.array(accountVerificationSchema),
});
export type AccountDetail = z.infer<typeof accountDetailSchema>;

export const accountsResponseSchema = paginated(accountSummarySchema);
export type AccountsResponse = z.infer<typeof accountsResponseSchema>;

export const petsResponseSchema = paginated(petSummarySchema);
export type PetsResponse = z.infer<typeof petsResponseSchema>;

/* -------------------------------------------------------------------------
 * Actions
 * ---------------------------------------------------------------------- */

export const ACCOUNT_ACTIONS = ["suspend", "ban", "restore"] as const;
export type AccountAction = (typeof ACCOUNT_ACTIONS)[number];

export const PET_ACTIONS = ["flag", "unflag"] as const;
export type PetAction = (typeof PET_ACTIONS)[number];

/** Preset suspension lengths offered in the dialog. */
export const SUSPEND_DURATIONS_HOURS = [24, 72, 168, 720] as const;

export const accountActionSchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("suspend"),
    reason: reasonSchema,
    durationHours: z.coerce.number().int().min(1).max(8760),
  }),
  z.object({ action: z.literal("ban"), reason: reasonSchema }),
  z.object({ action: z.literal("restore"), reason: reasonSchema }),
]);
export type AccountActionRequest = z.infer<typeof accountActionSchema>;

export const petActionSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("flag"), reason: reasonSchema }),
  z.object({ action: z.literal("unflag"), reason: reasonSchema }),
]);
export type PetActionRequest = z.infer<typeof petActionSchema>;

/** `{ ok: true }` — the client refetches rather than trusting a returned row. */
export const actionResponseSchema = z.object({ ok: z.literal(true) });

/* -------------------------------------------------------------------------
 * List queries
 * ---------------------------------------------------------------------- */

/**
 * "active"/"archived" filter the backend's own column; "suspended"/"banned"
 * filter our restrictions table (a separate query — PostgREST cannot join
 * across schemas).
 */
export const ACCOUNT_STATUS_FILTERS = ["all", "active", "archived", "suspended", "banned"] as const;
export const PET_STATUS_FILTERS = ["all", "active", "archived", "flagged"] as const;

/** Yes/no/either, for the boolean-ish filters. */
export const TRISTATE = ["all", "yes", "no"] as const;
export type Tristate = (typeof TRISTATE)[number];

/**
 * Sort keys.
 *
 * All but `pet_count` map to a real column and become a PostgREST `.order()`.
 * `pet_count` is COMPUTED — the adapter resolves it before the page query
 * rather than reordering the fetched page, which would sort within the page
 * only and silently lie across a page boundary. See `listAccounts`.
 *
 * `last_activity_at` is deliberately absent: nothing writes it.
 */
export const ACCOUNT_SORTS = [
  "created_at",
  "display_name",
  "email",
  "last_login_at",
  "pet_count",
] as const;
export type AccountSort = (typeof ACCOUNT_SORTS)[number];

export const PET_SORTS = ["created_at", "name", "trust_score"] as const;
export type PetSort = (typeof PET_SORTS)[number];

export const SORT_DIRECTIONS = ["asc", "desc"] as const;

/** `all` = every pet; `at_risk` = anything the trust ladder does not call normal. */
export const PET_TRUST_FILTERS = ["all", "at_risk", "normal"] as const;

/** YYYY-MM-DD, inclusive. Mirrors the audit log's date filters. */
const dateFilter = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .optional()
  .catch(undefined);

export const accountsQuerySchema = listQuerySchema.extend({
  status: z.enum(ACCOUNT_STATUS_FILTERS).catch("all"),
  sort: z.enum(ACCOUNT_SORTS).catch("created_at"),
  dir: z.enum(SORT_DIRECTIONS).catch("desc"),
  emailVerified: z.enum(TRISTATE).catch("all"),
  hasPhone: z.enum(TRISTATE).catch("all"),
  hasPets: z.enum(TRISTATE).catch("all"),
  joinedFrom: dateFilter,
  joinedTo: dateFilter,
});
export type AccountsQuery = z.infer<typeof accountsQuerySchema>;

export const petsQuerySchema = listQuerySchema.extend({
  status: z.enum(PET_STATUS_FILTERS).catch("all"),
  sort: z.enum(PET_SORTS).catch("created_at"),
  dir: z.enum(SORT_DIRECTIONS).catch("desc"),
  /** A species id, or "all". Not `.uuid()` — a stale id degrades to "all". */
  speciesId: z.string().catch("all"),
  trust: z.enum(PET_TRUST_FILTERS).catch("all"),
});
export type PetsQuery = z.infer<typeof petsQuerySchema>;

/**
 * What an empty query string means — the unfiltered default view.
 *
 * Callers spread these instead of listing every field. Every member of both
 * schemas carries a `.catch()`, so parsing `{}` yields exactly the fallbacks
 * declared above; deriving them here means adding a filter cannot silently
 * leave a caller behind, and the client and the server agree on "no filters"
 * by construction rather than by two hand-written literals.
 */
export const DEFAULT_ACCOUNTS_QUERY: AccountsQuery = accountsQuerySchema.parse({});
export const DEFAULT_PETS_QUERY: PetsQuery = petsQuerySchema.parse({});

/**
 * Species for the pets filter: id and name, nothing else.
 *
 * A separate, tiny endpoint rather than reusing the taxonomy list, which is
 * gated to SETTINGS_ROLES — a moderator would get a 403 and the filter would
 * silently stay empty. Species names are anon-readable reference data the
 * mobile app already fetches, so there is nothing to protect here.
 */
export const speciesOptionSchema = z.object({ id: z.string(), name: z.string() });
export const speciesOptionsResponseSchema = z.object({
  items: z.array(speciesOptionSchema),
});
export type SpeciesOption = z.infer<typeof speciesOptionSchema>;

/* -------------------------------------------------------------------------
 * URL round-trip
 *
 * Both directions are derived from the schema's own keys. The route handler
 * and the client hook previously hand-listed the params each cared about,
 * which meant a new filter had to be added in three places — and if one was
 * missed, the filter was silently dropped on the way to the database instead
 * of failing. These walk `shape`, so declaring a field wires it end to end.
 * ---------------------------------------------------------------------- */

type QueryShape = typeof accountsQuerySchema | typeof petsQuerySchema;

/** Reads only the keys the schema declares; everything else is parsed away. */
export function searchParamsToQuery<S extends QueryShape>(
  schema: S,
  params: URLSearchParams,
): z.infer<S> {
  const input: Record<string, string> = {};
  for (const key of Object.keys(schema.shape)) {
    const value = params.get(key);
    // An empty param means "not set" — `?q=` should not search for "".
    if (value !== null && value !== "") input[key] = value;
  }
  return schema.parse(input) as z.infer<S>;
}

/**
 * The inverse. Pass `defaults` to leave unchanged values out — what the address
 * bar wants (`/users` rather than `/users?dir=desc&trust=all&…`). Omit it for a
 * fetch URL, where being explicit costs nothing.
 */
export function queryToSearchParams(
  query: Record<string, unknown>,
  defaults?: Record<string, unknown>,
): URLSearchParams {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value === undefined || value === null || value === "") continue;
    if (defaults && defaults[key] === value) continue;
    params.set(key, String(value));
  }
  return params;
}
