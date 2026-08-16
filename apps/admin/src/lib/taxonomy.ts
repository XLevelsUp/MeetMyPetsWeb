import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import { isSupabaseConfigured } from "@/lib/supabase/reference";
import { writeAuditLog } from "@/lib/audit";
import type { AuditAction } from "@/lib/audit-actions";
import type { AdminRole } from "@/lib/roles";
import type {
  BreedSummary,
  BreedsQuery,
  BreedsResponse,
  CreateBreedRequest,
  CreateSpeciesRequest,
  SpeciesQuery,
  SpeciesResponse,
  SpeciesSummary,
  UpdateBreedRequest,
  UpdateSpeciesRequest,
} from "@/lib/taxonomy-contract";

/**
 * Species / breed taxonomy adapter — `pets.species` and `pets.breeds`.
 *
 * ⚠️ THIS IS THE FIRST ADAPTER THAT WRITES A BACKEND-OWNED DOMAIN TABLE, and
 * the first that creates a row an admin authored. Everything before it wrote
 * either our own `public.admin_*` tables or a column-scoped status update on a
 * moderation row. Two consequences worth carrying in your head while editing
 * this file:
 *
 *   1. **Edits are live.** The mobile app reads `/rest/v1/species` and
 *      `/rest/v1/breeds` straight from PostgREST (confirmed in the edge logs),
 *      with no cache and no deploy in between. Renaming a species renames it in
 *      pet creation for real users, immediately.
 *   2. **Nothing here can be deleted.** `pets.pets.species_id`/`breed_id` are
 *      NOT NULL with NO ACTION foreign keys, and breeds reference species the
 *      same way — verified live, *no* species is deletable, not even one with
 *      zero pets, because its own breeds hold it. The grant
 *      (20260816000000) withholds DELETE to match. Retirement is `status`.
 *
 * The database enforces almost none of what this file assumes: `status` has no
 * CHECK constraint and `breeds` has no uniqueness constraint whatsoever. The
 * guards below are therefore load-bearing, not belt-and-braces.
 *
 * House adapter pattern: discriminated unions, never throws.
 */

export type TaxonomyResult<T> =
  | { ok: true; data: T }
  | { ok: false; reason: "unconfigured" | "not_found" | "query_failed"; message: string };

export type TaxonomyActionResult =
  | { ok: true }
  | {
      ok: false;
      reason: "unconfigured" | "not_found" | "conflict" | "action_failed" | "unaudited";
      message: string;
    };

const TABLES = {
  species: { schema: "pets", table: "species" },
  breeds: { schema: "pets", table: "breeds" },
  pets: { schema: "pets", table: "pets" },
} as const;

type TableRef = { schema: string; table: string };

type Actor = { userId: string; email: string; role: AdminRole };

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function client() {
  return createAdminClient();
}

function from(ref: TableRef) {
  return client().schema(ref.schema).from(ref.table);
}

