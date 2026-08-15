import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import { createReferenceClient, isSupabaseConfigured } from "@/lib/supabase/reference";
import { writeAuditLog, type AuditAction } from "@/lib/audit";
import { liftRestrictions, insertRestriction as writeRestriction } from "@/lib/restrictions";
import type { AdminRole } from "@/lib/roles";
import type {
  AccountDetail,
  AccountSummary,
  AccountsQuery,
  AccountsResponse,
  PetSummary,
  PetsQuery,
  PetsResponse,
  Restriction,
  RestrictionKind,
} from "@/lib/users-contract";

/**
 * Users & Pets moderation adapter — one of the two files that know the
 * database schema (the other is dal.ts).
 *
 * SCHEMA (verified 2026-08-06, docs/admin/schema-notes.md): accounts live in
 * `identity`, pets in `pets`, and our own moderation state in `public`.
 * PostgREST cannot join across schemas, so anything that spans them (account →
 * restriction, pet → species name) is two queries merged through a Map — the
 * same shape `analytics.ts` already uses for its species breakdown.
 *
 * WRITES: this adapter never writes `identity.accounts.status`. That column is
 * the backend's user-lifecycle vocabulary ("active"/"archived"); moderation
 * state is ours and lives in `public.admin_restrictions`. Enforcement is the
 * Supabase Auth ban, which locks the user out of the mobile app too.
 *
 * House adapter pattern: discriminated unions, never throws.
 */

export type UsersResult<T> =
  | { ok: true; data: T }
  | { ok: false; reason: "unconfigured" | "not_found" | "query_failed"; message: string };

/**
 * `unaudited` means the moderation action WAS applied but the audit write
 * failed. The route turns it into a 500 so nothing is ever silently
 * unaudited — see docs/admin/README.md §5.
 */
export type ActionResult =
  | { ok: true }
  | {
      ok: false;
      reason: "unconfigured" | "not_found" | "action_failed" | "unaudited";
      message: string;
    };

const TABLES = {
  accounts: { schema: "identity", table: "accounts" },
  profiles: { schema: "identity", table: "account_profiles" },
  verifications: { schema: "identity", table: "account_verifications" },
  pets: { schema: "pets", table: "pets" },
  species: { schema: "pets", table: "species" },
  breeds: { schema: "pets", table: "breeds" },
  /** Ours — public because that schema is already exposed to the Data API. */
  restrictions: { schema: "public", table: "admin_restrictions" },
} as const;

type TableRef = { schema: string; table: string };

/** Most severe first — what a row's badge shows when several are active. */
const KIND_PRECEDENCE: RestrictionKind[] = ["banned", "suspended", "flagged"];

/** Effectively permanent; GoTrue has no "forever", so 100 years stands in. */
const BAN_FOREVER = "876000h";

type Actor = { userId: string; email: string; role: AdminRole };

function client() {
  return createAdminClient();
}

