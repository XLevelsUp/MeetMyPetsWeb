import { describe, expect, it } from "vitest";

import { actionTone, targetTypeLabel } from "@/components/audit/audit-format";
import { AUDIT_CSV_COLUMNS } from "@/components/users/csv-columns";
import { AUDIT_ACTIONS } from "@/lib/audit-actions";
import type { AuditEntry } from "@/lib/audit-contract";
import { toCsv } from "@/lib/csv";

describe("actionTone", () => {
  it("gives every known action a colour group", () => {
    for (const action of AUDIT_ACTIONS) {
      expect(["restrict", "restore", "caution", "content", "neutral"]).toContain(actionTone(action));
    }
  });

  it("colours actions against a user red and the reverse green", () => {
    for (const action of ["account.ban", "account.suspend", "trust.ban", "report.action", "certificate.reject", "blog.delete"]) {
      expect(actionTone(action)).toBe("restrict");
    }
    for (const action of ["account.restore", "trust.restore", "report.dismiss", "certificate.approve", "pet.unflag"]) {
      expect(actionTone(action)).toBe("restore");
    }
  });

  it("falls back to neutral for an action this build does not know", () => {
    expect(actionTone("something.new")).toBe("neutral");
  });
});

describe("audit CSV", () => {
  const entry: AuditEntry = {
    id: "a1",
    createdAt: "2026-11-22T10:00:00.000Z",
    actorId: "u1",
    actorEmail: "mod@example.invalid",
    actorRole: "moderator",
    action: "report.action",
    targetType: "report",
    targetId: "r1",
    reason: "=cmd looks like a formula",
    metadata: { trustPenalty: "penalized", trustDelta: -80 },
  };

  it("writes readable labels beside the raw codes, and metadata as JSON", () => {
    const csv = toCsv([entry], AUDIT_CSV_COLUMNS);
    const [head, row] = csv.split("\r\n");
    expect(head).toContain("Action code");
    expect(row).toContain("report.action");
    expect(row).toContain(targetTypeLabel("report"));
    expect(row).toContain('""trustPenalty"":""penalized""');
  });

  it("defuses a reason that starts like a spreadsheet formula", () => {
    const csv = toCsv([entry], AUDIT_CSV_COLUMNS);
    expect(csv).toContain("'=cmd looks like a formula");
  });
});
