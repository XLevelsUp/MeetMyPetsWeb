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
import {
  accountsQuerySchema,
  petsQuerySchema,
  DEFAULT_ACCOUNTS_QUERY,
  DEFAULT_PETS_QUERY,
  type AccountsQuery,
  type PetsQuery,
} from "@/lib/users-contract";

/** Unfiltered query plus whatever the case under test cares about. */
const accountsQuery = (overrides: Partial<AccountsQuery> = {}): AccountsQuery => ({
  ...DEFAULT_ACCOUNTS_QUERY,
  ...overrides,
});
const petsQuery = (overrides: Partial<PetsQuery> = {}): PetsQuery => ({
  ...DEFAULT_PETS_QUERY,
  ...overrides,
});

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

    const result = await listAccounts(accountsQuery());
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

    const result = await listAccounts(accountsQuery());
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

    const result = await listAccounts(accountsQuery());
    expect(result.ok && result.data.items[0].restriction).toBeNull();
  });

  it("short-circuits to an empty page when no account holds the filtered restriction", async () => {
    const mock = setup({
      "identity.accounts": { count: 5, rows: [] },
      "pets.pets": { rows: [] },
      "public.admin_restrictions": { rows: [] },
    });

    const result = await listAccounts(accountsQuery({ status: "banned" }));
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data).toEqual({ items: [], page: 1, pageSize: 25, total: 0 });
    // The accounts table is never queried once the restriction set comes back empty.
    expect(mock.calls.some((c) => c.key === "identity.accounts")).toBe(false);
  });

  it("surfaces a query failure instead of throwing", async () => {
    setup({ "identity.accounts": { error: { message: "boom" } } });
    const result = await listAccounts(accountsQuery());
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.reason).toBe("query_failed");
    expect(result.message).toContain("boom");
  });
});

/**
 * Sorting and filtering assert on the RECORDED FILTER CALLS, never on the rows
 * that come back. The mock returns its fixture regardless of what was applied,
 * so a row-based assertion here would pass just as happily against an adapter
 * that dropped the filter entirely.
 */
describe("listAccounts sorting", () => {
  function listable() {
    return setup({
      "identity.accounts": { count: 1, rows: [{ id: ACCOUNT_ID }] },
      "pets.pets": { rows: [] },
      "public.admin_restrictions": { rows: [] },
    });
  }

  it.each([
    ["created_at", "desc", false],
    ["display_name", "asc", true],
    ["email", "asc", true],
    ["last_login_at", "desc", false],
  ] as const)("orders by %s %s", async (sort, dir, ascending) => {
    const mock = listable();
    await listAccounts(accountsQuery({ sort, dir }));

    const page = mock.calls.find((c) => c.key === "identity.accounts");
    expect(page?.filters).toContainEqual({
      method: "order",
      // nullsFirst keeps empty display names and never-logged-in accounts off
      // the top of an ascending page, where they read as "no data".
      args: [sort, { ascending, nullsFirst: false }],
    });
  });

  it("resolves pet_count before the page query instead of reordering the page", async () => {
    const mock = setup({
      "identity.accounts": { count: 3, rows: [{ id: ACCOUNT_ID }] },
      "pets.pets": { rows: [{ id: PET_ID, owner_account_id: ACCOUNT_ID }] },
      "public.admin_restrictions": { rows: [] },
    });

    await listAccounts(accountsQuery({ sort: "pet_count", dir: "desc" }));

    // ids -> counts -> page, in that order. The page query filters by the
    // resolved ids and carries no `order`, because the ranking is ours.
    const sequence = mock.calls.filter((c) => c.op === "select").map((c) => c.key);
    expect(sequence.slice(0, 3)).toEqual(["identity.accounts", "pets.pets", "identity.accounts"]);

    const page = mock.calls.filter((c) => c.key === "identity.accounts")[1];
    expect(page.filters?.some((f) => f.method === "order")).toBe(false);
    expect(page.filters).toContainEqual({ method: "in", args: ["id", [ACCOUNT_ID]] });
  });
});

