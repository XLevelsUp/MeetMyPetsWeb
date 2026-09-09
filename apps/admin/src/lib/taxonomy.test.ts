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

import {
  createBreed,
  createSpecies,
  listBreeds,
  listSpecies,
  updateBreed,
  updateSpecies,
} from "@/lib/taxonomy";
import { createBreedSchema, type BreedsQuery, type SpeciesQuery } from "@/lib/taxonomy-contract";

const DOG_ID = "11111111-1111-1111-1111-111111111111";
const BIRD_ID = "22222222-2222-2222-2222-222222222222";
const BREED_ID = "33333333-3333-3333-3333-333333333333";
const ACTOR_ID = "99999999-9999-9999-9999-999999999999";

const ACTOR = { userId: ACTOR_ID, email: "boss@meetmypets.dev", role: "super_admin" as const };

const speciesQuery: SpeciesQuery = { page: 1, pageSize: 25, q: undefined, status: "all" };
const breedsQuery: BreedsQuery = {
  page: 1,
  pageSize: 25,
  q: undefined,
  status: "all",
  speciesId: "all",
};

const SPECIES_ROWS = [
  {
    id: DOG_ID,
    name: "Dog",
    description: null,
    status: "active",
    created_at: "2026-01-01T00:00:00Z",
    updated_at: null,
  },
  {
    id: BIRD_ID,
    name: "Bird",
    description: null,
    status: "active",
    created_at: "2026-01-01T00:00:00Z",
    updated_at: null,
  },
];

const BREED_ROW = {
  id: BREED_ID,
  species_id: DOG_ID,
  name: "Golden Retriever",
  description: null,
  status: "active",
  created_at: "2026-01-01T00:00:00Z",
};

/** Two active pets on Dog, none on Bird. */
const PET_ROWS = [
  { species_id: DOG_ID, breed_id: BREED_ID },
  { species_id: DOG_ID, breed_id: BREED_ID },
];

function setup(tables: Record<string, TableResult>) {
  holder.admin = makeSupabaseMock(tables);
  return holder.admin;
}

afterEach(() => {
  holder.admin = null;
  holder.configured = true;
});

/**
 * REGRESSION for the bug that made the breed form unusable: a populated species
 * dropdown that always answered "Pick a species."
 *
 * Every species the app team owns has a sequential placeholder id whose version
 * and variant nibbles are `0` — not a conforming RFC 9562 UUID. zod v4
 * tightened `.uuid()` to enforce the spec, so `.uuid()` rejects the ENTIRE live
 * taxonomy. `z.guid()` is the lenient shape check that accepts it.
 *
 * The first case below fails against `z.string().uuid()`, which is the point.
 */
describe("createBreedSchema", () => {
  const REAL_SPECIES_IDS = [
    "00000000-0000-0000-0000-000000000001", // Dog, live
    "00000000-0000-0000-0000-000000000006", // Small Pet, live
  ];

  it.each(REAL_SPECIES_IDS)("accepts the app team's placeholder id %s", (speciesId) => {
    const parsed = createBreedSchema.safeParse({
      speciesId,
      name: "Cockatiel",
      description: null,
    });
    expect(parsed.success).toBe(true);
  });

  it("accepts a conforming v4 uuid too", () => {
    expect(
      createBreedSchema.safeParse({
        speciesId: "0199a1b2-c3d4-7e5f-8a9b-0c1d2e3f4a5b",
        name: "Cockatiel",
        description: null,
      }).success,
    ).toBe(true);
  });

  it("still rejects something that is not an id at all", () => {
    const parsed = createBreedSchema.safeParse({
      speciesId: "Dog",
      name: "Cockatiel",
      description: null,
    });
    expect(parsed.success).toBe(false);
    if (parsed.success) return;
    expect(parsed.error.issues[0]?.message).toBe("Pick a species.");
  });
});

