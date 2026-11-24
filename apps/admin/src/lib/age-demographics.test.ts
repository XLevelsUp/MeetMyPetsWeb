import { describe, expect, it } from "vitest";

import {
  ageInYears,
  countByBucket,
  PERSON_AGE_BUCKETS,
  personAgeBucket,
  personDobs,
  PET_AGE_BUCKETS,
  petAgeBucket,
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
  it("puts pets in the right band at each edge", () => {
    expect([0, 1, 2, 3, 6, 7, 10, 11, 27].map(petAgeBucket)).toEqual([
      "under1", "1to2", "1to2", "3to6", "3to6", "7to10", "7to10", "11plus", "11plus",
    ]);
    expect(petAgeBucket(null)).toBe("unknown");
  });

  it("puts people in the right band at each edge", () => {
    expect([16, 18, 24, 25, 34, 35, 44, 45, 54, 55, 84].map(personAgeBucket)).toEqual([
      "under18", "18to24", "18to24", "25to34", "25to34", "35to44", "35to44", "45to54", "45to54", "55plus", "55plus",
    ]);
  });

  it("returns every band in order, zeros included", () => {
    const result = countByBucket(PET_AGE_BUCKETS, ["2026-01-01", null, "2015-01-01"], petAgeBucket, now);
    expect(result.map((r) => r.key)).toEqual([...PET_AGE_BUCKETS]);
    expect(result.find((r) => r.key === "under1")?.count).toBe(1);
    expect(result.find((r) => r.key === "11plus")?.count).toBe(1);
    expect(result.find((r) => r.key === "unknown")?.count).toBe(1);
    expect(result.find((r) => r.key === "3to6")?.count).toBe(0);
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
