import { afterEach, describe, expect, it, vi } from "vitest";

import { makeSupabaseMock } from "@/test/supabase-mock";

const holder = vi.hoisted(() => ({ admin: null as ReturnType<typeof makeSupabaseMock> | null }));
vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: () => holder.admin }));

import { fetchMatchStats } from "@/lib/public-stats";

function configure() {
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://example.supabase.co");
  vi.stubEnv("SUPABASE_SECRET_KEY", "sb_secret_test");
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "sb_publishable_test");
}

const MATCHES = [
  { pet_1_id: "a", pet_2_id: "b", matched_at: "2026-11-20T10:00:00.000Z" },
  { pet_1_id: "a", pet_2_id: "c", matched_at: "2026-11-19T10:00:00.000Z" },
  { pet_1_id: "d", pet_2_id: "b", matched_at: "2026-11-18T10:00:00.000Z" },
];

// The mock ignores filters, so the "eligible pets" fixture is what the adapter's own query would return.
function pet(id: string, name: string) {
  return { id, name, species_id: "sp-dog", profile_photo_url: `https://cdn.example/${id}.jpg`, trust_score: 600, owner_account_id: `owner-${id}` };
}

afterEach(() => {
  vi.unstubAllEnvs();
  holder.admin = null;
});

describe("fetchMatchStats", () => {
  it("counts every match and each pet once, however many matches it is in", async () => {
    configure();
    holder.admin = makeSupabaseMock({ "matching.matches": { rows: MATCHES }, "pets.pets": { rows: [] } });
    const result = await fetchMatchStats();
    expect(result).toMatchObject({ ok: true, data: { matches: 3, pets: 4, latest: null } });
  });

  it("showcases the newest match whose two pets are both eligible", async () => {
    configure();
    holder.admin = makeSupabaseMock({
      "matching.matches": { rows: MATCHES },
      "pets.pets": { rows: [pet("a", "rio"), pet("b", "bubloo")] },
      "pets.species": { rows: [{ id: "sp-dog", name: "Dog" }] },
    });
    const result = await fetchMatchStats();
    expect(result.ok && result.data.latest).toEqual({
      a: { name: "rio", species: "Dog", photoUrl: "https://cdn.example/a.jpg" },
      b: { name: "bubloo", species: "Dog", photoUrl: "https://cdn.example/b.jpg" },
      matchedOn: "2026-11-20",
    });
  });

  it("filters the showcase to active, undeleted pets above the warning band, and only old-enough active matches", async () => {
    configure();
    const mock = makeSupabaseMock({
      "matching.matches": { rows: MATCHES },
      "pets.pets": { rows: [pet("a", "rio"), pet("b", "bubloo")] },
      "pets.species": { rows: [] },
    });
    holder.admin = mock;
    await fetchMatchStats();
    const petQuery = mock.calls.find((c) => c.key === "pets.pets");
    expect(petQuery?.filters).toContainEqual({ method: "eq", args: ["status", "active"] });
    expect(petQuery?.filters).toContainEqual({ method: "is", args: ["deleted_at", null] });
    expect(petQuery?.filters).toContainEqual({ method: "gt", args: ["trust_score", 250] });
    const latestQuery = mock.calls.filter((c) => c.key === "matching.matches").at(-1);
    expect(latestQuery?.filters).toContainEqual({ method: "eq", args: ["status", "active"] });
    expect(latestQuery?.filters).toContainEqual({ method: "is", args: ["ended_at", null] });
    expect(latestQuery?.filters?.some((f) => f.method === "lte" && f.args[0] === "matched_at")).toBe(true);
  });

  it("shows no match when one of the pair is not eligible", async () => {
    configure();
    holder.admin = makeSupabaseMock({
      "matching.matches": { rows: [MATCHES[0]] },
      "pets.pets": { rows: [pet("a", "rio")] },
    });
    const result = await fetchMatchStats();
    expect(result.ok && result.data.latest).toBeNull();
  });

  it("never sends ids, owners, trust scores or exact times", async () => {
    configure();
    holder.admin = makeSupabaseMock({
      "matching.matches": { rows: MATCHES },
      "pets.pets": { rows: [pet("a", "rio"), pet("b", "bubloo")] },
      "pets.species": { rows: [{ id: "sp-dog", name: "Dog" }] },
    });
    const json = JSON.stringify(await fetchMatchStats());
    for (const leak of ["owner-a", "sp-dog", "600", "T10:00", '"a":{"id', "trust"]) expect(json).not.toContain(leak);
  });

  it("still returns the counts when the showcase lookup fails", async () => {
    configure();
    holder.admin = makeSupabaseMock({
      "matching.matches": { rows: MATCHES },
      "pets.pets": { error: { message: "permission denied" } },
    });
    const result = await fetchMatchStats();
    expect(result).toMatchObject({ ok: true, data: { matches: 3, pets: 4, latest: null } });
  });

  it("reports a database error on the counts instead of a zero that looks real", async () => {
    configure();
    holder.admin = makeSupabaseMock({ "matching.matches": { error: { message: "permission denied" } } });
    const result = await fetchMatchStats();
    expect(result).toMatchObject({ ok: false, reason: "query_failed" });
  });

  it("is unconfigured without Supabase env vars", async () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "");
    vi.stubEnv("SUPABASE_SECRET_KEY", "");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "");
    expect(await fetchMatchStats()).toMatchObject({ ok: false, reason: "unconfigured" });
  });
});
