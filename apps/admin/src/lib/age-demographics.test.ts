import { describe, expect, it } from "vitest";

import {
  ageInYears,
  countByBucket,
  PERSON_AGE_BUCKETS,
  personAgeBucket,
  personDobs,
} from "@/lib/age-demographics";

const now = new Date(2026, 10, 24);

describe("ageInYears", () => {
  it("counts whole years and respects the birthday", () => {
    expect(ageInYears("2002-11-24", now)).toBe(24);
    expect(ageInYears("2002-11-25", now)).toBe(23);
    expect(ageInYears("2026-06-01", now)).toBe(0);
  });

  it("treats missing, malformed, future and absurd dates as unknown", () => {
    expect(ageInYears(null, now)).toBeNull();
    expect(ageInYears("not a date", now)).toBeNull();
    expect(ageInYears("2027-01-01", now)).toBeNull();
    expect(ageInYears("1850-01-01", now)).toBeNull();
  });
});

describe("buckets", () => {
  it("puts people in the right band at each edge", () => {
    expect([16, 18, 24, 25, 34, 35, 44, 45, 54, 55, 84].map(personAgeBucket)).toEqual([
      "under18", "18to24", "18to24", "25to34", "25to34", "35to44", "35to44", "45to54", "45to54", "55plus", "55plus",
    ]);
  });

  it("returns every band in order, zeros included", () => {
    const result = countByBucket(PERSON_AGE_BUCKETS, ["2012-01-01", null, "1960-01-01"], personAgeBucket, now);
    expect(result.map((r) => r.key)).toEqual([...PERSON_AGE_BUCKETS]);
    expect(result.find((r) => r.key === "under18")?.count).toBe(1);
    expect(result.find((r) => r.key === "55plus")?.count).toBe(1);
    expect(result.find((r) => r.key === "unknown")?.count).toBe(1);
    expect(result.find((r) => r.key === "35to44")?.count).toBe(0);
  });
});

describe("personDobs", () => {
  it("counts every live account once, deleted ones not at all, missing profiles as unknown", () => {
    const dobs = personDobs(
      [
        { id: "a", deleted_at: null },
        { id: "b", deleted_at: null },
        { id: "c", deleted_at: "2026-01-01" },
      ],
      [
        { account_id: "a", date_of_birth: "1990-05-05" },
        { account_id: "c", date_of_birth: "1980-05-05" },
      ],
    );
    expect(dobs).toEqual(["1990-05-05", null]);
    const total = countByBucket(PERSON_AGE_BUCKETS, dobs, personAgeBucket, now).reduce((s, r) => s + r.count, 0);
    expect(total).toBe(2);
  });
});
