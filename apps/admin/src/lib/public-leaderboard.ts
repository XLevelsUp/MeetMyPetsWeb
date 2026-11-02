import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import { isSupabaseConfigured } from "@/lib/supabase/reference";

/**
 * Backs GET /api/public/leaderboard — one of two unauthenticated routes in this
 * app (see also public-stats.ts, and the proxy.ts matcher exempting /api/public).
 *
 * WHAT LEAVES THIS FUNCTION, AND WHY IT IS SAFE
 * Pet name, species name, public photo URL and a rank. Nothing else. No pet id,
 * no account id, no owner name, and no score. The marketing site calls the
 * metric "Popularity"; the internal term must never appear in anything returned
 * here, because the response is world readable.
 *
 * WHO IS EXCLUDED
 * Anything other than an active pet in good standing: deleted pets, non-active
 * status, and every pet at or below the `warning` trust band (<= 250, per
 * pets.get_pet_trust_status). A public board is the worst place to surface a
 * pet the trust engine has flagged.
 *
 * SCHEMA FACTS VERIFIED LIVE 2026-11-02
 * - All ids are UUIDs (strings), not integers.
 * - Photos are `pets.pets.profile_photo_url` — NOT pets.pet_media, which has no
 *   grant. The bucket is public, so the URL renders directly.
 * - `pets.species` IS readable with the service key here, despite the note in
 *   schema-notes.md that says otherwise.
 * - `matching.matches` names both pets (pet_1_id, pet_2_id) — both are credited.
 * - `social.post_likes` points at a post, so posts resolve like -> owning pet.
 */

export type CategoryId = "popular" | "matched" | "liked" | "followed";

export type LeaderboardEntry = {
  rank: number;
  name: string;
  species: string | null;
  photoUrl: string | null;
};

export type LeaderboardCategory = {
  id: CategoryId;
  entries: LeaderboardEntry[];
};

export type LeaderboardPayload = {
  categories: LeaderboardCategory[];
  updatedAt: string;
};

export type PublicResult<T> =
  | { ok: true; data: T }
  | { ok: false; reason: "unconfigured" | "query_failed"; message: string };

/** Below this band a pet is in warning, temporary or permanent ban. */
const MIN_TRUST = 250;
/** Three per category, as the marketing page shows a podium of three. */
const PER_CATEGORY = 3;
/** Generous ceiling on relation scans — the largest table today holds ~1,100 rows. */
const SCAN_LIMIT = 20_000;

type Pet = {
  name: string;
  speciesId: string | null;
  photoUrl: string | null;
  trust: number;
};

/**
 * Supabase Storage public URLs are already absolute. A bare object path is
 * resolved against the project's public bucket instead, so both shapes work.
 */
function resolvePhoto(value: unknown): string | null {
  if (typeof value !== "string" || value.trim() === "") return null;
  const raw = value.trim();
  if (raw.startsWith("http://") || raw.startsWith("https://")) return raw;
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!base) return null;
  return `${base}/storage/v1/object/public/${raw.replace(/^\/+/, "")}`;
}

function pickString(row: Record<string, unknown>, keys: string[]): string | null {
  for (const key of keys) {
    const value = row[key];
    if (typeof value === "string" && value.trim() !== "") return value.trim();
  }
  return null;
}

/** Top N pet ids by tally, ties broken by name so the order is stable between calls. */
function topBy(
  tally: Map<string, number>,
  pets: Map<string, Pet>,
  limit: number,
): string[] {
  return [...tally.entries()]
    .filter(([id, n]) => n > 0 && pets.has(id))
    .sort((a, b) => b[1] - a[1] || pets.get(a[0])!.name.localeCompare(pets.get(b[0])!.name))
    .slice(0, limit)
    .map(([id]) => id);
}

