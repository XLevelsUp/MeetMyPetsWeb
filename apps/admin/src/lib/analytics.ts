import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import { createReferenceClient, isSupabaseConfigured } from "@/lib/supabase/reference";
import {
  analyticsTimeseriesSchema,
  type AnalyticsSummaryResponse,
  type AnalyticsTimeseriesResponse,
  type MetricKey,
  type MetricValue,
} from "@/lib/api-contract";
import {
  bucketFor,
  previousWindow,
  rangeBounds,
  type ResolvedRange,
} from "@/lib/analytics-constants";

/**
 * Analytics query adapter — the ONE file that knows the database schema.
 *
 * SCHEMA: verified 2026-08-06, re-verified 2026-08-15 (see
 * docs/admin/schema-notes.md). The app data lives in domain schemas
 * (`identity`, `pets`, `matching`, `chat`, `social`), all exposed to the
 * Data API — NOT in `public`. The service_role read surface is deliberately
 * narrow: all of `identity`, plus SELECT on exactly `pets.pets`,
 * `matching.matches`, `matching.pet_likes`, `matching.pet_reports`, and
 * `chat.conversations`. Everything queried here must stay inside that surface
 * (or the anon-readable reference tables).
 *
 * House adapter pattern (apps/marketing/src/lib/waitlist.ts): discriminated
 * union results, never throws. Uses the service client — RLS is bypassed,
 * so nothing here may ever select PII columns; counts and aggregates only.
 */

export type AnalyticsResult<T> =
  | { ok: true; data: T }
  | { ok: false; reason: "unconfigured" | "query_failed"; message: string };

/**
 * Verified table locations — one place to fix if the schema moves again.
 *
 * `createdColumn` names the timestamp the week-over-week trend measures, and
 * defaults to `created_at`. Set it ONLY where the table disagrees.
 */
const TABLES = {
  users: { schema: "identity", table: "accounts" },
  pets: { schema: "pets", table: "pets" },
  species: { schema: "pets", table: "species" },
  /**
   * ⚠️ `matching.matches` has NO `created_at` column — it records `matched_at`,
   * because a match is an event with a moment rather than a row that was
   * created. Filtering it on `created_at` returns HTTP 400 from PostgREST, and
   * since every metric here shares one Promise.all and one catch, that single
   * bad column blanked the whole dashboard. Verified live 2026-08-16: this is
   * the only analytics table without `created_at`.
   */
  matches: { schema: "matching", table: "matches", createdColumn: "matched_at" },
  chats: { schema: "chat", table: "conversations" },
  verifications: { schema: "identity", table: "account_verifications" },
  swipes: { schema: "matching", table: "pet_likes" },
  reports: { schema: "matching", table: "pet_reports" },
} as const;

type TableRef = { schema: string; table: string; createdColumn?: string };

/** The column a trend measures. Defaults to the near-universal `created_at`. */
function createdColumn(ref: TableRef): string {
  return ref.createdColumn ?? "created_at";
}

/**
 * Summary for a selected window.
 *
 * The window scopes the COMPARISON, not the headline number: "Total Users"
 * keeps meaning total users ever, while its delta measures the selected range
 * against the equally-long window before it. Previously `current` was all-time
 * and `previous` was one hardcoded week, so the two fields never described the
 * same thing.
 */
