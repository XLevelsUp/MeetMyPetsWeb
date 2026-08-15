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
 * House adapter pattern (apps/landing/src/lib/waitlist.ts): discriminated
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

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

export async function fetchAnalyticsSummary(): Promise<
  AnalyticsResult<AnalyticsSummaryResponse>
> {
  if (!isSupabaseConfigured()) {
    return { ok: false, reason: "unconfigured", message: "Supabase env vars are not set." };
  }

  const supabase = createAdminClient();
  const now = Date.now();
  const weekAgo = new Date(now - WEEK_MS).toISOString();
  const twoWeeksAgo = new Date(now - 2 * WEEK_MS).toISOString();

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
   * Stock metrics report the all-time total as `current` (optionally
   * narrowed by `currentFilter`); the trend compares rows created this week
   * vs the prior week (an all-time total's own WoW delta is meaningless).
   */
  const stockMetric = async (
    ref: TableRef,
    currentFilter?: (q: CountQuery) => CountQuery,
  ): Promise<MetricValue> => {
    const col = createdColumn(ref);
    const [total, thisWeek, priorWeek] = await Promise.all([
      countRows(ref, currentFilter),
      countRows(ref, (q) => q.gte(col, weekAgo)),
      countRows(ref, (q) => q.gte(col, twoWeeksAgo).lt(col, weekAgo)),
    ]);
    return { current: total, previous: priorWeek, changePct: changePct(thisWeek, priorWeek) };
  };

  /**
   * Queue metrics report the live queue size as `current`; the trend tracks
   * incoming volume (items created this week vs prior week) — operationally
   * more useful than the queue's own size delta, which resolution work
   * constantly moves.
   */
  const queueMetric = async (ref: TableRef, statusValue: string): Promise<MetricValue> => {
    // Reads the same per-table column as stockMetric. Both queue tables use
    // `created_at` today, but hardcoding it here is exactly what broke the
    // matches metric, so the lookup is shared rather than repeated.
    const col = createdColumn(ref);
    const [open, thisWeek, priorWeek] = await Promise.all([
      countRows(ref, (q) => q.eq("status", statusValue)),
      countRows(ref, (q) => q.gte(col, weekAgo)),
      countRows(ref, (q) => q.gte(col, twoWeeksAgo).lt(col, weekAgo)),
    ]);
    return { current: open, previous: priorWeek, changePct: changePct(thisWeek, priorWeek) };
  };

  /** "Active" chats = a message in the last 7 days (`last_message_at`, verified). */
  const activeChatsMetric = async (): Promise<MetricValue> => {
    const [thisWeek, priorWeek] = await Promise.all([
      countRows(TABLES.chats, (q) => q.gte("last_message_at", weekAgo)),
      countRows(TABLES.chats, (q) =>
        q.gte("last_message_at", twoWeeksAgo).lt("last_message_at", weekAgo),
      ),
    ]);
    return { current: thisWeek, previous: priorWeek, changePct: changePct(thisWeek, priorWeek) };
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
  if (!isSupabaseConfigured()) {
    return { ok: false, reason: "unconfigured", message: "Supabase env vars are not set." };
  }

  const supabase = createAdminClient();

  /**
   * Day bucketing runs in Postgres via public.admin_analytics_timeseries
   * (SECURITY INVOKER, service_role-only EXECUTE — see
   * supabase/migrations/20260805000000_admin_analytics_timeseries.sql). It
   * generate_series-pre-seeds every day to zero and reads identity.accounts +
   * matching.pet_likes, so there is no per-row transfer or .range() cap. The
   * returned jsonb is validated against the shared contract before it leaves
   * this adapter.
   */
  try {
    const { data, error } = await supabase.rpc("admin_analytics_timeseries", { days });
    if (error) throw new Error(error.message);

    const parsed = analyticsTimeseriesSchema.safeParse(data);
    if (!parsed.success) {
      throw new Error(`unexpected timeseries shape: ${parsed.error.message}`);
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

/** Week-over-week percentage, one decimal; null when the base is zero. */
function changePct(current: number, previous: number): number | null {
  if (previous === 0) return null;
  return Math.round(((current - previous) / previous) * 1000) / 10;
}
