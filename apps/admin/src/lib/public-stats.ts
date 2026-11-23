import "server-only";

import { MIN_TRUST, pickString, resolvePhoto } from "@/lib/public-leaderboard";
import { createAdminClient } from "@/lib/supabase/admin";
import { isSupabaseConfigured } from "@/lib/supabase/reference";

/**
 * Backs the ONE unauthenticated route in this app: GET /api/public/vip-count
 * (see that route file, and the proxy.ts exemption for /api/public).
 *
 * Deliberately kept OUT of analytics.ts: that adapter's whole surface is
 * role-gated (requireRole() in every route that calls it), and this file's
 * job is the opposite — expose the smallest possible fact to literally
 * anyone, including a signed-out marketing-site visitor. Mixing the two
 * would make it too easy for a future analytics query to get copy-pasted
 * into a public response.
 *
 * SCHEMA: `identity.accounts` — same table analytics.ts's `totalUsers`
 * metric reads (see docs/admin/schema-notes.md). The service key has full
 * CRUD grants on all of `identity`, but this file selects nothing except a
 * `head: true` exact count: no row, no column, no PII ever leaves this
 * function. That is what makes it safe to serve with no auth at all, on the
 * same production database that currently has RLS disabled and an open P0
 * on that schema (see schema-notes.md "Security findings" #1) — a row-level
 * read would inherit that exposure, a count does not.
 */
export type PublicStatsResult<T> =
  | { ok: true; data: T }
  | { ok: false; reason: "unconfigured" | "query_failed"; message: string };

export type VipCountPayload = {
  /** Total registered accounts right now (identity.accounts row count). */
  claimed: number;
  /** The promised cap — see vipOffer in the marketing site's config/site.ts. */
  cap: number;
};

const VIP_CAP = 1_000;

export async function fetchVipCount(): Promise<PublicStatsResult<VipCountPayload>> {
  if (!isSupabaseConfigured()) {
    return { ok: false, reason: "unconfigured", message: "Supabase env vars are not set." };
  }

  try {
    const supabase = createAdminClient();
    // head: true — no rows transferred, only the exact count header.
    const { count, error } = await supabase
      .schema("identity")
      .from("accounts")
      .select("*", { count: "exact", head: true });

    if (error) throw new Error(`identity.accounts: ${error.message}`);

    return { ok: true, data: { claimed: count ?? 0, cap: VIP_CAP } };
  } catch (error) {
    return {
      ok: false,
      reason: "query_failed",
      message: error instanceof Error ? error.message : "Unknown query failure.",
    };
  }
}

// One side of the showcased match: what the leaderboard already shows publicly, and nothing more (no id, owner or score).
export type PublicMatchPet = { name: string; species: string | null; photoUrl: string | null };

// Public match data for the marketing site: two counts plus, optionally, the latest eligible match.
export type MatchStatsPayload = {
  /** Every match ever made, active or since ended. */
  matches: number;
  /** Distinct pets that appear in at least one match. */
  pets: number;
  /** Latest active match between two pets in good standing, at least LATEST_DELAY_HOURS old; null if none qualifies. */
  latest: { a: PublicMatchPet; b: PublicMatchPet; matchedOn: string } | null;
};

const MATCH_PAGE = 1000;
// A match only appears a day after it happens, so the website can't pin it to a moment.
const LATEST_DELAY_HOURS = 24;
// Newest matches checked for two eligible pets before giving up.
const LATEST_CANDIDATES = 25;

