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

function configureEnv() {
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://example.supabase.co");
  vi.stubEnv("SUPABASE_SECRET_KEY", "sb_secret_test");
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "sb_publishable_test");
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

    const result = await fetchAnalyticsSummary();
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

    await fetchAnalyticsSummary();

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
    const result = await fetchAnalyticsSummary();
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

    const result = await fetchAnalyticsSummary();
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

    const result = await fetchAnalyticsSummary();
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.reason).toBe("query_failed");
    expect(result.message).toContain("boom");
  });
});

describe("fetchAnalyticsTimeseries", () => {
  it("returns unconfigured when env vars are missing", async () => {
    const result = await fetchAnalyticsTimeseries(30);
    expect(result).toEqual({ ok: false, reason: "unconfigured", message: expect.any(String) });
  });

  it("returns the validated rpc payload on the happy path", async () => {
    configureEnv();
    const payload = {
      days: 7,
      userAcquisition: [{ date: "2026-08-06", value: 3 }],
      swipeVolume: [{ date: "2026-08-06", value: 272 }],
    };
    holder.admin = makeSupabaseMock({}, { admin_analytics_timeseries: payload });

    const result = await fetchAnalyticsTimeseries(7);
    expect(result).toEqual({ ok: true, data: payload });
  });

  it("returns query_failed when the rpc errors", async () => {
    configureEnv();
    holder.admin = makeSupabaseMock({}, {}); // rpc not configured → error

    const result = await fetchAnalyticsTimeseries(30);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.reason).toBe("query_failed");
  });
});
