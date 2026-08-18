import { afterEach, describe, expect, it, vi } from "vitest";

import { makeSupabaseMock } from "@/test/supabase-mock";

// Holders let each test swap the client the adapter receives. vi.hoisted keeps
// them available to the (hoisted) vi.mock factories below.
const holder = vi.hoisted(() => ({
  admin: null as ReturnType<typeof makeSupabaseMock> | null,
  reference: null as ReturnType<typeof makeSupabaseMock> | null,
}));

vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: () => holder.admin }));
vi.mock("@supabase/supabase-js", () => ({ createClient: () => holder.reference }));

import { fetchAnalyticsSummary, fetchAnalyticsTimeseries } from "@/lib/analytics";
import {
  bucketFor,
  comparisonLabel,
  daysBetween,
  previousWindow,
  resolveRange,
  type ResolvedRange,
} from "@/lib/analytics-constants";

/** A fixed window, so nothing in this suite depends on the wall clock. */
const RANGE: ResolvedRange = { from: "2026-07-19", to: "2026-08-17" };

function configureEnv() {
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://example.supabase.co");
  vi.stubEnv("SUPABASE_SECRET_KEY", "sb_secret_test");
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "sb_publishable_test");
}

/**
 * The inverse of configureEnv, and it must be called explicitly.
 *
 * The unconfigured-path tests used to just assume these were absent, which
 * made them pass on a laptop with no .env.local and fail in CI, where the
 * Supabase secrets are set for the build: the adapter correctly saw a
 * configured environment, ran the query against the mock, and returned
 * "query_failed" instead of "unconfigured".
 *
 * Stubbing to "" rather than deleting is what isSupabaseConfigured() reads —
 * it is a Boolean() check on the three values, so an empty string is falsy
 * and reproduces "missing" regardless of what the real environment holds.
 */
function clearEnv() {
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "");
  vi.stubEnv("SUPABASE_SECRET_KEY", "");
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "");
}

afterEach(() => {
  vi.unstubAllEnvs();
  holder.admin = null;
  holder.reference = null;
});

/**
 * The timestamp columns each analytics table ACTUALLY has, from live
 * introspection of project `owfrnkafevdfzduuqnic` on 2026-08-16.
 *
 * `matching.matches` is the odd one out: it records `matched_at`, not
 * `created_at`, because a match is an event with a moment rather than a row
 * that was "created". Filtering it on `created_at` returns HTTP 400 from
 * PostgREST — which took the entire dashboard down, because every metric shares
 * one Promise.all and one catch.
 *
 * Update this map from introspection, never from memory.
 */
const REAL_TIMESTAMP_COLUMNS: Record<string, string[]> = {
  "identity.accounts": ["created_at", "updated_at", "deleted_at", "last_activity_at", "last_login_at"],
  "identity.account_verifications": ["created_at", "verified_at"],
  "pets.pets": ["created_at", "updated_at", "deleted_at", "temporary_banned_at", "temporary_ban_until"],
  "matching.matches": ["matched_at", "ended_at", "updated_at"],
  "matching.pet_likes": ["created_at"],
  "matching.pet_reports": ["created_at"],
  "chat.conversations": ["created_at", "last_message_at"],
};

/** Range filters — the ones that name a timestamp column. */
const RANGE_METHODS = new Set(["gte", "lt", "lte", "gt"]);

