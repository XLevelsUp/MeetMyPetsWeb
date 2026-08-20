import { afterEach, describe, expect, it, vi } from "vitest";

import { makeSupabaseMock, type SupabaseMock, type TableResult } from "@/test/supabase-mock";

const holder = vi.hoisted(() => ({
  admin: null as SupabaseMock | null,
  configured: true,
}));

vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: () => holder.admin }));
vi.mock("@/lib/supabase/reference", () => ({
  createReferenceClient: () => holder.admin,
  isSupabaseConfigured: () => holder.configured,
}));

import { listReports, resolveReport, trustStatusFor } from "@/lib/reports";
import type { ReportsQuery } from "@/lib/reports-contract";

const REPORT_ID = "11111111-1111-1111-1111-111111111111";
const REPORTED_PET = "22222222-2222-2222-2222-222222222222";
const REPORTER_PET = "33333333-3333-3333-3333-333333333333";
const OWNER_ID = "44444444-4444-4444-4444-444444444444";
const POST_ID = "55555555-5555-5555-5555-555555555555";
const ACTOR_ID = "99999999-9999-9999-9999-999999999999";

const ACTOR = { userId: ACTOR_ID, email: "mod@meetmypets.dev", role: "moderator" as const };

const baseQuery: ReportsQuery = {
  page: 1,
  pageSize: 25,
  q: undefined,
  status: "pending",
  reason: "all",
  scope: "all",
};

const REPORT_ROW = {
  id: REPORT_ID,
  reporter_pet_id: REPORTER_PET,
  reported_pet_id: REPORTED_PET,
  reporter_account_id: OWNER_ID,
  reason: "harassment",
  details: "Kept messaging after being asked to stop",
  status: "pending",
  context_entity_type: null,
  context_entity_id: null,
  created_at: "2026-08-11T10:00:00Z",
};

const PET_ROWS = [
  {
    id: REPORTED_PET,
    name: "Biscuit",
    owner_account_id: OWNER_ID,
    trust_score: 40,
    temporary_ban_until: "2026-08-20T00:00:00Z",
  },
  {
    id: REPORTER_PET,
    name: "Mango",
    owner_account_id: "other",
    trust_score: 555,
    temporary_ban_until: null,
  },
];

function setup(tables: Record<string, TableResult>) {
  holder.admin = makeSupabaseMock(tables);
  return holder.admin;
}

afterEach(() => {
  holder.admin = null;
  holder.configured = true;
});

describe("trustStatusFor", () => {
  it("mirrors the backend's pets.get_pet_trust_status thresholds", () => {
    expect(trustStatusFor(null)).toBeNull();
    // <= 0, not just 0: a score can go negative and must not read as "warning".
    expect(trustStatusFor(-40)).toBe("permanently_banned");
    expect(trustStatusFor(0)).toBe("permanently_banned");
    expect(trustStatusFor(1)).toBe("temporary_banned");
    expect(trustStatusFor(99)).toBe("temporary_banned");
    expect(trustStatusFor(100)).toBe("warning");
    expect(trustStatusFor(250)).toBe("warning");
    expect(trustStatusFor(251)).toBe("normal");
    expect(trustStatusFor(555)).toBe("normal");
  });
});

