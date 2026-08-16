import { z } from "zod";

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
] as const;

export type MetricKey = (typeof METRIC_KEYS)[number];

/**
 * `changePct` is week-over-week and null when the prior week is zero —
 * rendering "—" beats rendering "Infinity%" on a pre-launch database.
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
});
export type AnalyticsSummaryResponse = z.infer<typeof analyticsSummarySchema>;

export const timeseriesPointSchema = z.object({
  /** YYYY-MM-DD (UTC day bucket). */
  date: z.string(),
  value: z.number(),
});
export type TimeseriesPoint = z.infer<typeof timeseriesPointSchema>;

export const analyticsTimeseriesSchema = z.object({
  days: z.number(),
  userAcquisition: z.array(timeseriesPointSchema),
  swipeVolume: z.array(timeseriesPointSchema),
});
export type AnalyticsTimeseriesResponse = z.infer<typeof analyticsTimeseriesSchema>;

/** Body shape of every non-2xx response from these endpoints. */
export const apiErrorSchema = z.object({
  error: z.string(),
  message: z.string(),
});
export type ApiError = z.infer<typeof apiErrorSchema>;

/** Bounds for the timeseries `?days=` query param. */
export const timeseriesDaysSchema = z.coerce.number().int().min(7).max(90).catch(30);