describe("analytics filters only reference columns that exist", () => {
  /**
   * REGRESSION GUARD. The old `stockMetric` hardcoded `.gte("created_at", …)`
   * for every table, and the suite passed anyway because the mock returns its
   * configured count no matter which filters were chained — so a query that
   * 400s in production was green in CI.
   *
   * This asserts on the filters the adapter actually built, which is the only
   * thing that can catch a column-name mismatch without a live database.
   */
  it("never filters a table on a timestamp column it does not have", async () => {
    configureEnv();
    holder.admin = makeSupabaseMock({
      "identity.accounts": { count: 36 },
      "pets.pets": { count: 55, rows: [] },
      "matching.matches": { count: 50 },
      "chat.conversations": { count: 12 },
      "identity.account_verifications": { count: 0 },
      "matching.pet_reports": { count: 13 },
    });
    holder.reference = makeSupabaseMock({ "pets.species": { rows: [] } });

    const result = await fetchAnalyticsSummary(RANGE);
    expect(result.ok).toBe(true);

    const offenders: string[] = [];
    for (const call of holder.admin.calls) {
      const known = REAL_TIMESTAMP_COLUMNS[call.key];
      if (!known) continue;
      for (const filter of call.filters ?? []) {
        if (!RANGE_METHODS.has(filter.method)) continue;
        const column = filter.args[0];
        if (typeof column === "string" && !known.includes(column)) {
          offenders.push(`${call.key} filtered on "${column}" (has: ${known.join(", ")})`);
        }
      }
    }

    expect(offenders).toEqual([]);
  });

  it("uses matched_at for the matches trend", async () => {
    configureEnv();
    holder.admin = makeSupabaseMock({
      "identity.accounts": { count: 1 },
      "pets.pets": { count: 1, rows: [] },
      "matching.matches": { count: 1 },
      "chat.conversations": { count: 1 },
      "identity.account_verifications": { count: 0 },
      "matching.pet_reports": { count: 0 },
    });
    holder.reference = makeSupabaseMock({ "pets.species": { rows: [] } });

    await fetchAnalyticsSummary(RANGE);

    // Pins the intent even if the generic check above is ever loosened.
    const matchFilters = holder.admin.calls
      .filter((c) => c.key === "matching.matches")
      .flatMap((c) => c.filters ?? [])
      .filter((f) => RANGE_METHODS.has(f.method));

    expect(matchFilters.length).toBeGreaterThan(0);
    for (const filter of matchFilters) {
      expect(filter.args[0]).toBe("matched_at");
    }
  });
});

describe("fetchAnalyticsSummary", () => {
  it("returns unconfigured when env vars are missing", async () => {
    clearEnv();
    const result = await fetchAnalyticsSummary(RANGE);
    expect(result).toEqual({ ok: false, reason: "unconfigured", message: expect.any(String) });
  });

  it("aggregates counts and species on the happy path", async () => {
    configureEnv();
    holder.admin = makeSupabaseMock({
      "identity.accounts": { count: 36 },
      "pets.pets": { count: 55, rows: [{ species_id: "d" }, { species_id: "d" }, { species_id: "c" }] },
      "matching.matches": { count: 50 },
      "chat.conversations": { count: 12 },
      "identity.account_verifications": { count: 0 },
      "matching.pet_reports": { count: 13 },
    });
    holder.reference = makeSupabaseMock({
      "pets.species": { rows: [{ id: "d", name: "Dog" }, { id: "c", name: "Cat" }] },
    });

    const result = await fetchAnalyticsSummary(RANGE);
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.data.metrics.totalUsers.current).toBe(36);
    expect(result.data.metrics.activePets.current).toBe(55);
    expect(result.data.metrics.totalMatches.current).toBe(50);
    expect(result.data.metrics.activeChats.current).toBe(12);
    // Real count off matching.pet_reports since 2026-08-15 — it was a hardcoded
    // zero before the backend's table was adopted. A non-zero fixture is the
    // point: with an unconfigured table the mock also returns 0, so asserting
    // zero here would pass whether or not the metric is wired up at all.
    expect(result.data.metrics.openReports.current).toBe(13);
    expect(result.data.activePetsBySpecies).toEqual([
      { species: "Dog", count: 2 },
      { species: "Cat", count: 1 },
    ]);
  });

  it("returns query_failed when a table read errors", async () => {
    configureEnv();
    holder.admin = makeSupabaseMock({
      "identity.accounts": { error: { message: "boom" } },
      "pets.pets": { count: 0, rows: [] },
      "matching.matches": { count: 0 },
      "chat.conversations": { count: 0 },
      "identity.account_verifications": { count: 0 },
      "matching.pet_reports": { count: 0 },
    });
    holder.reference = makeSupabaseMock({ "pets.species": { rows: [] } });

    const result = await fetchAnalyticsSummary(RANGE);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.reason).toBe("query_failed");
    expect(result.message).toContain("boom");
  });
});

