import { describe, expect, it } from "vitest";

import { countdownLabel, countdownTone, DAY_THRESHOLDS, daysLeft } from "@/lib/day-thresholds";

const NOW = Date.parse("2026-11-21T12:00:00Z");
const DAY = 86_400_000;
const at = (offsetMs: number) => new Date(NOW + offsetMs).toISOString();
const { red, amber } = DAY_THRESHOLDS.countdown;

describe("countdownTone", () => {
  it("returns null when there is no date or it is unreadable", () => {
    expect(countdownTone(null, NOW)).toBeNull();
    expect(countdownTone("not a date", NOW)).toBeNull();
  });

  it("is past the moment the date has gone", () => {
    expect(countdownTone(at(-1), NOW)).toBe("past");
  });

  it("is red from now through the red threshold, inclusive", () => {
    expect(countdownTone(at(0), NOW)).toBe("red");
    expect(countdownTone(at(red * DAY), NOW)).toBe("red");
  });

  it("is amber after the red threshold through the amber threshold, inclusive", () => {
    expect(countdownTone(at(red * DAY + 1), NOW)).toBe("amber");
    expect(countdownTone(at(amber * DAY), NOW)).toBe("amber");
  });

  it("is green beyond the amber threshold", () => {
    expect(countdownTone(at(amber * DAY + 1), NOW)).toBe("green");
    expect(countdownTone(at(365 * DAY), NOW)).toBe("green");
  });
});

describe("daysLeft and countdownLabel", () => {
  it("rounds up partial days and never goes negative", () => {
    expect(daysLeft(at(0.2 * DAY), NOW)).toBe(1);
    expect(daysLeft(at(5 * DAY), NOW)).toBe(5);
    expect(daysLeft(at(-3 * DAY), NOW)).toBe(0);
  });

  it("reads as today, days, then months", () => {
    expect(countdownLabel(0)).toBe("today");
    expect(countdownLabel(5)).toBe("in 5d");
    expect(countdownLabel(120)).toBe("in 4mo");
  });
});
