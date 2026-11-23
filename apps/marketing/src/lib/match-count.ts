// Live match data from apps/admin's public route; null whenever unset or unreachable, never a guessed number.
const VIP_ENDPOINT = process.env.NEXT_PUBLIC_VIP_COUNT_ENDPOINT;

// Its own env var if set, else the sibling of the VIP route, so no new Vercel setting is required.
const ENDPOINT =
  process.env.NEXT_PUBLIC_MATCH_COUNT_ENDPOINT ??
  (VIP_ENDPOINT ? VIP_ENDPOINT.replace(/vip-count\/?$/, "match-count") : undefined);

export type MatchPet = { name: string; species: string | null; photoUrl: string | null };
export type LatestMatch = { a: MatchPet; b: MatchPet; matchedOn: string };
export type MatchCount = { matches: number; pets: number; latest: LatestMatch | null };

function asPet(value: unknown): MatchPet | null {
  const v = (value ?? {}) as Record<string, unknown>;
  if (typeof v.name !== "string" || !v.name.trim()) return null;
  return {
    name: v.name.trim(),
    species: typeof v.species === "string" ? v.species : null,
    photoUrl: typeof v.photoUrl === "string" && /^https:\/\//.test(v.photoUrl) ? v.photoUrl : null,
  };
}

// A malformed showcase is dropped on its own; the counts still render.
function asLatest(value: unknown): LatestMatch | null {
  const v = (value ?? {}) as Record<string, unknown>;
  const a = asPet(v.a);
  const b = asPet(v.b);
  if (!a || !b || typeof v.matchedOn !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(v.matchedOn)) return null;
  return { a, b, matchedOn: v.matchedOn };
}

export async function fetchMatchCount(): Promise<MatchCount | null> {
  if (!ENDPOINT) return null;
  try {
    const response = await fetch(ENDPOINT);
    if (!response.ok) return null;
    const body = ((await response.json()) ?? {}) as Record<string, unknown>;
    const { matches, pets } = body;
    if (typeof matches !== "number" || typeof pets !== "number" || matches < 0 || pets < 0) return null;
    return { matches, pets, latest: asLatest(body.latest) };
  } catch {
    return null;
  }
}