describe("listReports", () => {
  it("returns unconfigured when env vars are missing", async () => {
    holder.configured = false;
    const result = await listReports(baseQuery);
    expect(result).toEqual({
      ok: false,
      reason: "unconfigured",
      message: "Supabase env vars are not set.",
    });
  });

  it("hydrates a profile-scoped report across the schema boundary", async () => {
    setup({
      "matching.pet_reports": { rows: [REPORT_ROW], count: 1 },
      "pets.pets": { rows: PET_ROWS },
      "identity.accounts": { rows: [{ id: OWNER_ID, email: "owner@example.com" }] },
    });

    const result = await listReports(baseQuery);
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const [item] = result.data.items;
    expect(item.id).toBe(REPORT_ID);
    expect(item.scope).toBe("profile");
    expect(item.post).toBeNull();
    expect(item.reportedPetName).toBe("Biscuit");
    expect(item.reporterPetName).toBe("Mango");
    expect(item.reportedOwnerAccountId).toBe(OWNER_ID);
    expect(item.reportedOwnerEmail).toBe("owner@example.com");
    expect(item.trust).toEqual({
      score: 40,
      status: "temporary_banned",
      bannedUntil: "2026-08-20T00:00:00Z",
    });
    expect(result.data.total).toBe(1);
  });

  it("attaches the post for a post-scoped report", async () => {
    setup({
      "matching.pet_reports": {
        rows: [{ ...REPORT_ROW, context_entity_type: "post", context_entity_id: POST_ID }],
        count: 1,
      },
      "pets.pets": { rows: PET_ROWS },
      "identity.accounts": { rows: [{ id: OWNER_ID, email: "owner@example.com" }] },
      "social.posts": {
        rows: [
          {
            id: POST_ID,
            caption: "Look at this",
            created_at: "2026-08-10T09:00:00Z",
            deleted_at: null,
          },
        ],
      },
    });

    const result = await listReports(baseQuery);
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const [item] = result.data.items;
    expect(item.scope).toBe("post");
    expect(item.post).toEqual({
      id: POST_ID,
      caption: "Look at this",
      createdAt: "2026-08-10T09:00:00Z",
      deletedAt: null,
    });
  });

  it("degrades gracefully when a referenced pet or owner is gone", async () => {
    setup({
      "matching.pet_reports": { rows: [REPORT_ROW], count: 1 },
      "pets.pets": { rows: [] },
      "identity.accounts": { rows: [] },
    });

    const result = await listReports(baseQuery);
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const [item] = result.data.items;
    expect(item.reportedPetName).toBeNull();
    expect(item.reportedOwnerAccountId).toBeNull();
    expect(item.reportedOwnerEmail).toBeNull();
    expect(item.trust).toEqual({ score: null, status: null, bannedUntil: null });
  });

  it("skips the hydration fan-out entirely when the page is empty", async () => {
    const mock = setup({ "matching.pet_reports": { rows: [], count: 0 } });

    const result = await listReports(baseQuery);
    expect(result).toEqual({ ok: true, data: { items: [], page: 1, pageSize: 25, total: 0 } });
    // Only the report query ran — no pets/accounts/posts lookups for zero rows.
    expect(mock.calls.filter((c) => c.op === "select")).toHaveLength(1);
  });

  it("counts every report against a pet, not just the ones on this page", async () => {
    setup({
      "matching.pet_reports": {
        rows: [
          REPORT_ROW,
          { ...REPORT_ROW, id: "other", reported_pet_id: REPORTED_PET },
          { ...REPORT_ROW, id: "third", reported_pet_id: REPORTED_PET },
        ],
        count: 3,
      },
      "pets.pets": { rows: PET_ROWS },
      "identity.accounts": { rows: [{ id: OWNER_ID, email: "owner@example.com" }] },
    });

    const result = await listReports(baseQuery);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.items[0].reportsAgainstPet).toBe(3);
  });

  it("surfaces a query failure as query_failed rather than throwing", async () => {
    setup({ "matching.pet_reports": { error: { message: "permission denied" } } });

    const result = await listReports(baseQuery);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.reason).toBe("query_failed");
    expect(result.message).toContain("permission denied");
  });
});

const TRUST_EVENT_ID = "66666666-6666-6666-6666-666666666666";

