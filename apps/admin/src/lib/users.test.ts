import { afterEach, describe, expect, it, vi } from "vitest";

import { makeSupabaseMock, type SupabaseMock, type TableResult } from "@/test/supabase-mock";

const holder = vi.hoisted(() => ({
  admin: null as SupabaseMock | null,
  reference: null as SupabaseMock | null,
}));

vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: () => holder.admin }));
vi.mock("@/lib/supabase/reference", () => ({
  createReferenceClient: () => holder.reference,
  isSupabaseConfigured: () => true,
}));

import { flagPet, listAccounts, listPets, restoreAccount, suspendAccount } from "@/lib/users";

const ACCOUNT_ID = "11111111-1111-1111-1111-111111111111";
const AUTH_USER_ID = "22222222-2222-2222-2222-222222222222";
const PET_ID = "33333333-3333-3333-3333-333333333333";

const actor = { userId: "99999999-9999-9999-9999-999999999999", email: "mod@x.dev", role: "moderator" as const };

function setup(tables: Record<string, TableResult>) {
  holder.admin = makeSupabaseMock(tables);
  holder.reference = makeSupabaseMock({
    "pets.species": { rows: [{ id: "s1", name: "Dog" }] },
    "pets.breeds": { rows: [{ id: "b1", name: "Beagle" }] },
  });
  return holder.admin;
}

/** Baseline tables for an account action to succeed end to end. */
function actionTables(overrides: Record<string, TableResult> = {}) {
  return {
    "identity.accounts": { single: { auth_user_id: AUTH_USER_ID } },
    "public.admin_restrictions": { rows: [] },
    "public.admin_audit_logs": {},
    ...overrides,
  };
}

afterEach(() => {
  holder.admin = null;
  holder.reference = null;
});

describe("listAccounts", () => {
  it("returns a page with merged pet counts and restrictions", async () => {
    setup({
      "identity.accounts": {
        count: 2,
        rows: [
          {
            id: ACCOUNT_ID,
            email: "a@x.dev",
            phone_country_code: "+91",
            phone_number: "555",
            display_name: "Ada",
            status: "active",
            created_at: "2026-01-01T00:00:00Z",
            last_activity_at: null,
          },
        ],
      },
      "pets.pets": { rows: [{ owner_account_id: ACCOUNT_ID }, { owner_account_id: ACCOUNT_ID }] },
      "public.admin_restrictions": {
        rows: [
          {
            target_id: ACCOUNT_ID,
            kind: "suspended",
            reason: "Harassment reports",
            created_at: "2026-08-01T00:00:00Z",
            expires_at: null,
            lifted_at: null,
          },
        ],
      },
    });

    const result = await listAccounts({ page: 1, pageSize: 25, q: undefined, status: "all" });
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const [item] = result.data.items;
    expect(item.phone).toBe("+91 555");
    expect(item.petCount).toBe(2);
    expect(item.restriction?.kind).toBe("suspended");
    expect(result.data.total).toBe(2);
  });

  it("prefers the most severe active restriction", async () => {
    setup({
      "identity.accounts": {
        count: 1,
        rows: [{ id: ACCOUNT_ID, email: null, phone_country_code: null, phone_number: null, display_name: null, status: "active", created_at: null, last_activity_at: null }],
      },
      "pets.pets": { rows: [] },
      "public.admin_restrictions": {
        rows: [
          { target_id: ACCOUNT_ID, kind: "flagged", reason: "r", created_at: "x", expires_at: null, lifted_at: null },
          { target_id: ACCOUNT_ID, kind: "banned", reason: "r", created_at: "x", expires_at: null, lifted_at: null },
        ],
      },
    });

    const result = await listAccounts({ page: 1, pageSize: 25, q: undefined, status: "all" });
    expect(result.ok && result.data.items[0].restriction?.kind).toBe("banned");
  });

  it("ignores restrictions that have expired", async () => {
    setup({
      "identity.accounts": {
        count: 1,
        rows: [{ id: ACCOUNT_ID, email: null, phone_country_code: null, phone_number: null, display_name: null, status: "active", created_at: null, last_activity_at: null }],
      },
      "pets.pets": { rows: [] },
      "public.admin_restrictions": {
        rows: [
          {
            target_id: ACCOUNT_ID,
            kind: "suspended",
            reason: "old",
            created_at: "2026-01-01T00:00:00Z",
            expires_at: "2026-01-02T00:00:00Z",
            lifted_at: null,
          },
        ],
      },
    });

    const result = await listAccounts({ page: 1, pageSize: 25, q: undefined, status: "all" });
    expect(result.ok && result.data.items[0].restriction).toBeNull();
  });

  it("short-circuits to an empty page when no account holds the filtered restriction", async () => {
    const mock = setup({
      "identity.accounts": { count: 5, rows: [] },
      "pets.pets": { rows: [] },
      "public.admin_restrictions": { rows: [] },
    });

    const result = await listAccounts({ page: 1, pageSize: 25, q: undefined, status: "banned" });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data).toEqual({ items: [], page: 1, pageSize: 25, total: 0 });
    // The accounts table is never queried once the restriction set comes back empty.
    expect(mock.calls.some((c) => c.key === "identity.accounts")).toBe(false);
  });

  it("surfaces a query failure instead of throwing", async () => {
    setup({ "identity.accounts": { error: { message: "boom" } } });
    const result = await listAccounts({ page: 1, pageSize: 25, q: undefined, status: "all" });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.reason).toBe("query_failed");
    expect(result.message).toContain("boom");
  });
});