/** A response the contract accepts, with the fields each test cares about. */
function timeseriesPayload(over: Partial<Record<string, unknown>> = {}) {
  return {
    from: "2026-07-19",
    to: "2026-08-17",
    bucket: "day",
    dataStartsAt: "2026-06-29",
    userAcquisition: [{ date: "2026-08-06", value: 3 }],
    swipeLikes: [{ date: "2026-08-06", value: 70 }],
    swipePasses: [{ date: "2026-08-06", value: 202 }],
    ...over,
  };
}

describe("fetchAnalyticsTimeseries", () => {
  it("returns unconfigured when env vars are missing", async () => {
    clearEnv();
    const result = await fetchAnalyticsTimeseries(RANGE);
    expect(result).toEqual({ ok: false, reason: "unconfigured", message: expect.any(String) });
  });

  it("returns the validated rpc payload on the happy path", async () => {
    configureEnv();
    const payload = timeseriesPayload();
    holder.admin = makeSupabaseMock({}, { admin_analytics_timeseries: payload });

    const result = await fetchAnalyticsTimeseries(RANGE);
    expect(result).toEqual({ ok: true, data: payload });
  });

  /**
   * Asserts the RPC ARGUMENTS, not the returned rows. The mock hands back its
   * fixture whatever it is asked for, so a row-based assertion would pass just
   * as happily against an adapter that ignored the selected range entirely —
   * the trap an earlier taxonomy test fell into.
   */
  it("passes the range and the derived bucket to Postgres", async () => {
    configureEnv();
    const range = { from: "2025-09-01", to: "2026-08-17" }; // > 180 days → month
    holder.admin = makeSupabaseMock(
      {},
      { admin_analytics_timeseries: timeseriesPayload({ from: range.from, bucket: "month", dataStartsAt: null }) },
    );

    await fetchAnalyticsTimeseries(range);

    const call = holder.admin.calls.find((c) => c.op === "rpc");
    expect(call?.values).toEqual({
      p_from: "2025-09-01",
      p_to: "2026-08-17",
      p_bucket: "month",
    });
  });

  it("re-queries clamped to the first real row when the range predates the data", async () => {
    configureEnv();
    holder.admin = makeSupabaseMock(
      {},
      { admin_analytics_timeseries: timeseriesPayload({ dataStartsAt: "2026-06-29" }) },
    );

    // A year back against a database whose first row is 2026-06-29.
    await fetchAnalyticsTimeseries({ from: "2025-08-18", to: "2026-08-17" });

    const rpcCalls = holder.admin.calls.filter((c) => c.op === "rpc");
    expect(rpcCalls).toHaveLength(2);
    // Second pass starts at the data, not at the requested date — otherwise the
    // chart draws ten empty buckets and reads as an outage.
    expect((rpcCalls[1].values as { p_from: string }).p_from).toBe("2026-06-29");
  });

  it("does not re-query when the range already starts inside the data", async () => {
    configureEnv();
    holder.admin = makeSupabaseMock(
      {},
      { admin_analytics_timeseries: timeseriesPayload({ dataStartsAt: "2026-06-29" }) },
    );

    await fetchAnalyticsTimeseries({ from: "2026-07-19", to: "2026-08-17" });

    expect(holder.admin.calls.filter((c) => c.op === "rpc")).toHaveLength(1);
  });

  it("returns query_failed when the rpc errors", async () => {
    configureEnv();
    holder.admin = makeSupabaseMock({}, {}); // rpc not configured → error

    const result = await fetchAnalyticsTimeseries(RANGE);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.reason).toBe("query_failed");
  });

  /**
   * The one error a reader can act on. PGRST202 means the ranged overload has
   * not been applied yet; the raw text is a paragraph about schema cache
   * lookups that sends a moderator to us instead of to the fix.
   */
  it("names the migration when the ranged function is missing", async () => {
    configureEnv();
    holder.admin = makeSupabaseMock({}, {});
    holder.admin.rpc = async () => ({
      data: null,
      error: { code: "PGRST202", message: "Searched for the function … schema cache" },
    });

    const result = await fetchAnalyticsTimeseries(RANGE);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.message).toContain("20260817000000_admin_analytics_timeseries_ranged.sql");
  });
});