export async function fetchAnalyticsSummary(
  range: ResolvedRange,
): Promise<AnalyticsResult<AnalyticsSummaryResponse>> {
  if (!isSupabaseConfigured()) {
    return { ok: false, reason: "unconfigured", message: "Supabase env vars are not set." };
  }

  const supabase = createAdminClient();
  const current = rangeBounds(range);
  const prior = rangeBounds(previousWindow(range));

  const fromRef = (ref: TableRef) => supabase.schema(ref.schema).from(ref.table);

  // `head: true` sends no rows, only the exact count header.
  type CountQuery = ReturnType<ReturnType<typeof fromRef>["select"]>;
  const countRows = async (
    ref: TableRef,
    filter?: (q: CountQuery) => CountQuery,
  ): Promise<number> => {
    let query = fromRef(ref).select("*", { count: "exact", head: true });
    if (filter) query = filter(query);
    const { count, error } = await query;
    if (error) throw new Error(`${ref.schema}.${ref.table}: ${error.message}`);
    return count ?? 0;
  };

  /**
   * Counts rows whose `col` falls inside a window. One helper, so the current
   * and prior windows are always measured the same way.
   */
  const inWindow = (col: string, w: { start: string; endExclusive: string }) => (q: CountQuery) =>
    q.gte(col, w.start).lt(col, w.endExclusive);

  /**
   * Stock metrics report the all-time total as `current` (optionally
   * narrowed by `currentFilter`); the trend compares rows created in the
   * selected window vs the window before it (an all-time total's own delta is
   * meaningless).
   */
  const stockMetric = async (
    ref: TableRef,
    currentFilter?: (q: CountQuery) => CountQuery,
  ): Promise<MetricValue> => {
    const col = createdColumn(ref);
    const [total, inRange, inPrior] = await Promise.all([
      countRows(ref, currentFilter),
      countRows(ref, inWindow(col, current)),
      countRows(ref, inWindow(col, prior)),
    ]);
    return { current: total, previous: inPrior, changePct: changePct(inRange, inPrior) };
  };

  /**
   * Queue metrics report the live queue size as `current`; the trend tracks
   * incoming volume (items created in the window vs the one before) —
   * operationally more useful than the queue's own size delta, which
   * resolution work constantly moves.
   */
  const queueMetric = async (ref: TableRef, statusValue: string): Promise<MetricValue> => {
    // Reads the same per-table column as stockMetric. Both queue tables use
    // `created_at` today, but hardcoding it here is exactly what broke the
    // matches metric, so the lookup is shared rather than repeated.
    const col = createdColumn(ref);
    const [open, inRange, inPrior] = await Promise.all([
      countRows(ref, (q) => q.eq("status", statusValue)),
      countRows(ref, inWindow(col, current)),
      countRows(ref, inWindow(col, prior)),
    ]);
    return { current: open, previous: inPrior, changePct: changePct(inRange, inPrior) };
  };

  /**
   * "Active" chats = a conversation with a message inside the window
   * (`last_message_at`, verified). Unlike the others this metric's `current`
   * IS window-scoped, because "active" has no all-time meaning.
   */
  const activeChatsMetric = async (): Promise<MetricValue> => {
    const [inRange, inPrior] = await Promise.all([
      countRows(TABLES.chats, inWindow("last_message_at", current)),
      countRows(TABLES.chats, inWindow("last_message_at", prior)),
    ]);
    return { current: inRange, previous: inPrior, changePct: changePct(inRange, inPrior) };
  };

  /**
   * `pets.pets` stores `species_id`, not a name; names come from the
   * anon-readable `pets.species` reference table (service_role has no
   * SELECT on it — see createReferenceClient).
   */
  const speciesBreakdown = async () => {
    // TODO(pre-launch scale): fine while pet counts are small; replace with a
    // grouped SQL function once row counts warrant it.
    const [petsRes, speciesRes] = await Promise.all([
      fromRef(TABLES.pets).select("species_id").eq("status", "active").range(0, 49_999),
      createReferenceClient()
        .schema(TABLES.species.schema)
        .from(TABLES.species.table)
        .select("id,name"),
    ]);
    if (petsRes.error) throw new Error(`${TABLES.pets.table}: ${petsRes.error.message}`);
    if (speciesRes.error) throw new Error(`${TABLES.species.table}: ${speciesRes.error.message}`);

    const names = new Map<string, string>();
    for (const row of (speciesRes.data ?? []) as { id: string; name: string | null }[]) {
      if (row.name?.trim()) names.set(row.id, row.name.trim());
    }

    const counts = new Map<string, number>();
    for (const row of (petsRes.data ?? []) as { species_id: string | null }[]) {
      const species = (row.species_id && names.get(row.species_id)) || "Unknown";
      counts.set(species, (counts.get(species) ?? 0) + 1);
    }
    return [...counts.entries()]
      .map(([species, count]) => ({ species, count }))
      .sort((a, b) => b.count - a.count);
  };

  try {
    const [
      totalUsers,
      activePets,
      totalMatches,
      activeChats,
      pendingVerifications,
      openReports,
      bySpecies,
    ] = await Promise.all([
      stockMetric(TABLES.users),
      stockMetric(TABLES.pets, (q) => q.eq("status", "active")),
      stockMetric(TABLES.matches),
      activeChatsMetric(),
      // Table is empty today; "pending" is the assumed FastAPI status value —
      // recheck when the first real verification lands.
      queueMetric(TABLES.verifications, "pending"),
      // The backend's own table (adopted 2026-08-15 — we no longer plan our
      // own). "pending" here is CHECK-constrained, not assumed.
      queueMetric(TABLES.reports, "pending"),
      speciesBreakdown(),
    ]);

    const metrics: Record<MetricKey, MetricValue> = {
      totalUsers,
      activePets,
      totalMatches,
      activeChats,
      pendingVerifications,
      openReports,
    };

    return {
      ok: true,
      data: {
        generatedAt: new Date().toISOString(),
        metrics,
        activePetsBySpecies: bySpecies,
        from: range.from,
        to: range.to,
      },
    };
  } catch (error) {
    return {
      ok: false,
      reason: "query_failed",
      message: error instanceof Error ? error.message : "Unknown query failure.",
    };
  }
}

