import { describe, expect, it } from "vitest";

import { checkSchedule, defaultSchedule, from12Hour, localInputToIso, to12Hour, toLocalInput } from "@/lib/team-schedule";

describe("team schedule helpers", () => {
  const now = new Date("2026-11-24T06:00:00Z");

  it("always produces a zoned ISO time the backend can't misread", () => {
    const iso = localInputToIso("2026-12-01T09:00");
    expect(iso).toMatch(/Z$/);
    expect(toLocalInput(iso)).toBe("2026-12-01T09:00");
  });

  it("rejects empty and malformed input", () => {
    expect(localInputToIso("")).toBeNull();
    expect(checkSchedule("", now)).toBe("missing");
    expect(checkSchedule("tomorrow", now)).toBe("missing");
  });

  it("round-trips 12-hour parts, including midnight and noon", () => {
    expect(to12Hour("2026-12-01T00:15")).toEqual({ date: "2026-12-01", hour: 12, minute: 15, period: "am" });
    expect(to12Hour("2026-12-01T12:00")).toEqual({ date: "2026-12-01", hour: 12, minute: 0, period: "pm" });
    expect(to12Hour("2026-12-01T21:05")).toEqual({ date: "2026-12-01", hour: 9, minute: 5, period: "pm" });
    for (const v of ["2026-12-01T00:15", "2026-12-01T12:00", "2026-12-01T21:05", "2026-12-01T09:30"]) {
      expect(from12Hour(to12Hour(v))).toBe(v);
    }
    expect(from12Hour({ date: "", hour: 9, minute: 0, period: "am" })).toBe("");
  });

  it("defaults to today, the next 5-minute slot at least 30 minutes out", () => {
    const noon = new Date(2026, 10, 24, 12, 2, 40);
    expect(defaultSchedule(noon)).toBe("2026-11-24T12:35");
    const onSlot = new Date(2026, 10, 24, 15, 0, 0);
    expect(defaultSchedule(onSlot)).toBe("2026-11-24T15:30");
    const lateNight = new Date(2026, 10, 24, 23, 50, 0);
    expect(defaultSchedule(lateNight)).toBe("2026-11-25T00:20");
    expect(checkSchedule(defaultSchedule(noon), noon)).toBeNull();
  });

  it("requires a future time within a year", () => {
    expect(checkSchedule(toLocalInput("2026-11-24T06:00:30Z"), now)).toBe("past");
    expect(checkSchedule(toLocalInput("2026-11-25T06:00:00Z"), now)).toBeNull();
    expect(checkSchedule(toLocalInput("2027-12-01T06:00:00Z"), now)).toBe("tooFar");
  });
});
