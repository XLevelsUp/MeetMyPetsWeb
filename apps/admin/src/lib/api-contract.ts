import { z } from "zod";

import { BUCKETS, DEFAULT_RANGE_PRESET, RANGE_PRESETS } from "@/lib/analytics-constants";

/**
 * Typed contract for the admin analytics API.
 *
 * Single source of truth for BOTH sides: route handlers build these shapes,
 * React Query hooks zod-parse responses against them. If the backend ever
 * moves to api.meetmypets.app (FastAPI), this file is the contract the
 * Python side must honour — nothing else in the app knows payload shapes.
 *
 * Privacy: aggregates only. No user ids, emails, or any other PII may ever
 * be added to these payloads — they reach every moderator role.
 */

export const METRIC_KEYS = [
  "totalUsers",
  "activePets",
  "totalMatches",
  "activeChats",
  "pendingVerifications",
  "openReports",
  /** A PERCENTAGE, not a count — `likes / (likes + passes)`. Cards format it. */
  "likeRate",
] as const;

export type MetricKey = (typeof METRIC_KEYS)[number];

/**
 * `changePct` compares the selected range against the window immediately
 * before it, and is null when that prior window is zero — rendering "—" beats
 * rendering "Infinity%" on a pre-launch database.
 */
export const metricValueSchema = z.object({
  current: z.number(),
  previous: z.number(),
  changePct: z.number().nullable(),
});
export type MetricValue = z.infer<typeof metricValueSchema>;

export const speciesCountSchema = z.object({
  species: z.string(),
  count: z.number(),
});
export type SpeciesCount = z.infer<typeof speciesCountSchema>;

export const analyticsSummarySchema = z.object({
  generatedAt: z.iso.datetime(),
  metrics: z.record(z.enum(METRIC_KEYS), metricValueSchema),
  activePetsBySpecies: z.array(speciesCountSchema),
  /** The window the deltas were computed over, echoed for the card labels. */
  from: z.string(),
  to: z.string(),
});
export type AnalyticsSummaryResponse = z.infer<typeof analyticsSummarySchema>;

export const timeseriesPointSchema = z.object({
  /** YYYY-MM-DD — the START of the bucket, whichever granularity is in play. */
  date: z.string(),
  value: z.number(),
});
export type TimeseriesPoint = z.infer<typeof timeseriesPointSchema>;

export const analyticsTimeseriesSchema = z.object({
  /** Echoed back because the server may CLAMP `from` — see `dataStartsAt`. */
  from: z.string(),
  to: z.string(),
  bucket: z.enum(BUCKETS),
  /**
   * Earliest row in either source table, or null on an empty database.
   *
   * Drives the clamp: a 12-month range against a product that is seven weeks
   * old would otherwise render nine empty buckets, which reads as an outage
   * rather than as a launch.
   */
  dataStartsAt: z.string().nullable(),
  userAcquisition: z.array(timeseriesPointSchema),
  /**
   * Swipes split by direction. The TOTAL is deliberately absent — it is
   * `likes + passes`, and a derivable third series is a third thing that can
   * drift out of agreement with the other two. The stacked chart shows it.
   */
  swipeLikes: z.array(timeseriesPointSchema),
  swipePasses: z.array(timeseriesPointSchema),
});
export type AnalyticsTimeseriesResponse = z.infer<typeof analyticsTimeseriesSchema>;

/** Body shape of every non-2xx response from these endpoints. */
export const apiErrorSchema = z.object({
  error: z.string(),
  message: z.string(),
});
export type ApiError = z.infer<typeof apiErrorSchema>;

/**
 * The dashboard's range selection, as it travels in the query string.
 *
 * `.catch()` on every field mirrors `users-contract.ts`: a hand-edited or stale
 * URL degrades to the default view rather than 400-ing an admin out of a page
 * they can otherwise use. `from`/`to` only mean anything when `preset` is
 * "custom"; `resolveRange` ignores them otherwise.
 */
const rangeDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .optional()
  .catch(undefined);

export const analyticsRangeQuerySchema = z.object({
  preset: z.enum(RANGE_PRESETS).catch(DEFAULT_RANGE_PRESET),
  from: rangeDate,
  to: rangeDate,
});
export type AnalyticsRangeQuery = z.infer<typeof analyticsRangeQuerySchema>;

export const DEFAULT_ANALYTICS_RANGE_QUERY: AnalyticsRangeQuery =
  analyticsRangeQuerySchema.parse({});
