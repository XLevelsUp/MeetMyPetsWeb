import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import type {
  AnalyticsSummaryResponse,
  AnalyticsTimeseriesResponse,
  MetricKey,
  MetricValue,
  TimeseriesPoint,
} from "@/lib/api-contract";

/**
 * Analytics query adapter — the ONE file that knows the database schema.
 *
 * SCHEMA ASSUMPTIONS: every table/column here is an unverified assumption
 * recorded in docs/admin/schema-notes.md. When the Supabase MCP
 * introspection runs, reconcile THIS file (and dal.ts) only.
 *
 * House adapter pattern (apps/landing/src/lib/waitlist.ts): discriminated
 * union results, never throws. Uses the service client — RLS is bypassed,
 * so nothing here may ever select PII columns; counts and aggregates only.
 */

export type AnalyticsResult<T> =
  | { ok: true; data: T }
  | { ok: false; reason: "unconfigured" | "query_failed"; message: string };

/** Assumed table names — one place to fix after introspection. */
const TABLES = {
  users: "profiles",
  pets: "pet_profiles",
  matches: "matches",
  chats: "chats",
  verifications: "verifications",
  reports: "reports",
  swipes: "swipes",
} as const;

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

function isConfigured(): boolean {
  return Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SECRET_KEY);
}

export async function fetchAnalyticsSummary(): Promise<
  AnalyticsResult<AnalyticsSummaryResponse>
> {
  if (!isConfigured()) {
    return { ok: false, reason: "unconfigured", message: "Supabase env vars are not set." };
  }

  const supabase = createAdminClient();
  const now = Date.now();
  const weekAgo = new Date(now - WEEK_MS).toISOString();
  const twoWeeksAgo = new Date(now - 2 * WEEK_MS).toISOString();

  // `head: true` sends no rows, only the exact count header.
  type CountQuery = ReturnType<ReturnType<typeof supabase.from>["select"]>;
  const countRows = async (
    table: string,
    filter?: (q: CountQuery) => CountQuery,
  ): Promise<number> => {
    let query = supabase.from(table).select("*", { count: "exact", head: true });
    if (filter) query = filter(query);
    const { count, error } = await query;
    if (error) throw new Error(`${table}: ${error.message}`);
    return count ?? 0;
  };

  /**
   * Stock metrics report the all-time total as `current`; the trend compares
   * rows created this week vs the prior week (an all-time total's own WoW
   * delta is meaningless).
   */
  const stockMetric = async (table: string): Promise<MetricValue> => {
    const [total, thisWeek, priorWeek] = await Promise.all([
      countRows(table),
      countRows(table, (q) => q.gte("created_at", weekAgo)),
      countRows(table, (q) => q.gte("created_at", twoWeeksAgo).lt("created_at", weekAgo)),
    ]);
    return { current: total, previous: priorWeek, changePct: changePct(thisWeek, priorWeek) };
  };

  /**
   * Queue metrics report the live queue size as `current`; the trend tracks
   * incoming volume (items created this week vs prior week) — operationally
   * more useful than the queue's own size delta, which resolution work
   * constantly moves.
   */
  const queueMetric = async (table: string, statusValue: string): Promise<MetricValue> => {
    const [open, thisWeek, priorWeek] = await Promise.all([
      countRows(table, (q) => q.eq("status", statusValue)),
      countRows(table, (q) => q.gte("created_at", weekAgo)),
      countRows(table, (q) => q.gte("created_at", twoWeeksAgo).lt("created_at", weekAgo)),
    ]);
    return { current: open, previous: priorWeek, changePct: changePct(thisWeek, priorWeek) };
  };

  /** "Active" chats = a message in the last 7 days (assumed last_message_at). */
  const activeChatsMetric = async (): Promise<MetricValue> => {
    const [thisWeek, priorWeek] = await Promise.all([
      countRows(TABLES.chats, (q) => q.gte("last_message_at", weekAgo)),
      countRows(TABLES.chats, (q) =>
        q.gte("last_message_at", twoWeeksAgo).lt("last_message_at", weekAgo),
      ),
    ]);
    return { current: thisWeek, previous: priorWeek, changePct: changePct(thisWeek, priorWeek) };
  };

  const speciesBreakdown = async () => {
    // TODO(pre-launch scale): fine while pet counts are small; replace with a
    // grouped SQL function once row counts warrant it.
    const { data, error } = await supabase.from(TABLES.pets).select("species").range(0, 49_999);
    if (error) throw new Error(`${TABLES.pets}: ${error.message}`);

    const counts = new Map<string, number>();
    for (const row of (data ?? []) as { species: string | null }[]) {
      const species = row.species?.trim() || "Unknown";
      counts.set(species, (counts.get(species) ?? 0) + 1);
    }
    return [...counts.entries()]
      .map(([species, count]) => ({ species, count }))
      .sort((a, b) => b.count - a.count);
  };

  try {
    const [totalUsers, activePets, totalMatches, activeChats, pendingVerifications, openReports, bySpecies] =
      await Promise.all([
        stockMetric(TABLES.users),
        // TODO(introspection): add the "active" filter (is_active / deleted_at)
        // once the real column is known — counts all pets until then.
        stockMetric(TABLES.pets),
        stockMetric(TABLES.matches),
        activeChatsMetric(),
        queueMetric(TABLES.verifications, "pending"),
        queueMetric(TABLES.reports, "open"),
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
      data: { generatedAt: new Date().toISOString(), metrics, activePetsBySpecies: bySpecies },
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
  days: number,
): Promise<AnalyticsResult<AnalyticsTimeseriesResponse>> {
  if (!isConfigured()) {
    return { ok: false, reason: "unconfigured", message: "Supabase env vars are not set." };
  }

  const supabase = createAdminClient();
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

  /**
   * TS-side day bucketing. A generate_series SQL function exists in
   * supabase/migrations/ but has not been applied yet (see
   * docs/admin/schema-notes.md); until then this fetches bare timestamps.
   * TODO(scale): switch to `supabase.rpc("admin_analytics_timeseries", ...)`
   * once the migration is applied — the .range cap below silently truncates
   * beyond 50k rows/window.
   */
  const dailyCounts = async (table: string): Promise<TimeseriesPoint[]> => {
    const { data, error } = await supabase
      .from(table)
      .select("created_at")
      .gte("created_at", since)
      .range(0, 49_999);
    if (error) throw new Error(`${table}: ${error.message}`);

    const buckets = new Map<string, number>();
    // Pre-seed every day so charts show explicit zeroes, not gaps.
    for (let i = days - 1; i >= 0; i--) {
      const day = new Date(Date.now() - i * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
      buckets.set(day, 0);
    }
    for (const row of (data ?? []) as { created_at: string }[]) {
      const day = row.created_at.slice(0, 10);
      if (buckets.has(day)) buckets.set(day, (buckets.get(day) ?? 0) + 1);
    }
    return [...buckets.entries()].map(([date, value]) => ({ date, value }));
  };

  try {
    const [userAcquisition, swipeVolume] = await Promise.all([
      dailyCounts(TABLES.users),
      dailyCounts(TABLES.swipes),
    ]);
    return { ok: true, data: { days, userAcquisition, swipeVolume } };
  } catch (error) {
    return {
      ok: false,
      reason: "query_failed",
      message: error instanceof Error ? error.message : "Unknown query failure.",
    };
  }
}

/** Week-over-week percentage, one decimal; null when the base is zero. */
function changePct(current: number, previous: number): number | null {
  if (previous === 0) return null;
  return Math.round(((current - previous) / previous) * 1000) / 10;
}