function from(ref: TableRef) {
  return client().schema(ref.schema).from(ref.table);
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * PostgREST's `or=(...)` mini-language uses commas and parens as structure, so
 * a search term containing them would change the filter's meaning. Strip them
 * (and quotes/backslashes) rather than trying to escape. Dots are safe: the
 * parser only splits on the first two.
 */
function sanitizeSearch(term: string): string {
  return term.replace(/[,()"\\*]/g, "").trim();
}

function combinePhone(code: string | null, number: string | null): string | null {
  if (!number) return null;
  return code ? `${code} ${number}` : number;
}

type RestrictionRow = {
  target_id: string;
  kind: RestrictionKind;
  reason: string;
  created_at: string;
  expires_at: string | null;
  lifted_at: string | null;
};

function toRestriction(row: RestrictionRow): Restriction {
  return {
    kind: row.kind,
    reason: row.reason,
    createdAt: row.created_at,
    expiresAt: row.expires_at,
    liftedAt: row.lifted_at,
  };
}

/** Active = not lifted and not expired. Expiry is checked here, not in SQL. */
function isActive(row: RestrictionRow, now = Date.now()): boolean {
  if (row.lifted_at) return false;
  if (row.expires_at && new Date(row.expires_at).getTime() <= now) return false;
  return true;
}

/**
 * Fetches active restrictions for a set of targets and returns the
 * highest-precedence one per target id.
 */
async function activeRestrictionsFor(
  targetType: "account" | "pet",
  ids: string[],
): Promise<Map<string, Restriction>> {
  const result = new Map<string, Restriction>();
  if (ids.length === 0) return result;

  const { data, error } = await from(TABLES.restrictions)
    .select("target_id,kind,reason,created_at,expires_at,lifted_at")
    .eq("target_type", targetType)
    .in("target_id", ids)
    .is("lifted_at", null);
  if (error) throw new Error(`admin_restrictions: ${error.message}`);

  const now = Date.now();
  for (const row of (data ?? []) as RestrictionRow[]) {
    if (!isActive(row, now)) continue;
    const existing = result.get(row.target_id);
    if (
      !existing ||
      KIND_PRECEDENCE.indexOf(row.kind) < KIND_PRECEDENCE.indexOf(existing.kind)
    ) {
      result.set(row.target_id, toRestriction(row));
    }
  }
  return result;
}

/** Target ids carrying an active restriction of the given kind. */
async function idsWithRestriction(
  targetType: "account" | "pet",
  kind: RestrictionKind,
): Promise<string[]> {
  const { data, error } = await from(TABLES.restrictions)
    .select("target_id,kind,reason,created_at,expires_at,lifted_at")
    .eq("target_type", targetType)
    .eq("kind", kind)
    .is("lifted_at", null);
  if (error) throw new Error(`admin_restrictions: ${error.message}`);

  const now = Date.now();
  return ((data ?? []) as RestrictionRow[]).filter((r) => isActive(r, now)).map((r) => r.target_id);
}

/** id → name for the anon-readable reference tables. */
async function referenceNames(ref: TableRef): Promise<Map<string, string>> {
  const { data, error } = await createReferenceClient()
    .schema(ref.schema)
    .from(ref.table)
    .select("id,name");
  if (error) throw new Error(`${ref.table}: ${error.message}`);

  const map = new Map<string, string>();
  for (const row of (data ?? []) as { id: string; name: string | null }[]) {
    if (row.name?.trim()) map.set(row.id, row.name.trim());
  }
  return map;
}

/* -------------------------------------------------------------------------
 * Reads
 * ---------------------------------------------------------------------- */

export async function listAccounts(query: AccountsQuery): Promise<UsersResult<AccountsResponse>> {
  if (!isSupabaseConfigured()) {
    return { ok: false, reason: "unconfigured", message: "Supabase env vars are not set." };
  }

  try {
    const { page, pageSize, q, status } = query;
    const offset = (page - 1) * pageSize;

    // Resolve the cross-schema filter first: our restrictions table can't be
    // joined to theirs, and an empty result means we can skip the page query
    // entirely. TODO(scale): fold into a SQL function once counts warrant it.
    let restrictedIds: string[] | null = null;
    if (status === "suspended" || status === "banned") {
      restrictedIds = await idsWithRestriction("account", status);
      if (restrictedIds.length === 0) {
        return { ok: true, data: { items: [], page, pageSize, total: 0 } };
      }
    }

    let request = from(TABLES.accounts)
      .select(
        "id,auth_user_id,email,phone_country_code,phone_number,display_name,status,created_at,last_activity_at",
        { count: "exact" },
      );

    if (q) {
      const term = sanitizeSearch(q);
      if (term) {
        request = UUID_RE.test(term)
          ? request.or(`id.eq.${term},auth_user_id.eq.${term}`)
          : request.or(
              `email.ilike.*${term}*,display_name.ilike.*${term}*,phone_number.ilike.*${term}*`,
            );
      }
    }

    if (status === "active" || status === "archived") {
      request = request.eq("status", status);
    } else if (restrictedIds) {
      request = request.in("id", restrictedIds);
    }

    const { data, count, error } = await request
      .order("created_at", { ascending: false })
      .range(offset, offset + pageSize - 1);
    if (error) throw new Error(`identity.accounts: ${error.message}`);

    const rows = (data ?? []) as {
      id: string;
      email: string | null;
      phone_country_code: string | null;
      phone_number: string | null;
      display_name: string | null;
      status: string | null;
      created_at: string | null;
      last_activity_at: string | null;
    }[];
    const ids = rows.map((r) => r.id);

    const [restrictions, petCounts] = await Promise.all([
      activeRestrictionsFor("account", ids),
      petCountsFor(ids),
    ]);

    const items: AccountSummary[] = rows.map((row) => ({
      id: row.id,
      email: row.email,
      phone: combinePhone(row.phone_country_code, row.phone_number),
      displayName: row.display_name,
      status: row.status,
      createdAt: row.created_at,
      lastActivityAt: row.last_activity_at,
      petCount: petCounts.get(row.id) ?? 0,
      restriction: restrictions.get(row.id) ?? null,
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

async function petCountsFor(accountIds: string[]): Promise<Map<string, number>> {
  const counts = new Map<string, number>();
  if (accountIds.length === 0) return counts;

  const { data, error } = await from(TABLES.pets)
    .select("id,owner_account_id")
    .in("owner_account_id", accountIds)
    .is("deleted_at", null);
  if (error) throw new Error(`pets.pets: ${error.message}`);

  for (const row of (data ?? []) as { owner_account_id: string | null }[]) {
    if (!row.owner_account_id) continue;
    counts.set(row.owner_account_id, (counts.get(row.owner_account_id) ?? 0) + 1);
  }
  return counts;
}

export async function getAccountDetail(id: string): Promise<UsersResult<AccountDetail>> {
  if (!isSupabaseConfigured()) {
    return { ok: false, reason: "unconfigured", message: "Supabase env vars are not set." };
  }
  if (!UUID_RE.test(id)) {
    return { ok: false, reason: "not_found", message: "No account with that id." };
  }

  try {
    const { data: account, error: accountError } = await from(TABLES.accounts)
      .select(
        "id,email,phone_country_code,phone_number,display_name,status,created_at,last_activity_at,last_login_at,email_verified,phone_verified,deleted_at",
      )
      .eq("id", id)
      .maybeSingle();
    if (accountError) throw new Error(`identity.accounts: ${accountError.message}`);
    if (!account) return { ok: false, reason: "not_found", message: "No account with that id." };

    const [profileRes, petsRes, restrictionsRes, verificationsRes] = await Promise.all([
      from(TABLES.profiles)
        .select("name,bio,city,state,country,gender,avatar_url")
        .eq("account_id", id)
        .maybeSingle(),
      from(TABLES.pets)
        .select("id,name,species_id,breed_id,status,owner_account_id,created_at,profile_photo_url")
        .eq("owner_account_id", id)
        .order("created_at", { ascending: false }),
      from(TABLES.restrictions)
        .select("target_id,kind,reason,created_at,expires_at,lifted_at")
        .eq("target_type", "account")
        .eq("target_id", id)
        .order("created_at", { ascending: false }),
      from(TABLES.verifications)
        .select("id,verification_type,status,created_at,verified_at")
        .eq("account_id", id)
        .order("created_at", { ascending: false }),
    ]);

    if (profileRes.error) throw new Error(`identity.account_profiles: ${profileRes.error.message}`);
    if (petsRes.error) throw new Error(`pets.pets: ${petsRes.error.message}`);
    if (restrictionsRes.error) throw new Error(`admin_restrictions: ${restrictionsRes.error.message}`);
    if (verificationsRes.error) {
      throw new Error(`identity.account_verifications: ${verificationsRes.error.message}`);
    }

    const petRows = (petsRes.data ?? []) as PetRow[];
    const [pets, restrictionsForPets] = await Promise.all([
      decoratePets(petRows),
      activeRestrictionsFor(
        "pet",
        petRows.map((p) => p.id),
      ),
    ]);
    for (const pet of pets) {
      pet.restriction = restrictionsForPets.get(pet.id) ?? null;
    }

    const history = (restrictionsRes.data ?? []) as RestrictionRow[];
    const now = Date.now();
    const activeOnAccount = history
      .filter((r) => isActive(r, now))
      .sort((a, b) => KIND_PRECEDENCE.indexOf(a.kind) - KIND_PRECEDENCE.indexOf(b.kind))[0];

    const profile = profileRes.data as {
      name: string | null;
      bio: string | null;
      city: string | null;
      state: string | null;
      country: string | null;
      gender: string | null;
      avatar_url: string | null;
    } | null;

    const acct = account as {
      id: string;
      email: string | null;
      phone_country_code: string | null;
      phone_number: string | null;
      display_name: string | null;
      status: string | null;
      created_at: string | null;
      last_activity_at: string | null;
      last_login_at: string | null;
      email_verified: boolean | null;
      phone_verified: boolean | null;
      deleted_at: string | null;
    };

    return {
      ok: true,
      data: {
        id: acct.id,
        email: acct.email,
        phone: combinePhone(acct.phone_country_code, acct.phone_number),
        displayName: acct.display_name,
        status: acct.status,
        createdAt: acct.created_at,
        lastActivityAt: acct.last_activity_at,
        lastLoginAt: acct.last_login_at,
        emailVerified: acct.email_verified,
        phoneVerified: acct.phone_verified,
        deletedAt: acct.deleted_at,
        petCount: pets.length,
        restriction: activeOnAccount ? toRestriction(activeOnAccount) : null,
        profile: profile
          ? {
              name: profile.name,
              bio: profile.bio,
              city: profile.city,
              state: profile.state,
              country: profile.country,
              gender: profile.gender,
              avatarUrl: profile.avatar_url,
            }
          : null,
        pets,
        restrictions: history.map(toRestriction),
        verifications: ((verificationsRes.data ?? []) as {
          id: string;
          verification_type: string | null;
          status: string | null;
          created_at: string | null;
          verified_at: string | null;
        }[]).map((v) => ({
          id: v.id,
          type: v.verification_type,
          status: v.status,
          createdAt: v.created_at,
          verifiedAt: v.verified_at,
        })),
      },
    };
  } catch (error) {
    return {
      ok: false,
      reason: "query_failed",
      message: error instanceof Error ? error.message : "Unknown query failure.",
    };
  }
}

type PetRow = {
  id: string;
  name: string | null;
  species_id: string | null;
  breed_id: string | null;
  status: string | null;
  owner_account_id: string | null;
  created_at: string | null;
  profile_photo_url: string | null;
};

/** Resolves species/breed ids to names via the anon reference client. */
async function decoratePets(rows: PetRow[]): Promise<PetSummary[]> {
  if (rows.length === 0) return [];
  const [species, breeds] = await Promise.all([
    referenceNames(TABLES.species),
    referenceNames(TABLES.breeds),
  ]);
  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    species: (row.species_id && species.get(row.species_id)) || null,
    breed: (row.breed_id && breeds.get(row.breed_id)) || null,
    status: row.status,
    ownerAccountId: row.owner_account_id,
    createdAt: row.created_at,
    photoUrl: row.profile_photo_url,
    restriction: null,
  }));
}

export async function listPets(query: PetsQuery): Promise<UsersResult<PetsResponse>> {
  if (!isSupabaseConfigured()) {
    return { ok: false, reason: "unconfigured", message: "Supabase env vars are not set." };
  }

  try {
    const { page, pageSize, q, status } = query;
    const offset = (page - 1) * pageSize;

    // Same cross-schema short-circuit as listAccounts.
    let flaggedIds: string[] | null = null;
    if (status === "flagged") {
      flaggedIds = await idsWithRestriction("pet", "flagged");
      if (flaggedIds.length === 0) {
        return { ok: true, data: { items: [], page, pageSize, total: 0 } };
      }
    }

    let request = from(TABLES.pets).select(
      "id,name,species_id,breed_id,status,owner_account_id,created_at,profile_photo_url",
      { count: "exact" },
    );

    if (q) {
      const term = sanitizeSearch(q);
      if (term) {
        request = UUID_RE.test(term)
          ? request.or(`id.eq.${term},owner_account_id.eq.${term}`)
          : request.ilike("name", `%${term}%`);
      }
    }

    if (status === "active" || status === "archived") {
      request = request.eq("status", status);
    } else if (flaggedIds) {
      request = request.in("id", flaggedIds);
    }

    const { data, count, error } = await request
      .order("created_at", { ascending: false })
      .range(offset, offset + pageSize - 1);
    if (error) throw new Error(`pets.pets: ${error.message}`);

    const rows = (data ?? []) as PetRow[];
    const [items, restrictions] = await Promise.all([
      decoratePets(rows),
      activeRestrictionsFor(
        "pet",
        rows.map((r) => r.id),
      ),
    ]);
    for (const pet of items) {
      pet.restriction = restrictions.get(pet.id) ?? null;
    }

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
 * Actions
 *
 * Every action runs enforcement → restriction row → audit row. A failed audit
 * write returns `unaudited` (the action already happened) rather than
 * pretending nothing occurred.
 * ---------------------------------------------------------------------- */

/**
 * Thin wrapper over the shared writer in `lib/restrictions.ts`, preserving this
 * adapter's throw-on-failure contract: every caller here runs inside
 * `runAccountAction` / `runPetAction`, whose catch turns a throw into
 * `action_failed`. A duplicate is a real failure on these paths — they lift the
 * existing restriction first, so hitting the unique index means something
 * raced.
 */
async function insertRestriction(
  targetType: "account" | "pet",
  targetId: string,
  kind: RestrictionKind,
  reason: string,
  actor: Actor,
  expiresAt: string | null,
): Promise<void> {
  const result = await writeRestriction(targetType, targetId, kind, reason, actor, expiresAt);
  if (!result.ok) throw new Error(`admin_restrictions: ${result.message}`);
}

async function audit(
  actor: Actor,
  action: AuditAction,
  targetType: "account" | "pet",
  targetId: string,
  reason: string,
  metadata: Record<string, unknown>,
): Promise<ActionResult> {
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
      message: `Action applied, but the audit write failed: ${result.message}`,
    };
  }
  return { ok: true };
}

/** Resolves the Supabase Auth user behind an account row. */
async function authUserIdFor(accountId: string): Promise<string | null> {
  const { data, error } = await from(TABLES.accounts)
    .select("auth_user_id")
    .eq("id", accountId)
    .maybeSingle();
  if (error) throw new Error(`identity.accounts: ${error.message}`);
  return (data as { auth_user_id: string | null } | null)?.auth_user_id ?? null;
}

async function setBan(authUserId: string, banDuration: string): Promise<void> {
  const { error } = await client().auth.admin.updateUserById(authUserId, {
    ban_duration: banDuration,
  });
  if (error) throw new Error(`auth.admin: ${error.message}`);
}

async function runAccountAction(
  accountId: string,
  actor: Actor,
  apply: (authUserId: string) => Promise<{ action: AuditAction; metadata: Record<string, unknown> }>,
  reason: string,
): Promise<ActionResult> {
  if (!isSupabaseConfigured()) {
    return { ok: false, reason: "unconfigured", message: "Supabase env vars are not set." };
  }
  if (!UUID_RE.test(accountId)) {
    return { ok: false, reason: "not_found", message: "No account with that id." };
  }

  try {
    const authUserId = await authUserIdFor(accountId);
    if (!authUserId) {
      return {
        ok: false,
        reason: "not_found",
        message: "No account with that id, or it has no linked auth user.",
      };
    }
    const { action, metadata } = await apply(authUserId);
    return await audit(actor, action, "account", accountId, reason, metadata);
  } catch (error) {
    return {
      ok: false,
      reason: "action_failed",
      message: error instanceof Error ? error.message : "Unknown action failure.",
    };
  }
}

export async function suspendAccount(
  accountId: string,
  reason: string,
  durationHours: number,
  actor: Actor,
): Promise<ActionResult> {
  return runAccountAction(
    accountId,
    actor,
    async (authUserId) => {
      const expiresAt = new Date(Date.now() + durationHours * 3600_000).toISOString();
      await setBan(authUserId, `${durationHours}h`);
      // Replace any existing suspension so the partial unique index holds.
      await liftRestrictions("account", accountId, ["suspended"], actor);
      await insertRestriction("account", accountId, "suspended", reason, actor, expiresAt);
      return { action: "account.suspend", metadata: { durationHours, expiresAt } };
    },
    reason,
  );
}

export async function banAccount(
  accountId: string,
  reason: string,
  actor: Actor,
): Promise<ActionResult> {
  return runAccountAction(
    accountId,
    actor,
    async (authUserId) => {
      await setBan(authUserId, BAN_FOREVER);
      await liftRestrictions("account", accountId, ["suspended", "banned"], actor);
      await insertRestriction("account", accountId, "banned", reason, actor, null);
      return { action: "account.ban", metadata: { banDuration: BAN_FOREVER } };
    },
    reason,
  );
}

export async function restoreAccount(
  accountId: string,
  reason: string,
  actor: Actor,
): Promise<ActionResult> {
  return runAccountAction(
    accountId,
    actor,
    async (authUserId) => {
      await setBan(authUserId, "none");
      const lifted = await liftRestrictions("account", accountId, ["suspended", "banned"], actor);
      return { action: "account.restore", metadata: { liftedCount: lifted } };
    },
    reason,
  );
}

async function runPetAction(
  petId: string,
  actor: Actor,
  apply: () => Promise<{ action: AuditAction; metadata: Record<string, unknown> }>,
  reason: string,
): Promise<ActionResult> {
  if (!isSupabaseConfigured()) {
    return { ok: false, reason: "unconfigured", message: "Supabase env vars are not set." };
  }
  if (!UUID_RE.test(petId)) {
    return { ok: false, reason: "not_found", message: "No pet with that id." };
  }

  try {
    const { data, error } = await from(TABLES.pets).select("id").eq("id", petId).maybeSingle();
    if (error) throw new Error(`pets.pets: ${error.message}`);
    if (!data) return { ok: false, reason: "not_found", message: "No pet with that id." };

    const { action, metadata } = await apply();
    return await audit(actor, action, "pet", petId, reason, metadata);
  } catch (error) {
    return {
      ok: false,
      reason: "action_failed",
      message: error instanceof Error ? error.message : "Unknown action failure.",
    };
  }
}

/**
 * Flag state lives only in our restrictions table — `service_role` has
 * SELECT-only on `pets.pets`, and writing the backend's `status` column would
 * overload their vocabulary anyway.
 */
export async function flagPet(petId: string, reason: string, actor: Actor): Promise<ActionResult> {
  return runPetAction(
    petId,
    actor,
    async () => {
      await liftRestrictions("pet", petId, ["flagged"], actor);
      await insertRestriction("pet", petId, "flagged", reason, actor, null);
      return { action: "pet.flag", metadata: {} };
    },
    reason,
  );
}

export async function unflagPet(petId: string, reason: string, actor: Actor): Promise<ActionResult> {
  return runPetAction(
    petId,
    actor,
    async () => {
      const lifted = await liftRestrictions("pet", petId, ["flagged"], actor);
      return { action: "pet.unflag", metadata: { liftedCount: lifted } };
    },
    reason,
  );
}