describe("listPets", () => {
  it("resolves species and breed names from the reference client", async () => {
    setup({
      "pets.pets": {
        count: 1,
        rows: [
          {
            id: PET_ID,
            name: "Rex",
            species_id: "s1",
            breed_id: "b1",
            status: "active",
            owner_account_id: ACCOUNT_ID,
            created_at: null,
            profile_photo_url: null,
          },
        ],
      },
      "public.admin_restrictions": { rows: [] },
    });

    const result = await listPets({ page: 1, pageSize: 25, q: undefined, status: "all" });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.items[0]).toMatchObject({ name: "Rex", species: "Dog", breed: "Beagle" });
  });
});

describe("suspendAccount", () => {
  it("bans in auth, records the restriction, then audits — in that order", async () => {
    const mock = setup(actionTables());

    const result = await suspendAccount(ACCOUNT_ID, "Repeated harassment", 168, actor);
    expect(result).toEqual({ ok: true });

    const ban = mock.calls.find((c) => c.op === "auth.updateUserById");
    expect(ban).toMatchObject({ key: AUTH_USER_ID, values: { ban_duration: "168h" } });

    const order = mock.calls.filter(
      (c) =>
        c.op === "auth.updateUserById" ||
        (c.op === "insert" && (c.key === "public.admin_restrictions" || c.key === "public.admin_audit_logs")),
    );
    expect(order.map((c) => c.key)).toEqual([
      AUTH_USER_ID,
      "public.admin_restrictions",
      "public.admin_audit_logs",
    ]);
  });

  it("stores an expiry derived from the duration", async () => {
    const mock = setup(actionTables());
    await suspendAccount(ACCOUNT_ID, "Repeated harassment", 24, actor);

    const insert = mock.calls.find(
      (c) => c.op === "insert" && c.key === "public.admin_restrictions",
    );
    const values = insert?.values as { expires_at: string; kind: string };
    expect(values.kind).toBe("suspended");
    const hoursOut = (new Date(values.expires_at).getTime() - Date.now()) / 3_600_000;
    expect(hoursOut).toBeGreaterThan(23.9);
    expect(hoursOut).toBeLessThan(24.1);
  });

  it("reports not_found when the account has no linked auth user", async () => {
    setup(actionTables({ "identity.accounts": { single: { auth_user_id: null } } }));
    const result = await suspendAccount(ACCOUNT_ID, "Repeated harassment", 24, actor);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.reason).toBe("not_found");
  });

  it("reports not_found for a non-uuid id without touching the database", async () => {
    const mock = setup(actionTables());
    const result = await suspendAccount("not-a-uuid", "Repeated harassment", 24, actor);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.reason).toBe("not_found");
    expect(mock.calls).toHaveLength(0);
  });

  it("fails the action when the auth ban fails, and writes nothing", async () => {
    const mock = setup(actionTables({ "auth.admin": { error: { message: "gotrue down" } } }));

    const result = await suspendAccount(ACCOUNT_ID, "Repeated harassment", 24, actor);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.reason).toBe("action_failed");
    expect(mock.calls.some((c) => c.op === "insert")).toBe(false);
  });

  it("returns `unaudited` when the action applied but the audit write failed", async () => {
    setup(actionTables({ "public.admin_audit_logs": { error: { message: "disk full" } } }));

    const result = await suspendAccount(ACCOUNT_ID, "Repeated harassment", 24, actor);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.reason).toBe("unaudited");
    expect(result.message).toContain("audit");
  });
});

describe("restoreAccount", () => {
  it("clears the auth ban and lifts restrictions rather than deleting them", async () => {
    const mock = setup(
      actionTables({ "public.admin_restrictions#update": { rows: [{ id: "r1" }] } }),
    );

    const result = await restoreAccount(ACCOUNT_ID, "Appeal upheld by support", actor);
    expect(result).toEqual({ ok: true });

    expect(mock.calls.find((c) => c.op === "auth.updateUserById")?.values).toEqual({
      ban_duration: "none",
    });

    const update = mock.calls.find((c) => c.op === "update" && c.key === "public.admin_restrictions");
    expect(update?.values).toMatchObject({ lifted_by: actor.userId });
    expect((update?.values as { lifted_at: string }).lifted_at).toBeTruthy();
  });
});

describe("flagPet", () => {
  it("records a restriction without touching auth or pets.pets", async () => {
    const mock = setup({
      "pets.pets": { single: { id: PET_ID } },
      "public.admin_restrictions": { rows: [] },
      "public.admin_audit_logs": {},
    });

    const result = await flagPet(PET_ID, "Graphic imagery in photos", actor);
    expect(result).toEqual({ ok: true });
    expect(mock.calls.some((c) => c.op === "auth.updateUserById")).toBe(false);
    expect(mock.calls.some((c) => c.op === "insert" && c.key === "public.admin_restrictions")).toBe(
      true,
    );
  });

  it("reports not_found when the pet does not exist", async () => {
    setup({ "pets.pets": { single: null }, "public.admin_restrictions": { rows: [] } });
    const result = await flagPet(PET_ID, "Graphic imagery in photos", actor);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.reason).toBe("not_found");
  });
});