export async function fetchLeaderboard(): Promise<PublicResult<LeaderboardPayload>> {
  if (!isSupabaseConfigured()) {
    return { ok: false, reason: "unconfigured", message: "Supabase env vars are not set." };
  }

  try {
    const supabase = createAdminClient();

    // 1. Eligible pets.
    const { data: petRows, error: petError } = await supabase
      .schema("pets")
      .from("pets")
      .select("*")
      .eq("status", "active")
      .is("deleted_at", null)
      .gt("trust_score", MIN_TRUST);

    if (petError) throw new Error(`pets.pets: ${petError.message}`);

    const pets = new Map<string, Pet>();
    for (const row of (petRows ?? []) as Record<string, unknown>[]) {
      const id = typeof row.id === "string" ? row.id : null;
      const name = pickString(row, ["name", "pet_name"]);
      // A nameless pet cannot be shown; there would be nothing to label the card.
      if (!id || !name) continue;
      pets.set(id, {
        name,
        speciesId: typeof row.species_id === "string" ? row.species_id : null,
        photoUrl: resolvePhoto(
          pickString(row, ["profile_photo_url", "profile_photo_path", "photo_url"]),
        ),
        trust: typeof row.trust_score === "number" ? row.trust_score : 0,
      });
    }

    const ids = [...pets.keys()];
    if (ids.length === 0) {
      return { ok: true, data: { categories: [], updatedAt: new Date().toISOString() } };
    }

    // 2. The three relation tallies, in parallel. Counted in JS because
    //    PostgREST cannot GROUP BY and an RPC would need a grant this key lacks.
    const [matchesRes, followsRes, postsRes] = await Promise.all([
      supabase
        .schema("matching")
        .from("matches")
        .select("pet_1_id,pet_2_id")
        .eq("status", "active")
        .limit(SCAN_LIMIT),
      supabase
        .schema("matching")
        .from("pet_follows")
        .select("target_pet_id")
        .in("target_pet_id", ids)
        .limit(SCAN_LIMIT),
      supabase
        .schema("social")
        .from("posts")
        .select("id,pet_id")
        .in("pet_id", ids)
        .is("deleted_at", null)
        .limit(SCAN_LIMIT),
    ]);

    const matched = new Map<string, number>();
    // A match credits BOTH pets — it is mutual by definition.
    for (const row of (matchesRes.data ?? []) as Record<string, string>[]) {
      for (const key of ["pet_1_id", "pet_2_id"]) {
        const id = row[key];
        if (id && pets.has(id)) matched.set(id, (matched.get(id) ?? 0) + 1);
      }
    }

    const followed = new Map<string, number>();
    for (const row of (followsRes.data ?? []) as { target_pet_id: string }[]) {
      const id = row.target_pet_id;
      if (id) followed.set(id, (followed.get(id) ?? 0) + 1);
    }

    // Likes land on posts, so map post -> pet first.
    const postOwner = new Map<string, string>();
    for (const row of (postsRes.data ?? []) as { id: string; pet_id: string }[]) {
      if (row.id && row.pet_id) postOwner.set(row.id, row.pet_id);
    }

    const liked = new Map<string, number>();
    if (postOwner.size > 0) {
      const { data: likeRows } = await supabase
        .schema("social")
        .from("post_likes")
        .select("post_id")
        .in("post_id", [...postOwner.keys()])
        .limit(SCAN_LIMIT);
      for (const row of (likeRows ?? []) as { post_id: string }[]) {
        const owner = postOwner.get(row.post_id);
        if (owner && pets.has(owner)) liked.set(owner, (liked.get(owner) ?? 0) + 1);
      }
    }

    // 3. Species names. Readable with this key — verified live.
    const speciesNames = new Map<string, string>();
    const { data: speciesRows } = await supabase
      .schema("pets")
      .from("species")
      .select("id,name");
    for (const row of (speciesRows ?? []) as { id: string; name: string }[]) {
      speciesNames.set(String(row.id), row.name);
    }

    // 4. Build each category.
    const popular = [...pets.entries()]
      .sort((a, b) => b[1].trust - a[1].trust || a[1].name.localeCompare(b[1].name))
      .slice(0, PER_CATEGORY)
      .map(([id]) => id);

    const toEntries = (petIds: string[]): LeaderboardEntry[] =>
      petIds.map((id, index) => {
        const pet = pets.get(id)!;
        return {
          rank: index + 1,
          name: pet.name,
          species: pet.speciesId ? (speciesNames.get(pet.speciesId) ?? null) : null,
          photoUrl: pet.photoUrl,
        };
      });

    const categories: LeaderboardCategory[] = [
      { id: "popular", entries: toEntries(popular) },
      { id: "matched", entries: toEntries(topBy(matched, pets, PER_CATEGORY)) },
      { id: "liked", entries: toEntries(topBy(liked, pets, PER_CATEGORY)) },
      { id: "followed", entries: toEntries(topBy(followed, pets, PER_CATEGORY)) },
    ];

    return { ok: true, data: { categories, updatedAt: new Date().toISOString() } };
  } catch (error) {
    return {
      ok: false,
      reason: "query_failed",
      message: error instanceof Error ? error.message : "Unknown query failure.",
    };
  }
}
