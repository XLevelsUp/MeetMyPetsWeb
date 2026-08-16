import { describe, expect, it } from "vitest";

import {
  analyticsSummarySchema,
  analyticsTimeseriesSchema,
  metricValueSchema,
  timeseriesDaysSchema,
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
      },
      activePetsBySpecies: [{ species: "Dog", count: 30 }],
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
      days: 7,
      userAcquisition: [{ date: "2026-08-06", value: 3 }],
      swipeVolume: [{ date: "2026-08-06", value: 272 }],
    };
    expect(analyticsTimeseriesSchema.parse(payload)).toEqual(payload);
  });

  it("rejects when a series is not an array", () => {
    expect(() =>
      analyticsTimeseriesSchema.parse({ days: 7, userAcquisition: {}, swipeVolume: [] }),
    ).toThrow();
  });
});

describe("timeseriesDaysSchema", () => {
  it("coerces a valid numeric string", () => {
    expect(timeseriesDaysSchema.parse("45")).toBe(45);
  });

  it("falls back to 30 below the minimum", () => {
    expect(timeseriesDaysSchema.parse("5")).toBe(30);
  });

  it("falls back to 30 above the maximum", () => {
    expect(timeseriesDaysSchema.parse("100")).toBe(30);
  });

  it("falls back to 30 on garbage", () => {
    expect(timeseriesDaysSchema.parse("abc")).toBe(30);
  });
});
