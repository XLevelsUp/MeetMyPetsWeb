/**
 * Client-side fetch for the public leaderboard.
 *
 * Points at apps/admin's second unauthenticated route
 * (`/api/public/leaderboard`). Like lib/vip-count.ts, this never throws and
 * never fabricates: an unset or unreachable endpoint resolves to an error
 * result, and the caller renders a fallback rather than inventing a ranking.
 *
 * No score is in the payload by design. The site shows rank only.
 */

const ENDPOINT = process.env.NEXT_PUBLIC_LEADERBOARD_ENDPOINT;

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

export type LeaderboardData = {
  categories: LeaderboardCategory[];
  updatedAt: string;
};

export type LeaderboardResult =
  | { ok: true; data: LeaderboardData }
  | { ok: false; reason: "unconfigured" | "network" };

export const isLeaderboardConfigured = Boolean(ENDPOINT);

const IDS = new Set<CategoryId>(["popular", "matched", "liked", "followed"]);

function isEntry(value: unknown): value is LeaderboardEntry {
  if (typeof value !== "object" || value === null) return false;
  const v = value as Record<string, unknown>;
  return typeof v.rank === "number" && typeof v.name === "string" && v.name.trim() !== "";
}

export async function fetchLeaderboard(signal?: AbortSignal): Promise<LeaderboardResult> {
  if (!ENDPOINT) return { ok: false, reason: "unconfigured" };

  try {
    const response = await fetch(ENDPOINT, { signal });
    if (!response.ok) return { ok: false, reason: "network" };

    const body: unknown = await response.json();
    if (typeof body !== "object" || body === null) return { ok: false, reason: "network" };

    const raw = body as Record<string, unknown>;
    // Validate rather than trust: a malformed payload must not render as a
    // half-built board.
    const categories = Array.isArray(raw.categories)
      ? (raw.categories as Record<string, unknown>[])
          .filter((c) => IDS.has(c.id as CategoryId))
          .map((c) => ({
            id: c.id as CategoryId,
            entries: Array.isArray(c.entries) ? c.entries.filter(isEntry) : [],
          }))
      : [];

    return {
      ok: true,
      data: {
        categories,
        updatedAt: typeof raw.updatedAt === "string" ? raw.updatedAt : new Date().toISOString(),
      },
    };
  } catch {
    // AbortError included: a superseded request is not a failure worth showing.
    return { ok: false, reason: "network" };
  }
}