describe("listSpecies", () => {
  it("returns unconfigured when env vars are missing", async () => {
    holder.configured = false;
    const result = await listSpecies(speciesQuery);
    expect(result).toEqual({
      ok: false,
      reason: "unconfigured",
      message: "Supabase env vars are not set.",
    });
  });

  it("attaches breed and active-pet counts per species", async () => {
    setup({
      "pets.species": { rows: SPECIES_ROWS, count: 2 },
      "pets.breeds": { rows: [{ species_id: DOG_ID }, { species_id: DOG_ID }, { species_id: BIRD_ID }] },
      "pets.pets": { rows: PET_ROWS },
    });

    const result = await listSpecies(speciesQuery);
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const dog = result.data.items.find((s) => s.id === DOG_ID);
    const bird = result.data.items.find((s) => s.id === BIRD_ID);
    expect(dog).toMatchObject({ breedCount: 2, activePetCount: 2 });
    // Counts must be 0, not undefined — the UI reads them to decide whether
    // retirement is possible.
    expect(bird).toMatchObject({ breedCount: 1, activePetCount: 0 });
  });

  it("skips the count fan-out when the page is empty", async () => {
    const mock = setup({ "pets.species": { rows: [], count: 0 } });
    const result = await listSpecies(speciesQuery);
    expect(result).toEqual({ ok: true, data: { items: [], page: 1, pageSize: 25, total: 0 } });
    expect(mock.calls.filter((c) => c.op === "select")).toHaveLength(1);
  });

  it("surfaces a query failure as query_failed", async () => {
    setup({ "pets.species": { error: { message: "permission denied" } } });
    const result = await listSpecies(speciesQuery);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.reason).toBe("query_failed");
  });
});

describe("listBreeds", () => {
  it("resolves the parent species name and pet count", async () => {
    setup({
      "pets.breeds": { rows: [BREED_ROW], count: 1 },
      "pets.species": { rows: SPECIES_ROWS },
      "pets.pets": { rows: PET_ROWS },
    });

    const result = await listBreeds(breedsQuery);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.items[0]).toMatchObject({
      speciesName: "Dog",
      activePetCount: 2,
    });
  });

  it("degrades to a null species name when the parent is missing", async () => {
    setup({
      "pets.breeds": { rows: [BREED_ROW], count: 1 },
      "pets.species": { rows: [] },
      "pets.pets": { rows: [] },
    });

    const result = await listBreeds(breedsQuery);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.items[0].speciesName).toBeNull();
  });
});

describe("createSpecies", () => {
  it("refuses a case-insensitive duplicate name", async () => {
    const mock = setup({
      "pets.species": { rows: SPECIES_ROWS },
    });

    const result = await createSpecies(
      { name: "  dOg ", description: null },
      "Adding a species for testing",
      ACTOR,
    );
    expect(result.ok).toBe(false);
    if (result.ok) return;
    // The UNIQUE constraint on species.name is case-SENSITIVE, so "dOg" would
    // be accepted by the database and render as an indistinguishable duplicate.
    expect(result.reason).toBe("conflict");
    expect(mock.calls.some((c) => c.op === "insert")).toBe(false);
  });

  it("inserts with status active and writes the audit row", async () => {
    const mock = setup({
      "pets.species#select": { rows: SPECIES_ROWS, single: { id: "new-id" } },
      "pets.species#insert": { single: { id: "new-id" } },
      "public.admin_audit_logs": {},
    });

    const result = await createSpecies(
      { name: "Rabbit", description: "Small mammals" },
      "Launching rabbit support",
      ACTOR,
    );
    expect(result).toEqual({ ok: true });

    const insert = mock.calls.find((c) => c.op === "insert" && c.key === "pets.species")
      ?.values as Record<string, unknown>;
    expect(insert).toMatchObject({ name: "Rabbit", status: "active" });

    const audit = mock.calls.find((c) => c.key === "public.admin_audit_logs")?.values as Record<
      string,
      unknown
    >;
    expect(audit.action).toBe("species.create");
    expect(audit.target_type).toBe("species");
  });

  /**
   * REGRESSION. pets.species.id is `uuid NOT NULL` with NO DEFAULT, so an
   * insert that omits it fails with
   * `null value in column "id" … violates not-null constraint` — which is
   * exactly what the settings screen did. The mock accepts any payload, so the
   * only way to catch this without a database is to assert the payload itself.
   */
  it("supplies an id, because the column has no default", async () => {
    const mock = setup({
      "pets.species#select": { rows: SPECIES_ROWS, single: { id: "new-id" } },
      "pets.species#insert": { single: { id: "new-id" } },
      "public.admin_audit_logs": {},
    });

    await createSpecies({ name: "Ferret", description: null }, "Adding ferrets", ACTOR);

    const insert = mock.calls.find((c) => c.op === "insert" && c.key === "pets.species")
      ?.values as Record<string, unknown>;
    expect(insert.id).toEqual(expect.any(String));
    // A real v4, not the next number in the app team's sequential placeholders:
    // read-then-increment would collide when two admins add at once.
    expect(insert.id).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
    );
  });
});

