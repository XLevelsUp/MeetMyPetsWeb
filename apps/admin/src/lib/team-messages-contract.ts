import { z } from "zod";

import { reasonSchema } from "@/lib/contract-shared";
import {
  TEAM_AUDIENCES,
  TEAM_BODY_MAX,
  TEAM_LIST_DEFAULT,
  TEAM_LIST_MAX,
  TEAM_MAX_PEOPLE,
  TEAM_MAX_PETS,
  TEAM_MAX_PLACES_PER_LIST,
  TEAM_MAX_RADIUS_KM,
  TEAM_MAX_SPECIES,
  TEAM_REASON_MAX,
  TEAM_STATES,
  WELCOME_BODY_MAX,
  WELCOME_KINDS,
} from "@/lib/team-messages-constants";

// z.guid() not z.uuid(): backend placeholder ids (…0001) are not RFC-conformant — see taxonomy-contract.ts.
const idSchema = z.guid();

const placeListSchema = z.array(z.string().trim().min(1).max(200)).max(TEAM_MAX_PLACES_PER_LIST).optional();

export const placeLocationSchema = z
  .object({ countries: placeListSchema, states: placeListSchema, cities: placeListSchema })
  .refine((v) => Boolean(v.countries?.length || v.states?.length || v.cities?.length), {
    message: "Choose at least one country, state or city.",
  });
export type PlaceLocation = z.infer<typeof placeLocationSchema>;

export const nearbyLocationSchema = z.object({
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
  radiusKm: z.number().gt(0).max(TEAM_MAX_RADIUS_KM),
});
export type NearbyLocation = z.infer<typeof nearbyLocationSchema>;

export const audienceSchema = z.discriminatedUnion("audience", [
  z.object({ audience: z.literal("all") }),
  z.object({ audience: z.literal("no_pet") }),
  z.object({ audience: z.literal("species"), speciesIds: z.array(idSchema).min(1).max(TEAM_MAX_SPECIES) }),
  z.object({ audience: z.literal("pet"), petIds: z.array(idSchema).length(1) }),
  z.object({ audience: z.literal("pets"), petIds: z.array(idSchema).min(1).max(TEAM_MAX_PETS) }),
  z.object({ audience: z.literal("people"), accountIds: z.array(idSchema).min(1).max(TEAM_MAX_PEOPLE) }),
  z.object({ audience: z.literal("place"), location: placeLocationSchema }),
  z.object({ audience: z.literal("nearby"), location: nearbyLocationSchema }),
]);
export type AudienceInput = z.infer<typeof audienceSchema>;

const bodySchema = z.string().refine((v) => v.trim().length > 0, "Write a message before sending.").refine(
  (v) => v.length <= TEAM_BODY_MAX,
  `Keep the message under ${TEAM_BODY_MAX} characters.`,
);

// Must carry a zone: a zoneless time is read in the database's zone and lands hours off.
const sendAtSchema = z.iso.datetime({ offset: true, message: "Pick a date and time." });

export const previewBodySchema = audienceSchema;

export const sendBodySchema = z.intersection(
  audienceSchema,
  z.object({
    body: bodySchema,
    sendAt: sendAtSchema.optional(),
    reason: z.string().trim().max(TEAM_REASON_MAX).optional(),
  }),
);
export type SendRequest = z.infer<typeof sendBodySchema>;

// Edit and delete change what users already see, so they take the panel's mandatory audit reason.
export const messageActionBodySchema = z.discriminatedUnion("action", [
  z
    .object({ action: z.literal("edit"), body: bodySchema.optional(), sendAt: sendAtSchema.optional(), reason: reasonSchema })
    .refine((v) => v.body !== undefined || v.sendAt !== undefined, { message: "Change the text or the time." }),
  z.object({ action: z.literal("delete"), reason: reasonSchema }),
]);
export type MessageActionRequest = z.infer<typeof messageActionBodySchema>;

