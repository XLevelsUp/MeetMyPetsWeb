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

import { getTrustLedger, listTrustQueue, restoreTrust } from "@/lib/trust";
import type { TrustQuery } from "@/lib/trust-contract";

const BANNED_PET = "11111111-1111-1111-1111-111111111111";
const OWNER_ID = "22222222-2222-2222-2222-222222222222";
const ACTOR_PET = "33333333-3333-3333-3333-333333333333";
const ACTOR_ID = "99999999-9999-9999-9999-999999999999";

const ACTOR = { userId: ACTOR_ID, email: "boss@meetmypets.dev", role: "super_admin" as const };

const baseQuery: TrustQuery = {
  page: 1,
  pageSize: 25,
  q: undefined,
  status: "all",
  overdueOnly: false,
};

/** Mirrors the live pet "Mano": banned, review date already in the past. */
const BANNED_ROW = {
  id: BANNED_PET,
  name: "Mano",
  status: "active",
  owner_account_id: OWNER_ID,
  trust_score: 5,
  trust_warning_acknowledged: true,
  temporary_banned_at: "2026-08-12T05:38:25Z",
  temporary_ban_until: "2026-08-19T05:38:25Z",
};

/** Mirrors "Mouzy": in the warning band with the dialog already dismissed. */
const WARNED_ROW = {
  id: ACTOR_PET,
  name: "Mouzy",
  status: "active",
  owner_account_id: OWNER_ID,
  trust_score: 173,
  trust_warning_acknowledged: true,
  temporary_banned_at: null,
  temporary_ban_until: null,
};

function setup(tables: Record<string, TableResult>) {
  holder.admin = makeSupabaseMock(tables);
  return holder.admin;
}

afterEach(() => {
  holder.admin = null;
  holder.configured = true;
  vi.useRealTimers();
});

describe("listTrustQueue", () => {
  it("returns unconfigured when env vars are missing", async () => {
    holder.configured = false;
    const result = await listTrustQueue(baseQuery);
    expect(result).toEqual({
      ok: false,
      reason: "unconfigured",
      message: "Supabase env vars are not set.",
    });
  });

  it("filters server-side on the score ceiling, not a function call", async () => {
    // get_pet_trust_status cannot be a PostgREST filter, so the queue selects
    // the band by score. Assert the filter rather than the rows — the mock
    // returns fixtures regardless.
    const mock = setup({
      "pets.pets": { rows: [BANNED_ROW], count: 1 },
      "identity.accounts": { rows: [] },
      "matching.pet_reports": { rows: [] },
    });

    await listTrustQueue(baseQuery);
    const petSelect = mock.calls.find((c) => c.op === "select" && c.key === "pets.pets");
    expect(petSelect?.filters).toContainEqual({ method: "lte", args: ["trust_score", 250] });
    expect(petSelect?.filters).toContainEqual({ method: "is", args: ["deleted_at", null] });
  });

  it("orders by review deadline with nulls last", async () => {
    const mock = setup({
      "pets.pets": { rows: [BANNED_ROW], count: 1 },
      "identity.accounts": { rows: [] },
      "matching.pet_reports": { rows: [] },
    });

    await listTrustQueue(baseQuery);
    const petSelect = mock.calls.find((c) => c.op === "select" && c.key === "pets.pets");
    // A warning has no deadline; a ban does. Nulls first would bury the work.
    expect(petSelect?.filters).toContainEqual({
      method: "order",
      args: ["temporary_ban_until", { ascending: true, nullsFirst: false }],
    });
  });

  it("derives the status and flags an overdue review", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-08-25T00:00:00Z")); // past Mano's 08-19 date

    setup({
      "pets.pets": { rows: [BANNED_ROW], count: 1 },
      "identity.accounts": { rows: [{ id: OWNER_ID, email: "owner@example.com" }] },
      "matching.pet_reports": { rows: [{ reported_pet_id: BANNED_PET }] },
    });

    const result = await listTrustQueue(baseQuery);
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const [item] = result.data.items;
    expect(item.status).toBe("temporary_banned");
    expect(item.reviewOverdue).toBe(true);
    expect(item.ownerEmail).toBe("owner@example.com");
    expect(item.reportCount).toBe(1);
  });

  it("does not mark a review overdue before its date", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-08-16T00:00:00Z"));

    setup({
      "pets.pets": { rows: [BANNED_ROW], count: 1 },
      "identity.accounts": { rows: [] },
      "matching.pet_reports": { rows: [] },
    });

    const result = await listTrustQueue(baseQuery);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.items[0].reviewOverdue).toBe(false);
  });

  it("keeps an acknowledged warning in the queue", async () => {
    setup({
      "pets.pets": { rows: [WARNED_ROW], count: 1 },
      "identity.accounts": { rows: [] },
      "matching.pet_reports": { rows: [] },
    });

    const result = await listTrustQueue(baseQuery);
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    // This is the case `my_pet_trust_status` reports as "normal" — a queue
    // built on that RPC would drop this pet entirely.
    expect(result.data.items[0].status).toBe("warning");
    expect(result.data.items[0].warningAcknowledged).toBe(true);
  });

  it("corrects the total when a derived filter is applied", async () => {
    setup({
      "pets.pets": { rows: [BANNED_ROW, WARNED_ROW], count: 2 },
      "identity.accounts": { rows: [] },
      "matching.pet_reports": { rows: [] },
    });

    const result = await listTrustQueue({ ...baseQuery, status: "warning" });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    // Status is computed, so the server count would over-report and the pager
    // would promise a page that isn't there.
    expect(result.data.items).toHaveLength(1);
    expect(result.data.total).toBe(1);
  });

  it("surfaces a query failure as query_failed", async () => {
    setup({ "pets.pets": { error: { message: "permission denied" } } });
    const result = await listTrustQueue(baseQuery);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.reason).toBe("query_failed");
  });
});

