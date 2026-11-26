import { describe, expect, it } from "vitest";

import { dayKey, dayLabel, filterByDateRange, filterHistory, monthRange, paginate, senderOptions, SYSTEM_SENDER, whenIso } from "@/lib/team-history";

const base = { sendAt: null, sentAt: null, deletedAt: null, createdAt: "2026-01-01T00:00:00Z" };

describe("team history date filter", () => {
  it("uses the same date as the When column for each tab", () => {
    expect(whenIso({ ...base, state: "scheduled", sendAt: "2026-12-05T09:30:00Z" })).toBe("2026-12-05T09:30:00Z");
    expect(whenIso({ ...base, state: "sent", sentAt: "2026-11-20T00:00:00Z" })).toBe("2026-11-20T00:00:00Z");
    expect(whenIso({ ...base, state: "sent" })).toBe(base.createdAt);
    expect(whenIso({ ...base, state: "deleted", deletedAt: "2026-11-22T00:00:00Z" })).toBe("2026-11-22T00:00:00Z");
    expect(whenIso({ ...base, state: "cancelled" })).toBe(base.createdAt);
  });

  it("cuts days at the viewer's midnight, not UTC's", () => {
    expect(dayKey("2026-11-30T20:00:00Z", 0)).toBe("2026-11-30");
    expect(dayKey("2026-11-30T20:00:00Z", 330)).toBe("2026-12-01");
    expect(dayKey("2026-12-01T02:00:00Z", -300)).toBe("2026-11-30");
    expect(dayKey(null, 330)).toBeNull();
  });

  it("filters From/To inclusively, open on either side, and accepts a backwards range", () => {
    const rows = ["2026-11-01T08:00:00Z", "2026-11-30T08:00:00Z", "2026-12-15T08:00:00Z", "2025-11-10T08:00:00Z"].map((d) => ({ ...base, state: "sent", sentAt: d }));
    expect(filterByDateRange(rows, "2026-11-01", "2026-11-30", 330)).toHaveLength(2);
    expect(filterByDateRange(rows, "2026-11-30", "2026-11-01", 330)).toHaveLength(2);
    expect(filterByDateRange(rows, "2026-11-15", undefined, 330)).toHaveLength(2);
    expect(filterByDateRange(rows, undefined, "2026-01-01", 330)).toHaveLength(1);
    expect(filterByDateRange(rows, undefined, undefined, 330)).toHaveLength(4);
  });

  it("builds this, last and next month ranges, across year ends too", () => {
    const now = new Date(2026, 10, 25);
    expect(monthRange(0, now)).toEqual({ from: "2026-11-01", to: "2026-11-30" });
    expect(monthRange(-1, now)).toEqual({ from: "2026-10-01", to: "2026-10-31" });
    expect(monthRange(1, now)).toEqual({ from: "2026-12-01", to: "2026-12-31" });
    expect(monthRange(1, new Date(2026, 11, 5))).toEqual({ from: "2027-01-01", to: "2027-01-31" });
    expect(dayLabel("2026-11-25")).toBe("25 Nov 2026");
  });

  it("pages and clamps an out-of-range page to the last one", () => {
    const items = Array.from({ length: 7 }, (_, i) => i);
    expect(paginate(items, 2, 3)).toEqual({ items: [3, 4, 5], page: 2, pageSize: 3, total: 7 });
    expect(paginate(items, 9, 3)).toEqual({ items: [6], page: 3, pageSize: 3, total: 7 });
    expect(paginate([], 4, 3)).toEqual({ items: [], page: 1, pageSize: 3, total: 0 });
  });
});

describe("team history filters", () => {
  const msg = (email: string | null, audience: string | null, body: string, sentAt = "2026-11-10T08:00:00Z") => ({
    ...base, state: "sent", sentAt, createdByEmail: email, createdByRole: email ? "moderator" : null, audience, body,
  });
  const items = [
    msg("Dev-Admin@meetmypets.app", "all", "Vaccination camp this Sunday"),
    msg("dev-admin@meetmypets.app", "pet", "Hello Snowbell", "2026-10-02T08:00:00Z"),
    msg("qa.tester@meetmypets.app", "all", "Test broadcast"),
    msg(null, null, "Welcome to MeetMyPets"),
  ];

  it("lists each sender once, busiest first, with automatic rows as System", () => {
    expect(senderOptions(items).map((s) => [s.value, s.count])).toEqual([
      ["dev-admin@meetmypets.app", 2],
      ["qa.tester@meetmypets.app", 1],
      [SYSTEM_SENDER, 1],
    ]);
  });

  it("narrows by sender (any letter case), audience, text and dates together", () => {
    expect(filterHistory(items, { tz: 330, sender: "DEV-ADMIN@meetmypets.app" })).toHaveLength(2);
    expect(filterHistory(items, { tz: 330, sender: SYSTEM_SENDER })).toHaveLength(1);
    expect(filterHistory(items, { tz: 330, audience: "all" })).toHaveLength(2);
    expect(filterHistory(items, { tz: 330, q: "  CAMP " })).toHaveLength(1);
    expect(filterHistory(items, { tz: 330, sender: "dev-admin@meetmypets.app", from: "2026-10-01", to: "2026-10-31" })).toHaveLength(1);
    expect(filterHistory(items, { tz: 330, sender: "dev-admin@meetmypets.app", audience: "all", q: "hello" })).toHaveLength(0);
  });
});