describe("likeRate", () => {
  /**
   * The mock returns one count for every query against a table, so a fixture
   * cannot express "370 likes and 1081 passes". These assert the SHAPE of the
   * maths instead: that the metric is a percentage, that it is filtered by
   * interaction_type at all, and that an empty window does not divide by zero.
   */
  function setup(swipeCount: number) {
    configureEnv();
    holder.admin = makeSupabaseMock({
      "identity.accounts": { count: 1 },
      "pets.pets": { count: 1, rows: [] },
      "matching.matches": { count: 1 },
      "chat.conversations": { count: 1 },
      "identity.account_verifications": { count: 0 },
      "matching.pet_reports": { count: 0 },
      "matching.pet_likes": { count: swipeCount },
    });
    holder.reference = makeSupabaseMock({ "pets.species": { rows: [] } });
    return holder.admin;
  }

  it("filters pet_likes by interaction_type rather than counting every swipe", async () => {
    const mock = setup(100);
    await fetchAnalyticsSummary(RANGE);

    const types = mock.calls
      .filter((c) => c.key === "matching.pet_likes")
      .flatMap((c) => c.filters ?? [])
      .filter((f) => f.method === "eq" && f.args[0] === "interaction_type")
      .map((f) => f.args[1]);

    // Both directions, in both the current and the prior window.
    expect(types).toEqual(["like", "pass", "like", "pass"]);
  });

  it("expresses the rate as a percentage", async () => {
    setup(100); // every count returns 100 → 100/(100+100) = 50%
    const result = await fetchAnalyticsSummary(RANGE);
    expect(result.ok && result.data.metrics.likeRate.current).toBe(50);
  });

  it("reports an unknown rate rather than NaN when nothing was swiped", async () => {
    setup(0);
    const result = await fetchAnalyticsSummary(RANGE);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    // 0/0 is not "0% and falling" — changePct guards the numerator too, which
    // the shared `changePct` helper alone does not do.
    expect(result.data.metrics.likeRate.current).toBe(0);
    expect(result.data.metrics.likeRate.changePct).toBeNull();
  });
});

describe("range maths", () => {
  const NOW = new Date("2026-08-17T09:30:00Z");

  it.each([
    ["7d", "2026-08-11"],
    ["30d", "2026-07-19"],
    ["90d", "2026-05-20"],
    ["month", "2026-07-19"],
    ["year", "2025-08-18"],
  ] as const)("resolves the %s preset", (preset, from) => {
    expect(resolveRange(preset, undefined, undefined, NOW)).toEqual({ from, to: "2026-08-17" });
  });

  it("honours a valid custom range and falls back on a broken one", () => {
    expect(resolveRange("custom", "2026-08-01", "2026-08-10", NOW)).toEqual({
      from: "2026-08-01",
      to: "2026-08-10",
    });
    // Inverted and incomplete ranges degrade to the default rather than throwing.
    expect(resolveRange("custom", "2026-08-10", "2026-08-01", NOW).from).toBe("2026-07-19");
    expect(resolveRange("custom", undefined, undefined, NOW).from).toBe("2026-07-19");
  });

  it("counts days inclusively at both ends", () => {
    expect(daysBetween("2026-08-17", "2026-08-17")).toBe(1);
    expect(daysBetween("2026-08-11", "2026-08-17")).toBe(7);
  });

  /** Boundaries, because an off-by-one here silently changes every axis. */
  it.each([
    ["2026-07-04", "2026-08-17", "day"], // 45 days
    ["2026-07-03", "2026-08-17", "week"], // 46
    ["2026-02-19", "2026-08-17", "week"], // 180
    ["2026-02-18", "2026-08-17", "month"], // 181
  ] as const)("buckets %s→%s as %s", (from, to, expected) => {
    expect(bucketFor(from, to)).toBe(expected);
  });

  it("puts the previous window immediately before, at equal length", () => {
    // 30 days ending 08-17 → the 30 days ending the day before it starts.
    expect(previousWindow({ from: "2026-07-19", to: "2026-08-17" })).toEqual({
      from: "2026-06-19",
      to: "2026-07-18",
    });
  });

  it("labels the comparison with the window length", () => {
    expect(comparisonLabel({ from: "2026-07-19", to: "2026-08-17" })).toBe("vs previous 30 days");
    expect(comparisonLabel({ from: "2026-08-17", to: "2026-08-17" })).toBe("vs previous day");
  });
});