describe("resolveReport", () => {
  /**
   * A dismissal now also credits the trust deduction back, so the happy path
   * needs the ledger, the pet and our reversals table wired up. A profile
   * report at -80 against a pet on 300 → 380, which is nowhere near 555.
   */
  function setupResolve(overrides: Record<string, TableResult> = {}) {
    return setup({
      "matching.pet_reports#select": { single: { ...REPORT_ROW } },
      "matching.pet_reports#update": { rows: [{ id: REPORT_ID }] },
      "public.admin_audit_logs": {},
      "pets.trust_score_events": { rows: [{ id: TRUST_EVENT_ID, delta: -80 }] },
      "pets.pets": { single: { trust_score: 300 } },
      "public.admin_trust_reversals#select": { rows: [] },
      "public.admin_trust_reversals#insert": {},
      "pets.pets#update": { rows: [{ id: REPORTED_PET }] },
      ...overrides,
    });
  }

  it("rejects a non-uuid id without touching the database", async () => {
    const mock = setupResolve();
    const result = await resolveReport("not-a-uuid", "dismissed", "Looks fine to me", ACTOR);
    expect(result).toEqual({ ok: false, reason: "not_found", message: "No report with that id." });
    expect(mock.calls).toHaveLength(0);
  });

  it("writes only `status`, then the audit row, in that order", async () => {
    const mock = setupResolve();

    const result = await resolveReport(REPORT_ID, "actioned", "Flagged the pet as well", ACTOR);
    // `actioned` means the report WAS legitimate, so trust is untouched.
    expect(result).toEqual({ ok: true, revert: null });

    const update = mock.calls.find((c) => c.op === "update");
    // The grant is column-scoped to `status`; sending anything else would be
    // rejected by Postgres, so the adapter must never build a wider payload.
    expect(update?.values).toEqual({ status: "actioned" });

    const audit = mock.calls.find((c) => c.op === "insert");
    expect(audit?.key).toBe("public.admin_audit_logs");
    expect(mock.calls.indexOf(update!)).toBeLessThan(mock.calls.indexOf(audit!));
  });

  it("maps each resolution onto its own audit action and records the transition", async () => {
    for (const [resolution, action] of [
      ["reviewed", "report.review"],
      ["actioned", "report.action"],
      ["dismissed", "report.dismiss"],
    ] as const) {
      const mock = setupResolve();
      await resolveReport(REPORT_ID, resolution, "A sufficiently long reason", ACTOR);

      // Named by table, not just "the first insert": a dismissal also inserts
      // a trust-reversal row, and it comes first.
      const audit = mock.calls.find(
        (c) => c.op === "insert" && c.key === "public.admin_audit_logs",
      )?.values as Record<string, unknown>;
      expect(audit.action).toBe(action);
      expect(audit.target_type).toBe("report");
      expect(audit.target_id).toBe(REPORT_ID);
      expect(audit.metadata).toMatchObject({
        previousStatus: "pending",
        newStatus: resolution,
        reportedPetId: REPORTED_PET,
        scope: "profile",
      });
    }
  });

  /**
   * These assert the RECORDED CALLS — which filters were built, which tables
   * were written — rather than the returned rows. The mock replays its fixture
   * regardless of what was chained, so a row-based assertion would pass just as
   * happily against an adapter that credited the wrong pet, or every pet.
   */
  describe("trust reversal on dismissal", () => {
    it("credits the deduction back and records the reversal", async () => {
      const mock = setupResolve();
      const result = await resolveReport(REPORT_ID, "dismissed", "Not a real report", ACTOR);

      expect(result).toEqual({
        ok: true,
        revert: { outcome: "reverted", delta: 80, scoreAfter: 380 },
      });

      const scoreUpdate = mock.calls.find((c) => c.op === "update" && c.key === "pets.pets");
      expect(scoreUpdate?.values).toEqual({ trust_score: 380 });

      // Compare-and-swap: PostgREST cannot do `trust_score = trust_score + 80`,
      // so the guard on the OLD value is what makes the read-then-write safe.
      expect(scoreUpdate?.filters).toContainEqual({ args: ["trust_score", 300], method: "eq" });
      expect(scoreUpdate?.filters).toContainEqual({ args: ["id", REPORTED_PET], method: "eq" });

      const reversal = mock.calls.find(
        (c) => c.op === "insert" && c.key === "public.admin_trust_reversals",
      );
      expect(reversal?.values).toMatchObject({
        report_id: REPORT_ID,
        trust_event_id: TRUST_EVENT_ID,
        pet_id: REPORTED_PET,
        delta: 80,
        score_before: 300,
        score_after: 380,
        reverted_by: ACTOR_ID,
      });
      // Only after a CONFIRMED score change — never as a hopeful pre-write.
      expect(mock.calls.indexOf(scoreUpdate!)).toBeLessThan(mock.calls.indexOf(reversal!));
    });

    it("looks the deduction up by the app's own dedup key", async () => {
      const mock = setupResolve();
      await resolveReport(REPORT_ID, "dismissed", "Not a real report", ACTOR);

      const lookup = mock.calls.find((c) => c.key === "pets.trust_score_events");
      // Every column of idx_trust_score_events_identity, so the match is exact
      // rather than "some recent -80 against this pet".
      expect(lookup?.filters).toContainEqual({ args: ["target_pet_id", REPORTED_PET], method: "eq" });
      expect(lookup?.filters).toContainEqual({ args: ["actor_pet_id", REPORTER_PET], method: "eq" });
      expect(lookup?.filters).toContainEqual({ args: ["reason", "report"], method: "eq" });
      // `is`, not `eq`: PostgREST renders eq.null as the literal string "null".
      expect(lookup?.filters).toContainEqual({ args: ["event_ref", null], method: "is" });
    });

    it("uses the post reason and the post id for a post-scoped report", async () => {
      const mock = setupResolve({
        "matching.pet_reports#select": {
          single: { ...REPORT_ROW, context_entity_type: "post", context_entity_id: POST_ID },
        },
        "pets.trust_score_events": { rows: [{ id: TRUST_EVENT_ID, delta: -20 }] },
      });
      const result = await resolveReport(REPORT_ID, "dismissed", "Not a real report", ACTOR);

      const lookup = mock.calls.find((c) => c.key === "pets.trust_score_events");
      expect(lookup?.filters).toContainEqual({ args: ["reason", "post_report"], method: "eq" });
      expect(lookup?.filters).toContainEqual({ args: ["event_ref", POST_ID], method: "eq" });
      // The credit is the magnitude the LEDGER recorded, not our constant.
      expect(result).toMatchObject({ revert: { outcome: "reverted", delta: 20, scoreAfter: 320 } });
    });

    it("blocks a credit that would land on exactly 555", async () => {
      // 475 + 80 = 555, which their trigger reads as a full restore and which
      // would clear a ban this dismissal never adjudicated.
      const mock = setupResolve({ "pets.pets": { single: { trust_score: 475 } } });
      const result = await resolveReport(REPORT_ID, "dismissed", "Not a real report", ACTOR);

      expect(result).toMatchObject({ ok: true, revert: { outcome: "would_restore" } });
      // The dismissal still happened; only the credit was withheld.
      expect(mock.calls.some((c) => c.op === "update" && c.key === "matching.pet_reports")).toBe(true);
      expect(mock.calls.some((c) => c.op === "update" && c.key === "pets.pets")).toBe(false);
      expect(mock.calls.some((c) => c.key === "public.admin_trust_reversals" && c.op === "insert")).toBe(false);
    });

    it("does nothing when no deduction is on record", async () => {
      const mock = setupResolve({ "pets.trust_score_events": { rows: [] } });
      const result = await resolveReport(REPORT_ID, "dismissed", "Not a real report", ACTOR);

      expect(result).toMatchObject({ ok: true, revert: { outcome: "no_deduction" } });
      expect(mock.calls.some((c) => c.op === "update" && c.key === "pets.pets")).toBe(false);
    });

    it("refuses to refund twice for the same ledger row", async () => {
      const mock = setupResolve({
        "public.admin_trust_reversals#select": { rows: [{ id: "existing" }] },
      });
      const result = await resolveReport(REPORT_ID, "dismissed", "Not a real report", ACTOR);

      expect(result).toMatchObject({ ok: true, revert: { outcome: "already_reverted" } });
      expect(mock.calls.some((c) => c.op === "update" && c.key === "pets.pets")).toBe(false);
    });

    it("leaves the deduction alone when another report shares it", async () => {
      // The app dedups on (pet, reporter, reason, ref), so two reports from one
      // reporter share ONE -80. Dismissing one must not refund the other's.
      const mock = setupResolve({
        "matching.pet_reports#select": { single: { ...REPORT_ROW }, rows: [{ id: "sibling" }] },
      });
      const result = await resolveReport(REPORT_ID, "dismissed", "Not a real report", ACTOR);

      expect(result).toMatchObject({ ok: true, revert: { outcome: "still_earned" } });
      expect(mock.calls.some((c) => c.op === "update" && c.key === "pets.pets")).toBe(false);
    });

    it("reports score_moved when the compare-and-swap matches nothing", async () => {
      const mock = setupResolve({ "pets.pets#update": { rows: [] } });
      const result = await resolveReport(REPORT_ID, "dismissed", "Not a real report", ACTOR);

      expect(result).toMatchObject({ ok: true, revert: { outcome: "score_moved" } });
      // No reversal row for a credit that did not land.
      expect(mock.calls.some((c) => c.key === "public.admin_trust_reversals" && c.op === "insert")).toBe(false);
    });

    it("still dismisses the report when the credit fails outright", async () => {
      const mock = setupResolve({
        "pets.trust_score_events": { error: { message: "permission denied" } },
      });
      const result = await resolveReport(REPORT_ID, "dismissed", "Not a real report", ACTOR);

      // The moderator asked for a dismissal; trust plumbing does not veto it.
      expect(result).toMatchObject({ ok: true, revert: { outcome: "failed" } });
      expect(mock.calls.some((c) => c.op === "update" && c.key === "matching.pet_reports")).toBe(true);
    });

    it("records the outcome in the audit metadata even when nothing moved", async () => {
      const mock = setupResolve({ "pets.trust_score_events": { rows: [] } });
      await resolveReport(REPORT_ID, "dismissed", "Not a real report", ACTOR);

      const audit = mock.calls.find(
        (c) => c.op === "insert" && c.key === "public.admin_audit_logs",
      )?.values as { metadata: Record<string, unknown> };
      // "We chose not to" is as much a decision as "we did".
      expect(audit.metadata.trustRevert).toBe("no_deduction");
    });
  });

  it("returns not_found when the report does not exist", async () => {
    setupResolve({ "matching.pet_reports#select": { single: null } });
    const result = await resolveReport(REPORT_ID, "reviewed", "Nothing to see here", ACTOR);
    expect(result).toEqual({ ok: false, reason: "not_found", message: "No report with that id." });
  });

  it("reports `unaudited` when the status changed but the audit write failed", async () => {
    setupResolve({ "public.admin_audit_logs": { error: { message: "audit table down" } } });

    const result = await resolveReport(REPORT_ID, "dismissed", "Duplicate of an older report", ACTOR);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    // The status DID change — saying "failed" outright would be a lie.
    expect(result.reason).toBe("unaudited");
    expect(result.message).toContain("audit table down");
  });

  it("surfaces an update failure as action_failed", async () => {
    setupResolve({
      "matching.pet_reports#update": { error: { message: "permission denied for column reason" } },
    });

    const result = await resolveReport(REPORT_ID, "actioned", "Should not get this far", ACTOR);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.reason).toBe("action_failed");
    expect(result.message).toContain("permission denied");
  });
});
