import { describe, expect, it } from "vitest";

import {
  TRUST_RESTORE_SCORE,
  TRUST_REVIEW_SCORE_CEILING,
  needsReview,
  trustStatusFor,
} from "@/lib/trust-constants";

/**
 * These thresholds are a COPY of `pets.get_pet_trust_status()` in the app
 * team's database. This file is the tripwire: if they move a threshold, their
 * app follows automatically (it only ever receives a status string) while our
 * panel silently keeps the old ladder. Every boundary is pinned here so the
 * divergence surfaces as a failing test rather than a mislabelled ban.
 *
 * Mirrors their own `trust_status_lifecycle_test.dart`, which parses the same
 * boundaries out of the SQL.
 */
describe("trustStatusFor", () => {
  it("returns null for an unknown score rather than guessing", () => {
    // Guessing "normal" would let a pet with no readable score look unrestricted.
    expect(trustStatusFor(null)).toBeNull();
  });

  it("pins every documented boundary", () => {
    const cases: [number, string][] = [
      [-400, "permanently_banned"],
      [-1, "permanently_banned"],
      [0, "permanently_banned"],
      [1, "temporary_banned"],
      [50, "temporary_banned"],
      [99, "temporary_banned"],
      [100, "warning"],
      [173, "warning"], // a real pet sits here
      [250, "warning"],
      [251, "normal"],
      [555, "normal"],
      [630, "normal"],
    ];
    for (const [score, expected] of cases) {
      expect(trustStatusFor(score), `score ${score}`).toBe(expected);
    }
  });

  it("treats a deeply negative score as permanent, not temporary", () => {
    // Their migration documents this deviation from the original spec: with
    // `= 0` instead of `<= 0`, a pet at -400 would fall through to `< 100` and
    // be treated MORE leniently than a pet at 50.
    expect(trustStatusFor(-400)).toBe("permanently_banned");
    expect(trustStatusFor(50)).toBe("temporary_banned");
  });
});

describe("review population", () => {
  it("counts every non-normal status as reviewable", () => {
    expect(needsReview("permanently_banned")).toBe(true);
    expect(needsReview("temporary_banned")).toBe(true);
    expect(needsReview("warning")).toBe(true);
    expect(needsReview("normal")).toBe(false);
    expect(needsReview(null)).toBe(false);
  });

  it("keeps the server-side score ceiling consistent with the ladder", () => {
    // The queue filters on `trust_score <= CEILING` because a function cannot
    // be a PostgREST filter. If the ceiling and the ladder ever disagree, the
    // queue silently drops rows it should show.
    expect(trustStatusFor(TRUST_REVIEW_SCORE_CEILING)).not.toBe("normal");
    expect(trustStatusFor(TRUST_REVIEW_SCORE_CEILING + 1)).toBe("normal");
  });
});

describe("restore score", () => {
  it("is exactly the value their trigger tests for", () => {
    // `IF NEW.trust_score = 555` is an equality test: any other value skips the
    // restoration branch and leaves the ban window stale.
    expect(TRUST_RESTORE_SCORE).toBe(555);
    expect(trustStatusFor(TRUST_RESTORE_SCORE)).toBe("normal");
  });
});
