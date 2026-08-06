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
    // No reports table exists — always a true zero.
    expect(result.data.metrics.openReports).toEqual({ current: 0, previous: 0, changePct: null });
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
