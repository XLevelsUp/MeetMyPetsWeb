/**
 * The dashboard's time-range vocabulary, shared by the adapter and the filter.
 *
 * Client-safe: `analytics.ts` is `server-only`, the range filter is a client
 * component, so the shared pieces live here — the same split as
 * `trust-constants.ts` and `report-constants.ts`.
 *
 * Everything is computed in **UTC day boundaries**, matching the SQL side,
 * which buckets with `date_trunc` on `timestamptz`. Doing part of this in local
 * time is how a range silently shifts by a day for anyone east of UTC.
 */

export const RANGE_PRESETS = ["7d", "30d", "90d", "month", "year", "custom"] as const;
export type RangePreset = (typeof RANGE_PRESETS)[number];

export const DEFAULT_RANGE_PRESET: RangePreset = "30d";

export const BUCKETS = ["day", "week", "month"] as const;
export type Bucket = (typeof BUCKETS)[number];

/** `YYYY-MM-DD` for a Date, in UTC. */
export function toIsoDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function addDays(date: Date, days: number): Date {
  const next = new Date(date);
  next.setUTCDate(next.getUTCDate() + days);
  return next;
}

/** Whole days between two `YYYY-MM-DD` strings, inclusive of both ends. */
export function daysBetween(from: string, to: string): number {
  const ms = Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`);
  return Math.floor(ms / 86_400_000) + 1;
}

export type ResolvedRange = { from: string; to: string };

/**
 * A preset (plus the custom endpoints) resolved to concrete dates.
 *
 * `month` and `year` are trailing windows, not calendar-to-date: "the last 12
 * months" answers a different and more useful question on a dashboard than
 * "January 1st until now", which shrinks to nothing every New Year's Day.
 *
 * A `custom` range missing or inverting its endpoints falls back to the default
 * preset rather than throwing — the query schema already `.catch()`es garbage,
 * and this is the same contract one layer down.
 */
export function resolveRange(
  preset: RangePreset,
  from?: string,
  to?: string,
  now: Date = new Date(),
): ResolvedRange {
  const today = toIsoDate(now);

  if (preset === "custom") {
    if (from && to && from <= to) return { from, to };
    return resolveRange(DEFAULT_RANGE_PRESET, undefined, undefined, now);
  }

  // Inclusive of today, so "7d" is today plus the six days before it.
  const spanDays = { "7d": 7, "30d": 30, "90d": 90, month: 30, year: 365 }[preset];
  return { from: toIsoDate(addDays(now, -(spanDays - 1))), to: today };
}

/**
 * The bucket a range should be drawn at.
 *
 * ONE function, called by the adapter (to pick the SQL argument), the axis
 * formatter and the tooltip — so those three can never disagree about what a
 * single point on the chart means.
 *
 * The thresholds are about legibility, not correctness: ~45 daily marks is
 * about as many as the 224px chart card can carry before ticks collide, and a
 * year of daily points is 365 marks in that same space.
 */
export function bucketFor(from: string, to: string): Bucket {
  const days = daysBetween(from, to);
  if (days <= 45) return "day";
  if (days <= 180) return "week";
  return "month";
}

/**
 * The window immediately before this one, of equal length — what a metric
 * card's delta compares against.
 */
export function previousWindow({ from, to }: ResolvedRange): ResolvedRange {
  const days = daysBetween(from, to);
  const start = new Date(`${from}T00:00:00Z`);
  return {
    from: toIsoDate(addDays(start, -days)),
    to: toIsoDate(addDays(start, -1)),
  };
}

/** Inclusive-end ISO instants for a range, for PostgREST `gte`/`lt` filters. */
export function rangeBounds({ from, to }: ResolvedRange): { start: string; endExclusive: string } {
  return {
    start: `${from}T00:00:00.000Z`,
    // Exclusive upper bound one day past `to`, so the whole of `to` is included
    // without depending on how precise the stored timestamps are.
    endExclusive: `${toIsoDate(addDays(new Date(`${to}T00:00:00Z`), 1))}T00:00:00.000Z`,
  };
}

/** Human label for the comparison, e.g. "vs previous 30 days". */
export function comparisonLabel(range: ResolvedRange): string {
  const days = daysBetween(range.from, range.to);
  if (days === 1) return "vs previous day";
  return `vs previous ${days} days`;
}