/** See the identical note in `users.ts` — strip PostgREST `or=()` structure. */
function sanitizeSearch(term: string): string {
  return term.replace(/[,()"\\*]/g, "").trim();
}

type SpeciesRow = {
  id: string;
  name: string;
  description: string | null;
  status: string | null;
  created_at: string | null;
  updated_at: string | null;
};

type BreedRow = {
  id: string;
  species_id: string;
  name: string;
  description: string | null;
  status: string | null;
  created_at: string | null;
};

const SPECIES_COLUMNS = "id,name,description,status,created_at,updated_at";
const BREED_COLUMNS = "id,species_id,name,description,status,created_at";

/**
 * Counts of ACTIVE pets per species and per breed.
 *
 * Active only: an archived pet does not stop a species being retired, but a
 * live one does, and conflating them would block a legitimate cleanup forever.
 */
async function petCounts(): Promise<{ bySpecies: Map<string, number>; byBreed: Map<string, number> }> {
  const bySpecies = new Map<string, number>();
  const byBreed = new Map<string, number>();

  const { data, error } = await from(TABLES.pets)
    .select("species_id,breed_id")
    .eq("status", "active")
    .is("deleted_at", null)
    .range(0, 49_999);
  if (error) throw new Error(`pets.pets: ${error.message}`);

  for (const row of (data ?? []) as { species_id: string | null; breed_id: string | null }[]) {
    if (row.species_id) bySpecies.set(row.species_id, (bySpecies.get(row.species_id) ?? 0) + 1);
    if (row.breed_id) byBreed.set(row.breed_id, (byBreed.get(row.breed_id) ?? 0) + 1);
  }
  return { bySpecies, byBreed };
}

/** id → name, for showing which species a breed belongs to. */
async function speciesNames(): Promise<Map<string, string>> {
  const { data, error } = await from(TABLES.species).select("id,name");
  if (error) throw new Error(`pets.species: ${error.message}`);

  const map = new Map<string, string>();
  for (const row of (data ?? []) as { id: string; name: string | null }[]) {
    if (row.name) map.set(row.id, row.name);
  }
  return map;
}

/* -------------------------------------------------------------------------
 * Reads
 * ---------------------------------------------------------------------- */

export async function listSpecies(query: SpeciesQuery): Promise<TaxonomyResult<SpeciesResponse>> {
  if (!isSupabaseConfigured()) {
    return { ok: false, reason: "unconfigured", message: "Supabase env vars are not set." };
  }

  try {
    const { page, pageSize, q, status } = query;
    const offset = (page - 1) * pageSize;

    let request = from(TABLES.species).select(SPECIES_COLUMNS, { count: "exact" });
    if (status !== "all") request = request.eq("status", status);
    if (q) {
      const term = sanitizeSearch(q);
      if (term) request = request.ilike("name", `%${term}%`);
    }

    const { data, count, error } = await request
      .order("name", { ascending: true })
      .range(offset, offset + pageSize - 1);
    if (error) throw new Error(`pets.species: ${error.message}`);

    const rows = (data ?? []) as SpeciesRow[];
    if (rows.length === 0) {
      return { ok: true, data: { items: [], page, pageSize, total: count ?? 0 } };
    }

    // Breed counts come from a full scan of a 34-row table; a per-species
    // count query would be N round-trips for no benefit at this size.
    const [{ bySpecies }, breedsRes] = await Promise.all([
      petCounts(),
      from(TABLES.breeds).select("species_id"),
    ]);
    if (breedsRes.error) throw new Error(`pets.breeds: ${breedsRes.error.message}`);

    const breedCounts = new Map<string, number>();
    for (const row of (breedsRes.data ?? []) as { species_id: string | null }[]) {
      if (row.species_id) breedCounts.set(row.species_id, (breedCounts.get(row.species_id) ?? 0) + 1);
    }

    const items: SpeciesSummary[] = rows.map((row) => ({
      id: row.id,
      name: row.name,
      description: row.description,
      status: row.status ?? "active",
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      breedCount: breedCounts.get(row.id) ?? 0,
      activePetCount: bySpecies.get(row.id) ?? 0,
    }));

    return { ok: true, data: { items, page, pageSize, total: count ?? 0 } };
  } catch (error) {
    return {
      ok: false,
      reason: "query_failed",
      message: error instanceof Error ? error.message : "Unknown query failure.",
    };
  }
}

export async function listBreeds(query: BreedsQuery): Promise<TaxonomyResult<BreedsResponse>> {
  if (!isSupabaseConfigured()) {
    return { ok: false, reason: "unconfigured", message: "Supabase env vars are not set." };
  }

  try {
    const { page, pageSize, q, status, speciesId } = query;
    const offset = (page - 1) * pageSize;

    let request = from(TABLES.breeds).select(BREED_COLUMNS, { count: "exact" });
    if (status !== "all") request = request.eq("status", status);
    if (speciesId !== "all" && UUID_RE.test(speciesId)) {
      request = request.eq("species_id", speciesId);
    }
    if (q) {
      const term = sanitizeSearch(q);
      if (term) request = request.ilike("name", `%${term}%`);
    }

    const { data, count, error } = await request
      .order("name", { ascending: true })
      .range(offset, offset + pageSize - 1);
    if (error) throw new Error(`pets.breeds: ${error.message}`);

    const rows = (data ?? []) as BreedRow[];
    if (rows.length === 0) {
      return { ok: true, data: { items: [], page, pageSize, total: count ?? 0 } };
    }

    const [names, { byBreed }] = await Promise.all([speciesNames(), petCounts()]);

    const items: BreedSummary[] = rows.map((row) => ({
      id: row.id,
      speciesId: row.species_id,
      speciesName: names.get(row.species_id) ?? null,
      name: row.name,
      description: row.description,
      status: row.status ?? "active",
      createdAt: row.created_at,
      activePetCount: byBreed.get(row.id) ?? 0,
    }));

    return { ok: true, data: { items, page, pageSize, total: count ?? 0 } };
  } catch (error) {
    return {
      ok: false,
      reason: "query_failed",
      message: error instanceof Error ? error.message : "Unknown query failure.",
    };
  }
}

/* -------------------------------------------------------------------------
 * Writes
 *
 * Every one runs write → audit row, returning `unaudited` if the audit write
 * fails — the same contract as every other action in the panel.
 * ---------------------------------------------------------------------- */

async function audit(
  actor: Actor,
  action: AuditAction,
  targetType: "species" | "breed",
  targetId: string,
  reason: string,
  metadata: Record<string, unknown>,
): Promise<TaxonomyActionResult> {
  const result = await writeAuditLog({
    actorId: actor.userId,
    actorEmail: actor.email,
    actorRole: actor.role,
    action,
    targetType,
    targetId,
    reason,
    metadata,
  });
  if (!result.ok) {
    return {
      ok: false,
      reason: "unaudited",
      message: `Saved, but the audit write failed: ${result.message}`,
    };
  }
  return { ok: true };
}

/**
 * Case-insensitive duplicate check.
 *
 * `species.name` has a UNIQUE constraint but it is case-SENSITIVE, so "dog"
 * and "Dog" would both be accepted by the database and then render as two
 * indistinguishable rows. `breeds` has no uniqueness constraint at all. Both
 * gaps are asks in the schema proposal; until then this is the only thing
 * standing between the taxonomy and a duplicate.
 */
async function nameTaken(
  ref: TableRef,
  name: string,
  opts: { speciesId?: string; excludeId?: string } = {},
): Promise<boolean> {
  let request = from(ref).select("id,name");
  if (opts.speciesId) request = request.eq("species_id", opts.speciesId);

  const { data, error } = await request;
  if (error) throw new Error(`${ref.schema}.${ref.table}: ${error.message}`);

  const target = name.trim().toLowerCase();
  return ((data ?? []) as { id: string; name: string | null }[]).some(
    (row) => row.id !== opts.excludeId && row.name?.trim().toLowerCase() === target,
  );
}

export async function createSpecies(
  input: CreateSpeciesRequest,
  reason: string,
  actor: Actor,
): Promise<TaxonomyActionResult> {
  if (!isSupabaseConfigured()) {
    return { ok: false, reason: "unconfigured", message: "Supabase env vars are not set." };
  }

  try {
    if (await nameTaken(TABLES.species, input.name)) {
      return { ok: false, reason: "conflict", message: `A species named "${input.name}" already exists.` };
    }

    const { data, error } = await from(TABLES.species)
      .insert({
        name: input.name,
        description: input.description,
        status: "active",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select("id")
      .maybeSingle();
    if (error) throw new Error(`pets.species: ${error.message}`);

    const id = (data as { id: string } | null)?.id;
    if (!id) throw new Error("pets.species: insert returned no id.");

    return await audit(actor, "species.create", "species", id, reason, {
      name: input.name,
      status: "active",
    });
  } catch (error) {
    return {
      ok: false,
      reason: "action_failed",
      message: error instanceof Error ? error.message : "Unknown action failure.",
    };
  }
}

export async function updateSpecies(
  speciesId: string,
  input: UpdateSpeciesRequest,
  reason: string,
  actor: Actor,
): Promise<TaxonomyActionResult> {
  if (!isSupabaseConfigured()) {
    return { ok: false, reason: "unconfigured", message: "Supabase env vars are not set." };
  }
  if (!UUID_RE.test(speciesId)) {
    return { ok: false, reason: "not_found", message: "No species with that id." };
  }

  try {
    const { data: existing, error: readError } = await from(TABLES.species)
      .select(SPECIES_COLUMNS)
      .eq("id", speciesId)
      .maybeSingle();
    if (readError) throw new Error(`pets.species: ${readError.message}`);
    if (!existing) return { ok: false, reason: "not_found", message: "No species with that id." };

    const before = existing as SpeciesRow;

    if (input.name && (await nameTaken(TABLES.species, input.name, { excludeId: speciesId }))) {
      return { ok: false, reason: "conflict", message: `A species named "${input.name}" already exists.` };
    }

    // Retiring a species that live pets still use would strand them: their
    // dropdown value disappears while the pet keeps pointing at it. The
    // database cannot express this rule, so it lives here.
    if (input.status === "inactive") {
      const { bySpecies } = await petCounts();
      const inUse = bySpecies.get(speciesId) ?? 0;
      if (inUse > 0) {
        return {
          ok: false,
          reason: "conflict",
          message: `${inUse} active pet${inUse === 1 ? "" : "s"} still use this species. Move them first.`,
        };
      }
    }

    const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (input.name !== undefined) patch.name = input.name;
    if (input.description !== undefined) patch.description = input.description;
    if (input.status !== undefined) patch.status = input.status;

    const { data: updated, error: updateError } = await from(TABLES.species)
      .update(patch)
      .eq("id", speciesId)
      .select("id");
    if (updateError) throw new Error(`pets.species: ${updateError.message}`);
    if ((updated ?? []).length === 0) {
      return { ok: false, reason: "not_found", message: "No species with that id." };
    }

    return await audit(actor, "species.update", "species", speciesId, reason, {
      previousName: before.name,
      newName: input.name ?? before.name,
      previousStatus: before.status,
      newStatus: input.status ?? before.status,
    });
  } catch (error) {
    return {
      ok: false,
      reason: "action_failed",
      message: error instanceof Error ? error.message : "Unknown action failure.",
    };
  }
}

export async function createBreed(
  input: CreateBreedRequest,
  reason: string,
  actor: Actor,
): Promise<TaxonomyActionResult> {
  if (!isSupabaseConfigured()) {
    return { ok: false, reason: "unconfigured", message: "Supabase env vars are not set." };
  }

  try {
    const { data: species, error: speciesError } = await from(TABLES.species)
      .select("id,name")
      .eq("id", input.speciesId)
      .maybeSingle();
    if (speciesError) throw new Error(`pets.species: ${speciesError.message}`);
    if (!species) return { ok: false, reason: "not_found", message: "No species with that id." };

    // Scoped to the species: "Unknown/Mixed" legitimately exists once per
    // species, so a global name check would reject the platform's own pattern.
    if (await nameTaken(TABLES.breeds, input.name, { speciesId: input.speciesId })) {
      return {
        ok: false,
        reason: "conflict",
        message: `"${input.name}" already exists under this species.`,
      };
    }

    const { data, error } = await from(TABLES.breeds)
      .insert({
        species_id: input.speciesId,
        name: input.name,
        description: input.description,
        status: "active",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select("id")
      .maybeSingle();
    if (error) throw new Error(`pets.breeds: ${error.message}`);

    const id = (data as { id: string } | null)?.id;
    if (!id) throw new Error("pets.breeds: insert returned no id.");

    return await audit(actor, "breed.create", "breed", id, reason, {
      name: input.name,
      speciesId: input.speciesId,
      speciesName: (species as { name: string }).name,
    });
  } catch (error) {
    return {
      ok: false,
      reason: "action_failed",
      message: error instanceof Error ? error.message : "Unknown action failure.",
    };
  }
}

export async function updateBreed(
  breedId: string,
  input: UpdateBreedRequest,
  reason: string,
  actor: Actor,
): Promise<TaxonomyActionResult> {
  if (!isSupabaseConfigured()) {
    return { ok: false, reason: "unconfigured", message: "Supabase env vars are not set." };
  }
  if (!UUID_RE.test(breedId)) {
    return { ok: false, reason: "not_found", message: "No breed with that id." };
  }

  try {
    const { data: existing, error: readError } = await from(TABLES.breeds)
      .select(BREED_COLUMNS)
      .eq("id", breedId)
      .maybeSingle();
    if (readError) throw new Error(`pets.breeds: ${readError.message}`);
    if (!existing) return { ok: false, reason: "not_found", message: "No breed with that id." };

    const before = existing as BreedRow;

    if (
      input.name &&
      (await nameTaken(TABLES.breeds, input.name, {
        speciesId: before.species_id,
        excludeId: breedId,
      }))
    ) {
      return {
        ok: false,
        reason: "conflict",
        message: `"${input.name}" already exists under this species.`,
      };
    }

    if (input.status === "inactive") {
      const { byBreed } = await petCounts();
      const inUse = byBreed.get(breedId) ?? 0;
      if (inUse > 0) {
        return {
          ok: false,
          reason: "conflict",
          message: `${inUse} active pet${inUse === 1 ? "" : "s"} still use this breed. Move them first.`,
        };
      }
    }

    const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (input.name !== undefined) patch.name = input.name;
    if (input.description !== undefined) patch.description = input.description;
    if (input.status !== undefined) patch.status = input.status;

    const { data: updated, error: updateError } = await from(TABLES.breeds)
      .update(patch)
      .eq("id", breedId)
      .select("id");
    if (updateError) throw new Error(`pets.breeds: ${updateError.message}`);
    if ((updated ?? []).length === 0) {
      return { ok: false, reason: "not_found", message: "No breed with that id." };
    }

    return await audit(actor, "breed.update", "breed", breedId, reason, {
      previousName: before.name,
      newName: input.name ?? before.name,
      previousStatus: before.status,
      newStatus: input.status ?? before.status,
      speciesId: before.species_id,
    });
  } catch (error) {
    return {
      ok: false,
      reason: "action_failed",
      message: error instanceof Error ? error.message : "Unknown action failure.",
    };
  }
}