// Same bar as the leaderboard: active, not deleted, named, trust above the warning band.
async function latestPublicMatch(supabase: ReturnType<typeof createAdminClient>): Promise<MatchStatsPayload["latest"]> {
  const cutoff = new Date(Date.now() - LATEST_DELAY_HOURS * 3_600_000).toISOString();
  const { data: matchRows, error } = await supabase
    .schema("matching")
    .from("matches")
    .select("pet_1_id,pet_2_id,matched_at")
    .eq("status", "active")
    .is("ended_at", null)
    .lte("matched_at", cutoff)
    .order("matched_at", { ascending: false })
    .limit(LATEST_CANDIDATES);
  if (error) throw new Error(`matching.matches: ${error.message}`);
  const candidates = (matchRows ?? []) as { pet_1_id: string | null; pet_2_id: string | null; matched_at: string }[];
  const ids = [...new Set(candidates.flatMap((m) => [m.pet_1_id, m.pet_2_id]).filter((id): id is string => Boolean(id)))];
  if (ids.length === 0) return null;

  const { data: petRows, error: petError } = await supabase
    .schema("pets")
    .from("pets")
    .select("*")
    .in("id", ids)
    .eq("status", "active")
    .is("deleted_at", null)
    .gt("trust_score", MIN_TRUST);
  if (petError) throw new Error(`pets.pets: ${petError.message}`);

  const eligible = new Map<string, { name: string; speciesId: string | null; photoUrl: string | null }>();
  for (const row of (petRows ?? []) as Record<string, unknown>[]) {
    const name = pickString(row, ["name", "pet_name"]);
    if (typeof row.id !== "string" || !name) continue;
    eligible.set(row.id, {
      name,
      speciesId: typeof row.species_id === "string" ? row.species_id : null,
      photoUrl: resolvePhoto(pickString(row, ["profile_photo_url", "profile_photo_path", "photo_url"])),
    });
  }

  const pick = candidates.find(
    (m) => m.pet_1_id && m.pet_2_id && m.pet_1_id !== m.pet_2_id && eligible.has(m.pet_1_id) && eligible.has(m.pet_2_id),
  );
  if (!pick || !pick.pet_1_id || !pick.pet_2_id) return null;
  const a = eligible.get(pick.pet_1_id)!;
  const b = eligible.get(pick.pet_2_id)!;

  const speciesIds = [a.speciesId, b.speciesId].filter((id): id is string => Boolean(id));
  const speciesNames = new Map<string, string>();
  if (speciesIds.length) {
    const { data: speciesRows } = await supabase.schema("pets").from("species").select("id,name").in("id", speciesIds);
    for (const row of (speciesRows ?? []) as { id: string; name: string }[]) speciesNames.set(String(row.id), row.name);
  }
  const show = (p: typeof a): PublicMatchPet => ({
    name: p.name,
    species: p.speciesId ? (speciesNames.get(p.speciesId) ?? null) : null,
    photoUrl: p.photoUrl,
  });
  // Day only: the exact time would add nothing a visitor needs.
  return { a: show(a), b: show(b), matchedOn: pick.matched_at.slice(0, 10) };
}

export async function fetchMatchStats(): Promise<PublicStatsResult<MatchStatsPayload>> {
  if (!isSupabaseConfigured()) {
    return { ok: false, reason: "unconfigured", message: "Supabase env vars are not set." };
  }

  try {
    const supabase = createAdminClient();
    const pets = new Set<string>();
    let matches = 0;
    // Paged: PostgREST caps a response at max-rows, and distinct pets cannot come from a count header.
    for (let offset = 0; ; offset += MATCH_PAGE) {
      const { data, error } = await supabase
        .schema("matching")
        .from("matches")
        .select("pet_1_id,pet_2_id")
        .order("id", { ascending: true })
        .range(offset, offset + MATCH_PAGE - 1);
      if (error) throw new Error(`matching.matches: ${error.message}`);
      const rows = (data ?? []) as { pet_1_id: string | null; pet_2_id: string | null }[];
      for (const row of rows) {
        matches++;
        if (row.pet_1_id) pets.add(row.pet_1_id);
        if (row.pet_2_id) pets.add(row.pet_2_id);
      }
      if (rows.length < MATCH_PAGE) break;
    }
    // The showcase is a bonus: if it fails, the counts still go out.
    const latest = await latestPublicMatch(supabase).catch(() => null);
    return { ok: true, data: { matches, pets: pets.size, latest } };
  } catch (error) {
    return {
      ok: false,
      reason: "query_failed",
      message: error instanceof Error ? error.message : "Unknown query failure.",
    };
  }
}