describe("listAccounts filters", () => {
  function listable(overrides: Record<string, TableResult> = {}) {
    return setup({
      "identity.accounts": { count: 1, rows: [{ id: ACCOUNT_ID }] },
      "pets.pets": { rows: [] },
      "public.admin_restrictions": { rows: [] },
      ...overrides,
    });
  }

  it("applies an inclusive joined-date range to created_at", async () => {
    const mock = listable();
    await listAccounts(accountsQuery({ joinedFrom: "2026-01-01", joinedTo: "2026-01-31" }));

    const page = mock.calls.find((c) => c.key === "identity.accounts");
    expect(page?.filters).toContainEqual({
      method: "gte",
      args: ["created_at", "2026-01-01T00:00:00.000Z"],
    });
    // End of day, not midnight — otherwise `to` silently excludes its own day.
    expect(page?.filters).toContainEqual({
      method: "lte",
      args: ["created_at", "2026-01-31T23:59:59.999Z"],
    });
  });

  it.each([
    ["yes", true],
    ["no", false],
  ] as const)("filters email_verified=%s", async (value, expected) => {
    const mock = listable();
    await listAccounts(accountsQuery({ emailVerified: value }));
    const page = mock.calls.find((c) => c.key === "identity.accounts");
    expect(page?.filters).toContainEqual({ method: "is", args: ["email_verified", expected] });
  });

  it("expresses 'has a phone number' as not-null rather than a truthiness test", async () => {
    const mock = listable();
    await listAccounts(accountsQuery({ hasPhone: "yes" }));
    const page = mock.calls.find((c) => c.key === "identity.accounts");
    expect(page?.filters).toContainEqual({ method: "not", args: ["phone_number", "is", null] });
  });

  it("resolves 'has pets' to an id list before the page query", async () => {
    const mock = listable({
      "pets.pets": { rows: [{ owner_account_id: ACCOUNT_ID }] },
    });
    await listAccounts(accountsQuery({ hasPets: "yes" }));

    const page = mock.calls.filter((c) => c.key === "identity.accounts").at(-1);
    expect(page?.filters).toContainEqual({ method: "in", args: ["id", [ACCOUNT_ID]] });
  });

  it("short-circuits when 'has pets' matches nobody", async () => {
    const mock = listable({ "pets.pets": { rows: [] } });
    const result = await listAccounts(accountsQuery({ hasPets: "yes" }));

    expect(result.ok && result.data.total).toBe(0);
    expect(mock.calls.some((c) => c.key === "identity.accounts")).toBe(false);
  });

  it("intersects a restriction filter with 'has pets' rather than letting one win", async () => {
    const other = "44444444-4444-4444-4444-444444444444";
    const mock = listable({
      // Banned: our account plus one that owns nothing.
      "public.admin_restrictions": {
        rows: [
          { target_id: ACCOUNT_ID, kind: "banned", reason: "r", created_at: "x", expires_at: null, lifted_at: null },
          { target_id: other, kind: "banned", reason: "r", created_at: "x", expires_at: null, lifted_at: null },
        ],
      },
      "pets.pets": { rows: [{ owner_account_id: ACCOUNT_ID }] },
    });

    await listAccounts(accountsQuery({ status: "banned", hasPets: "yes" }));

    const page = mock.calls.filter((c) => c.key === "identity.accounts").at(-1);
    expect(page?.filters).toContainEqual({ method: "in", args: ["id", [ACCOUNT_ID]] });
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

    const result = await listPets(petsQuery());
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.items[0]).toMatchObject({ name: "Rex", species: "Dog", breed: "Beagle" });
  });

  it("carries the trust score and ban window through to the summary", async () => {
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
            trust_score: 80,
            temporary_ban_until: "2026-08-23T00:00:00Z",
          },
        ],
      },
      "public.admin_restrictions": { rows: [] },
    });

    const result = await listPets(petsQuery());
    expect(result.ok && result.data.items[0]).toMatchObject({
      trustScore: 80,
      trustBannedUntil: "2026-08-23T00:00:00Z",
    });
  });

  it("passes a missing trust score through as null rather than inventing a band", async () => {
    setup({
      "pets.pets": {
        count: 1,
        rows: [
          {
            id: PET_ID,
            name: "Rex",
            species_id: null,
            breed_id: null,
            status: "active",
            owner_account_id: null,
            created_at: null,
            profile_photo_url: null,
            trust_score: null,
            temporary_ban_until: null,
          },
        ],
      },
      "public.admin_restrictions": { rows: [] },
    });

    const result = await listPets(petsQuery());
    // `trustStatusFor(null)` is null, not "normal" — an unknown score must not
    // read as a clean one.
    expect(result.ok && result.data.items[0].trustScore).toBeNull();
  });
});

describe("listPets sorting and filters", () => {
  function listable() {
    return setup({
      "pets.pets": { count: 1, rows: [] },
      "public.admin_restrictions": { rows: [] },
    });
  }

  it.each([
    ["created_at", "desc", false],
    ["name", "asc", true],
    ["trust_score", "asc", true],
  ] as const)("orders by %s %s", async (sort, dir, ascending) => {
    const mock = listable();
    await listPets(petsQuery({ sort, dir }));
    const page = mock.calls.find((c) => c.key === "pets.pets");
    expect(page?.filters).toContainEqual({
      method: "order",
      args: [sort, { ascending, nullsFirst: false }],
    });
  });

  it("filters by species id", async () => {
    const mock = listable();
    const speciesId = "55555555-5555-5555-5555-555555555555";
    await listPets(petsQuery({ speciesId }));
    const page = mock.calls.find((c) => c.key === "pets.pets");
    expect(page?.filters).toContainEqual({ method: "eq", args: ["species_id", speciesId] });
  });

  it("ignores a species id that is not a uuid instead of sending it", async () => {
    const mock = listable();
    await listPets(petsQuery({ speciesId: "dog" }));
    const page = mock.calls.find((c) => c.key === "pets.pets");
    expect(page?.filters?.some((f) => f.method === "eq" && f.args[0] === "species_id")).toBe(false);
  });

  it.each([
    ["at_risk", "lte"],
    ["normal", "gt"],
  ] as const)("filters the %s trust band with %s", async (trust, method) => {
    const mock = listable();
    await listPets(petsQuery({ trust }));
    const page = mock.calls.find((c) => c.key === "pets.pets");
    // 250 is TRUST_REVIEW_SCORE_CEILING — the boundary lives in one file.
    expect(page?.filters).toContainEqual({ method, args: ["trust_score", 250] });
  });
});

describe("list query contracts", () => {
  it("degrades a hand-edited query string instead of rejecting it", () => {
    const parsed = accountsQuerySchema.parse({
      page: "nope",
      sort: "; drop table",
      dir: "sideways",
      emailVerified: "maybe",
      joinedFrom: "last tuesday",
    });
    expect(parsed).toMatchObject({
      page: 1,
      sort: "created_at",
      dir: "desc",
      emailVerified: "all",
      joinedFrom: undefined,
    });

    expect(petsQuerySchema.parse({ sort: "trust", trust: "bad" })).toMatchObject({
      sort: "created_at",
      trust: "all",
    });
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

