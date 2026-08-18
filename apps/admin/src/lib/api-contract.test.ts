import { describe, expect, it } from "vitest";

import {
  analyticsRangeQuerySchema,
  analyticsSummarySchema,
  analyticsTimeseriesSchema,
  metricValueSchema,
} from "@/lib/api-contract";

describe("metricValueSchema", () => {
  it("accepts a well-formed metric with a null changePct", () => {
    const parsed = metricValueSchema.parse({ current: 10, previous: 8, changePct: null });
    expect(parsed).toEqual({ current: 10, previous: 8, changePct: null });
  });

  it("rejects a missing field", () => {
    expect(() => metricValueSchema.parse({ current: 1, previous: 2 })).toThrow();
  });

  it("rejects a non-numeric current", () => {
    expect(() => metricValueSchema.parse({ current: "1", previous: 2, changePct: 0 })).toThrow();
  });
});

describe("analyticsSummarySchema", () => {
  it("round-trips a full payload", () => {
    const payload = {
      generatedAt: new Date().toISOString(),
      metrics: {
        totalUsers: { current: 36, previous: 0, changePct: null },
        activePets: { current: 55, previous: 0, changePct: null },
        totalMatches: { current: 50, previous: 0, changePct: null },
        activeChats: { current: 12, previous: 10, changePct: 20 },
        pendingVerifications: { current: 0, previous: 0, changePct: null },
        openReports: { current: 0, previous: 0, changePct: null },
        // A percentage, not a count — the card formats it, the schema does not
        // distinguish it.
        likeRate: { current: 25.5, previous: 23.4, changePct: 9 },
      },
      activePetsBySpecies: [{ species: "Dog", count: 30 }],
      // The window the deltas were measured over — the cards label themselves
      // from it, so it is required rather than optional.
      from: "2026-07-19",
      to: "2026-08-17",
    };
    expect(analyticsSummarySchema.parse(payload)).toEqual(payload);
  });

  it("rejects a non-ISO generatedAt", () => {
    expect(() =>
      analyticsSummarySchema.parse({ generatedAt: "yesterday", metrics: {}, activePetsBySpecies: [] }),
    ).toThrow();
  });
});

describe("analyticsTimeseriesSchema", () => {
  it("accepts the rpc payload shape", () => {
    const payload = {
      from: "2026-08-01",
      to: "2026-08-06",
      bucket: "day",
      dataStartsAt: "2026-06-29",
      userAcquisition: [{ date: "2026-08-06", value: 3 }],
      swipeLikes: [{ date: "2026-08-06", value: 70 }],
      swipePasses: [{ date: "2026-08-06", value: 202 }],
    };
    expect(analyticsTimeseriesSchema.parse(payload)).toEqual(payload);
  });

  /**
   * Guards the migration/app handshake. If the ranged function is ever applied
   * from an older copy that still returns a single `swipeVolume`, this fails
   * loudly here rather than rendering an empty chart.
   */
  it("rejects the pre-split payload that returns one swipeVolume series", () => {
    expect(() =>
      analyticsTimeseriesSchema.parse({
        from: "2026-08-01",
        to: "2026-08-06",
        bucket: "day",
        dataStartsAt: null,
        userAcquisition: [],
        swipeVolume: [{ date: "2026-08-06", value: 272 }],
      }),
    ).toThrow();
  });

  it("accepts a null dataStartsAt — an empty database is not an error", () => {
    const payload = {
      from: "2026-08-01",
      to: "2026-08-06",
      bucket: "week",
      dataStartsAt: null,
      userAcquisition: [],
      swipeLikes: [],
      swipePasses: [],
    };
    expect(analyticsTimeseriesSchema.parse(payload).dataStartsAt).toBeNull();
  });

  it("rejects a bucket the SQL side would not accept", () => {
    expect(() =>
      analyticsTimeseriesSchema.parse({
        from: "2026-08-01",
        to: "2026-08-06",
        bucket: "fortnight",
        dataStartsAt: null,
        userAcquisition: [],
        swipeLikes: [],
        swipePasses: [],
      }),
    ).toThrow();
  });

  it("rejects when a series is not an array", () => {
    expect(() =>
      analyticsTimeseriesSchema.parse({
        from: "2026-08-01",
        to: "2026-08-06",
        bucket: "day",
        dataStartsAt: null,
        userAcquisition: {},
        swipeLikes: [],
        swipePasses: [],
      }),
    ).toThrow();
  });
});

describe("analyticsRangeQuerySchema", () => {
  it("defaults an empty query to the 30-day preset", () => {
    expect(analyticsRangeQuerySchema.parse({})).toEqual({
      preset: "30d",
      from: undefined,
      to: undefined,
    });
  });

  it("degrades a hand-edited query string instead of rejecting it", () => {
    // A bad preset or a non-ISO date must not 400 an admin out of the page.
    expect(analyticsRangeQuerySchema.parse({ preset: "fortnight" }).preset).toBe("30d");
    expect(analyticsRangeQuerySchema.parse({ preset: "custom", from: "last tuesday" })).toMatchObject(
      { preset: "custom", from: undefined },
    );
  });

  it("keeps a well-formed custom range", () => {
    expect(
      analyticsRangeQuerySchema.parse({ preset: "custom", from: "2026-07-01", to: "2026-07-31" }),
    ).toEqual({ preset: "custom", from: "2026-07-01", to: "2026-07-31" });
  });
});