describe("updateSpecies", () => {
  function setupUpdate(overrides: Record<string, TableResult> = {}) {
    return setup({
      "pets.species#select": { rows: SPECIES_ROWS, single: SPECIES_ROWS[1] },
      "pets.species#update": { rows: [{ id: BIRD_ID }] },
      "pets.pets": { rows: PET_ROWS },
      "public.admin_audit_logs": {},
      ...overrides,
    });
  }

  it("rejects a non-uuid id without touching the database", async () => {
    const mock = setupUpdate();
    const result = await updateSpecies("nope", { description: null }, "Renaming for clarity", ACTOR);
    expect(result).toEqual({ ok: false, reason: "not_found", message: "No species with that id." });
    expect(mock.calls).toHaveLength(0);
  });

  it("retires a species that no active pet uses", async () => {
    const mock = setupUpdate();
    const result = await updateSpecies(
      BIRD_ID,
      { status: "inactive", description: null },
      "Retiring an unused species",
      ACTOR,
    );
    expect(result).toEqual({ ok: true });
    const update = mock.calls.find((c) => c.op === "update")?.values as Record<string, unknown>;
    expect(update.status).toBe("inactive");
  });

  it("refuses to retire a species that active pets still use", async () => {
    const mock = setupUpdate({
      "pets.species#select": { rows: SPECIES_ROWS, single: SPECIES_ROWS[0] },
    });

    const result = await updateSpecies(
      DOG_ID,
      { status: "inactive", description: null },
      "Trying to retire a species in use",
      ACTOR,
    );
    expect(result.ok).toBe(false);
    if (result.ok) return;
    // Nothing in the database prevents this — retiring Dog would strand 2 pets
    // pointing at a species no longer offered.
    expect(result.reason).toBe("conflict");
    expect(result.message).toContain("2 active pets");
    expect(mock.calls.some((c) => c.op === "update")).toBe(false);
  });

  it("records the before and after names so a rename is reconstructible", async () => {
    const mock = setupUpdate();
    await updateSpecies(BIRD_ID, { name: "Birds", description: null }, "Pluralising the name", ACTOR);

    const audit = mock.calls.find((c) => c.key === "public.admin_audit_logs")?.values as Record<
      string,
      unknown
    >;
    expect(audit.metadata).toMatchObject({ previousName: "Bird", newName: "Birds" });
  });

  it("reports `unaudited` when the write landed but the audit failed", async () => {
    setupUpdate({ "public.admin_audit_logs": { error: { message: "audit down" } } });
    const result = await updateSpecies(
      BIRD_ID,
      { name: "Birds", description: null },
      "Pluralising the name",
      ACTOR,
    );
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.reason).toBe("unaudited");
  });
});

