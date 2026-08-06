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
  lastActivityAt: z.string().nullable(),
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

export const accountsQuerySchema = listQuerySchema.extend({
  status: z.enum(ACCOUNT_STATUS_FILTERS).catch("all"),
});
export type AccountsQuery = z.infer<typeof accountsQuerySchema>;

export const petsQuerySchema = listQuerySchema.extend({
  status: z.enum(PET_STATUS_FILTERS).catch("all"),
});
export type PetsQuery = z.infer<typeof petsQuerySchema>;