describe("getTrustLedger", () => {
  it("resolves actor pet names so the history reads as events, not uuids", async () => {
    setup({
      "pets.pets": {
        single: { id: BANNED_PET, trust_score: 5 },
        rows: [{ id: ACTOR_PET, name: "Mouzy" }],
      },
      "pets.trust_score_events": {
        rows: [
          {
            id: "e1",
            reason: "report",
            delta: -80,
            actor_pet_id: ACTOR_PET,
            created_at: "2026-08-12T05:38:00Z",
          },
        ],
      },
    });

    const result = await getTrustLedger(BANNED_PET);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.events[0]).toMatchObject({
      reason: "report",
      delta: -80,
      actorPetName: "Mouzy",
    });
  });

  it("rejects a non-uuid id without touching the database", async () => {
    const mock = setup({});
    const result = await getTrustLedger("nope");
    expect(result).toEqual({ ok: false, reason: "not_found", message: "No pet with that id." });
    expect(mock.calls).toHaveLength(0);
  });
});

describe("restoreTrust", () => {
  function setupRestore(overrides: Record<string, TableResult> = {}) {
    return setup({
      "pets.pets#select": { single: BANNED_ROW },
      "pets.pets#update": { rows: [{ id: BANNED_PET }] },
      "public.admin_audit_logs": {},
      ...overrides,
    });
  }

  it("rejects a non-uuid id without touching the database", async () => {
    const mock = setupRestore();
    const result = await restoreTrust("nope", "Reviewed and cleared", ACTOR);
    expect(result).toEqual({ ok: false, reason: "not_found", message: "No pet with that id." });
    expect(mock.calls).toHaveLength(0);
  });

  it("writes ONLY trust_score, and exactly 555", async () => {
    const mock = setupRestore();
    const result = await restoreTrust(BANNED_PET, "Reviewed the reports and cleared", ACTOR);
    expect(result).toEqual({ ok: true });

    const update = mock.calls.find((c) => c.op === "update")?.values as Record<string, unknown>;
    // The grant is column-scoped to trust_score; the three lifecycle columns
    // belong to their BEFORE UPDATE trigger and writing them by hand is the
    // failure their migration footer warns about.
    expect(update).toEqual({ trust_score: 555 });
    expect(update).not.toHaveProperty("temporary_banned_at");
    expect(update).not.toHaveProperty("temporary_ban_until");
    expect(update).not.toHaveProperty("trust_warning_acknowledged");
  });

  it("refuses to restore a pet that is already normal", async () => {
    const mock = setupRestore({
      "pets.pets#select": { single: { ...BANNED_ROW, trust_score: 555 } },
    });

    const result = await restoreTrust(BANNED_PET, "Nothing actually wrong here", ACTOR);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    // Re-running it would still fire the trigger and clear an acknowledged
    // warning, re-showing the dialog to someone who was never restricted.
    expect(result.reason).toBe("conflict");
    expect(mock.calls.some((c) => c.op === "update")).toBe(false);
  });

  it("records what the trigger did, since none of it is in the column we wrote", async () => {
    const mock = setupRestore();
    await restoreTrust(BANNED_PET, "Reviewed the reports and cleared", ACTOR);

    const audit = mock.calls.find((c) => c.key === "public.admin_audit_logs")?.values as Record<
      string,
      unknown
    >;
    expect(audit.action).toBe("trust.restore");
    expect(audit.target_type).toBe("pet");
    expect(audit.target_id).toBe(BANNED_PET);
    expect(audit.metadata).toMatchObject({
      previousScore: 5,
      newScore: 555,
      previousStatus: "temporary_banned",
      clearedBanWindow: true,
      previousReviewDueAt: "2026-08-19T05:38:25Z",
    });
  });

  it("reports `unaudited` when the restore landed but the audit failed", async () => {
    setupRestore({ "public.admin_audit_logs": { error: { message: "audit down" } } });
    const result = await restoreTrust(BANNED_PET, "Reviewed the reports and cleared", ACTOR);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    // The ban HAS been lifted at this point — reporting a plain failure would
    // be a lie, and a retry would then hit the already-normal guard.
    expect(result.reason).toBe("unaudited");
  });

  it("surfaces a denied update as action_failed", async () => {
    setupRestore({
      "pets.pets#update": { error: { message: "permission denied for column trust_score" } },
    });
    const result = await restoreTrust(BANNED_PET, "Reviewed the reports and cleared", ACTOR);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.reason).toBe("action_failed");
  });
});