export const listQuerySchema = z.object({
  state: z.enum(TEAM_STATES).optional().catch(undefined),
  before: z.iso.datetime({ offset: true }).optional().catch(undefined),
  limit: z.coerce.number().int().min(1).transform((n) => Math.min(n, TEAM_LIST_MAX)).catch(TEAM_LIST_DEFAULT),
});
export type TeamListQuery = z.infer<typeof listQuerySchema>;

export const audienceCountsSchema = z.object({
  pets: z.number(),
  accountsWithoutPets: z.number(),
  skippedPets: z.number(),
  skippedPeople: z.number(),
});
export type AudienceCounts = z.infer<typeof audienceCountsSchema>;

export const sendResultSchema = audienceCountsSchema.extend({
  id: z.string(),
  state: z.enum(TEAM_STATES),
  sendAt: z.string().nullable(),
});
export type SendResult = z.infer<typeof sendResultSchema>;

export const actionResultSchema = z.object({ state: z.enum(TEAM_STATES).nullable() });
export type ActionResult = z.infer<typeof actionResultSchema>;

export const teamMessageSchema = z.object({
  id: z.string(),
  kind: z.string(),
  state: z.string(),
  body: z.string(),
  audience: z.enum(TEAM_AUDIENCES).nullable(),
  speciesIds: z.array(z.string()).nullable(),
  petIds: z.array(z.string()).nullable(),
  accountIds: z.array(z.string()).nullable(),
  location: z.record(z.string(), z.unknown()).nullable(),
  sendAt: z.string().nullable(),
  sentAt: z.string().nullable(),
  createdAt: z.string(),
  createdBy: z.string().nullable(),
  createdByEmail: z.string().nullable(),
  createdByRole: z.string().nullable(),
  editedAt: z.string().nullable(),
  deletedAt: z.string().nullable(),
  failedReason: z.string().nullable(),
  pets: z.number(),
  accounts: z.number(),
  readCount: z.number(),
  canEdit: z.boolean(),
  canDelete: z.boolean(),
});
export type TeamMessage = z.infer<typeof teamMessageSchema>;

export const teamListResponseSchema = z.object({
  items: z.array(teamMessageSchema),
  // Pass back as ?before= for the next page; null when this page was the last.
  nextBefore: z.string().nullable(),
});
export type TeamListResponse = z.infer<typeof teamListResponseSchema>;

export const placeOptionSchema = z.object({ value: z.string(), people: z.number() });
export type PlaceOption = z.infer<typeof placeOptionSchema>;

export const placeOptionsResponseSchema = z.object({
  countries: z.array(placeOptionSchema),
  states: z.array(placeOptionSchema),
  cities: z.array(placeOptionSchema),
});
export type PlaceOptionsResponse = z.infer<typeof placeOptionsResponseSchema>;

// Welcome messages: versioned texts for new accounts / new pets. Stop takes the panel's mandatory reason; Save keeps it optional like sending.
const welcomeKindSchema = z.enum(WELCOME_KINDS);

export const welcomeActionBodySchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("set"),
    kind: welcomeKindSchema,
    body: z.string().refine((v) => v.trim().length > 0, "Please write a message.").refine((v) => v.length <= WELCOME_BODY_MAX, `Keep the message under ${WELCOME_BODY_MAX} characters.`),
    reason: z.string().trim().max(TEAM_REASON_MAX).optional(),
  }),
  z.object({ action: z.literal("stop"), kind: welcomeKindSchema, reason: reasonSchema }),
]);
export type WelcomeActionRequest = z.infer<typeof welcomeActionBodySchema>;

export const welcomeListResponseSchema = z.object({
  active: z.object({ welcome: teamMessageSchema.nullable(), pet_welcome: teamMessageSchema.nullable() }),
  // Newest first, read-only history of replaced or stopped versions.
  retired: z.array(teamMessageSchema),
});
export type WelcomeListResponse = z.infer<typeof welcomeListResponseSchema>;

export const welcomeActionResultSchema = z.object({
  id: z.string(),
  kind: welcomeKindSchema,
  state: z.string(),
  previousId: z.string().nullable(),
});
export type WelcomeActionResult = z.infer<typeof welcomeActionResultSchema>;