export async function fetchAnalyticsTimeseries(
  range: ResolvedRange,
): Promise<AnalyticsResult<AnalyticsTimeseriesResponse>> {
  if (!isSupabaseConfigured()) {
    return { ok: false, reason: "unconfigured", message: "Supabase env vars are not set." };
  }

  const supabase = createAdminClient();

  /**
   * Bucketing runs in Postgres via public.admin_analytics_timeseries
   * (SECURITY INVOKER, service_role-only EXECUTE — see
   * supabase/migrations/20260817000000_admin_analytics_timeseries_ranged.sql).
   * It generate_series-pre-seeds every bucket to zero and reads
   * identity.accounts + matching.pet_likes, so there is no per-row transfer or
   * .range() cap. The returned jsonb is validated against the shared contract
   * before it leaves this adapter.
   */
  try {
    const bucket = bucketFor(range.from, range.to);
    const { data, error } = await supabase.rpc("admin_analytics_timeseries", {
      p_from: range.from,
      p_to: range.to,
      p_bucket: bucket,
    });
    if (error) throw new Error(describeRpcError(error));

    const parsed = analyticsTimeseriesSchema.safeParse(data);
    if (!parsed.success) {
      throw new Error(`unexpected timeseries shape: ${parsed.error.message}`);
    }

    /**
     * Clamp a range that reaches back further than the product has existed.
     *
     * Asking for 12 months against seven weeks of data would otherwise draw
     * nine empty buckets — which reads as an outage rather than as a launch.
     * The re-query is skipped entirely in the common case where the requested
     * start is already inside the data.
     */
    const startsAt = parsed.data.dataStartsAt;
    if (startsAt && startsAt > range.from) {
      const clamped = { from: startsAt, to: range.to };
      const { data: reData, error: reError } = await supabase.rpc("admin_analytics_timeseries", {
        p_from: clamped.from,
        p_to: clamped.to,
        p_bucket: bucketFor(clamped.from, clamped.to),
      });
      if (reError) throw new Error(describeRpcError(reError));

      const reParsed = analyticsTimeseriesSchema.safeParse(reData);
      if (!reParsed.success) {
        throw new Error(`unexpected timeseries shape: ${reParsed.error.message}`);
      }
      return { ok: true, data: reParsed.data };
    }

    return { ok: true, data: parsed.data };
  } catch (error) {
    return {
      ok: false,
      reason: "query_failed",
      message: error instanceof Error ? error.message : "Unknown query failure.",
    };
  }
}

/**
 * Turns PostgREST's function-not-found into an instruction.
 *
 * `PGRST202` here means one specific thing: the ranged overload has not been
 * applied to this database yet. The raw message is a paragraph about schema
 * cache lookups that tells a moderator nothing and sends them to us; the
 * migration filename tells whoever can actually fix it exactly what to run.
 *
 * Deliberately NOT a silent fallback to the old day-only function: that would
 * mean maintaining a second bucketing implementation whose only job is to be
 * temporary, and temporary implementations are how a codebase ends up with two
 * answers to the same question.
 */
function describeRpcError(error: { code?: string; message: string }): string {
  if (error.code === "PGRST202") {
    return (
      "The analytics range function is missing from the database. Apply " +
      "supabase/migrations/20260817000000_admin_analytics_timeseries_ranged.sql, " +
      "then reload."
    );
  }
  return error.message;
}

/** Period-over-period percentage, one decimal; null when the base is zero. */
function changePct(current: number, previous: number): number | null {
  if (previous === 0) return null;
  return Math.round(((current - previous) / previous) * 1000) / 10;
}