describe("createBreed", () => {
  it("scopes the duplicate check to the species, not globally", async () => {
    // "Unknown/Mixed" legitimately exists once per species, so a global name
    // check would reject the platform's own convention.
    //
    // The mock returns fixture rows regardless of filters, so asserting on the
    // result would pass even if the adapter forgot to scope the query. Assert
    // the filter itself.
    const mock = setup({
      "pets.species#select": { single: { id: BIRD_ID, name: "Bird" } },
      "pets.breeds#select": { rows: [] },
      "pets.breeds#insert": { single: { id: "new-breed" } },
      "public.admin_audit_logs": {},
    });

    await createBreed(
      { speciesId: BIRD_ID, name: "Cockatiel", description: null },
      "Adding a bird breed",
      ACTOR,
    );

    const dupeCheck = mock.calls.find((c) => c.op === "select" && c.key === "pets.breeds");
    expect(dupeCheck?.filters).toContainEqual({ method: "eq", args: ["species_id", BIRD_ID] });
  });

  /** Same missing default as species — see the note on the species case. */
  it("supplies an id, because the column has no default", async () => {
    const mock = setup({
      "pets.species#select": { single: { id: BIRD_ID, name: "Bird" } },
      "pets.breeds#select": { rows: [] },
      "pets.breeds#insert": { single: { id: "new-breed" } },
      "public.admin_audit_logs": {},
    });

    await createBreed(
      { speciesId: BIRD_ID, name: "Cockatiel", description: null },
      "Adding a bird breed",
      ACTOR,
    );

    const insert = mock.calls.find((c) => c.op === "insert" && c.key === "pets.breeds")
      ?.values as Record<string, unknown>;
    expect(insert.id).toEqual(expect.any(String));
    expect(insert.species_id).toBe(BIRD_ID);
  });

  it("refuses a duplicate within the same species", async () => {
    const mock = setup({
      "pets.species#select": { single: { id: DOG_ID, name: "Dog" } },
      "pets.breeds#select": { rows: [BREED_ROW] },
      "public.admin_audit_logs": {},
    });

    const result = await createBreed(
      { speciesId: DOG_ID, name: "golden retriever", description: null },
      "Attempting an exact duplicate",
      ACTOR,
    );
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.reason).toBe("conflict");
    expect(mock.calls.some((c) => c.op === "insert")).toBe(false);
  });

  it("returns not_found when the species does not exist", async () => {
    setup({ "pets.species#select": { single: null } });
    const result = await createBreed(
      { speciesId: BIRD_ID, name: "Cockatiel", description: null },
      "Adding to a missing species",
      ACTOR,
    );
    expect(result).toEqual({ ok: false, reason: "not_found", message: "No species with that id." });
  });
});

describe("updateBreed", () => {
  it("refuses to retire a breed that active pets still use", async () => {
    setup({
      "pets.breeds#select": { rows: [BREED_ROW], single: BREED_ROW },
      "pets.breeds#update": { rows: [{ id: BREED_ID }] },
      "pets.pets": { rows: PET_ROWS },
      "public.admin_audit_logs": {},
    });

    const result = await updateBreed(
      BREED_ID,
      { status: "inactive", description: null },
      "Trying to retire a breed in use",
      ACTOR,
    );
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.reason).toBe("conflict");
    expect(result.message).toContain("2 active pets");
  });

  it("never writes species_id, so a breed cannot be re-parented", async () => {
    const mock = setup({
      "pets.breeds#select": { rows: [BREED_ROW], single: BREED_ROW },
      "pets.breeds#update": { rows: [{ id: BREED_ID }] },
      "pets.pets": { rows: [] },
      "public.admin_audit_logs": {},
    });

    await updateBreed(BREED_ID, { name: "Golden Retrievers", description: null }, "Renaming", ACTOR);
    const update = mock.calls.find((c) => c.op === "update")?.values as Record<string, unknown>;
    // Re-parenting would silently move every pet using this breed.
    expect(update).not.toHaveProperty("species_id");
  });
});
