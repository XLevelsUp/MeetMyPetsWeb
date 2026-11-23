import type { LocationBreakdown } from "@/lib/api-contract";
import { classifyCountry, districtAt, normalizeCity, normalizeState, stateAt } from "@/lib/geo/india";

export type LocationAccountRow = { id: string; deleted_at: string | null };

export type LocationProfileRow = {
  account_id: string;
  country: string | null;
  state: string | null;
  city: string | null;
  latitude: number | null;
  longitude: number | null;
};

export const TOP_CITY_LIMIT = 10;

type Placement =
  | { kind: "state"; state: string; via: "coordinates"; longitude: number; latitude: number }
  | { kind: "state"; state: string; via: "text" }
  | { kind: "outside" }
  | { kind: "unknown" };

function place(profile: LocationProfileRow | undefined): Placement {
  if (!profile) return { kind: "unknown" };

  const { latitude, longitude } = profile;
  // 0,0 is the classic "location permission denied" default, not a real place.
  const hasCoords =
    latitude !== null && longitude !== null && !(latitude === 0 && longitude === 0);
  if (hasCoords) {
    const fromGps = stateAt(longitude, latitude);
    if (fromGps) return { kind: "state", state: fromGps, via: "coordinates", longitude, latitude };
  }

  const country = classifyCountry(profile.country);
  if (country === "other") return { kind: "outside" };

  const fromText = normalizeState(profile.state);
  if (fromText) return { kind: "state", state: fromText, via: "text" };

  // GPS that missed every Indian state with no Indian text to override it is abroad.
  return hasCoords && country === null ? { kind: "outside" } : { kind: "unknown" };
}

/** Buckets every live account into one place; no database access, so it is testable with fixtures. */
export async function buildLocationBreakdown(
  accounts: LocationAccountRow[],
  profiles: LocationProfileRow[],
  now: Date = new Date(),
): Promise<LocationBreakdown> {
  const profileByAccount = new Map(profiles.map((p) => [p.account_id, p]));
  const live = accounts.filter((a) => a.deleted_at === null);

  const states = new Map<string, number>();
  const districts = new Map<string, { state: string; district: string; count: number }>();
  const cities = new Map<string, { city: string; state: string | null; count: number }>();
  let located = 0;
  let outsideIndia = 0;
  let unknown = 0;
  let fromCoordinates = 0;
  let fromText = 0;

  for (const account of live) {
    const profile = profileByAccount.get(account.id);
    const where = place(profile);

    if (where.kind === "state") {
      located++;
      if (where.via === "coordinates") {
        fromCoordinates++;
        const district = await districtAt(where.state, where.longitude, where.latitude);
        if (district) {
          const key = `${where.state}|${district}`;
          const entry = districts.get(key) ?? { state: where.state, district, count: 0 };
          entry.count++;
          districts.set(key, entry);
        }
      } else {
        fromText++;
      }
      states.set(where.state, (states.get(where.state) ?? 0) + 1);
    } else if (where.kind === "outside") {
      outsideIndia++;
    } else {
      unknown++;
    }

    // Cities are only grouped inside India, keyed by state so two same-named towns stay apart.
    const city = where.kind === "outside" ? null : normalizeCity(profile?.city);
    if (city) {
      const state = where.kind === "state" ? where.state : null;
      const key = `${city}|${state ?? ""}`;
      const entry = cities.get(key) ?? { city, state, count: 0 };
      entry.count++;
      cities.set(key, entry);
    }
  }

  const byCount = <T extends { count: number }>(a: T, b: T) => b.count - a.count;

  return {
    generatedAt: now.toISOString(),
    totalAccounts: live.length,
    located,
    outsideIndia,
    unknown,
    fromCoordinates,
    fromText,
    byState: [...states.entries()]
      .map(([state, count]) => ({ state, count }))
      .sort((a, b) => byCount(a, b) || a.state.localeCompare(b.state)),
    byDistrict: [...districts.values()].sort(
      (a, b) => byCount(a, b) || a.district.localeCompare(b.district),
    ),
    byCity: [...cities.values()]
      .sort((a, b) => byCount(a, b) || a.city.localeCompare(b.city))
      .slice(0, TOP_CITY_LIMIT),
  };
}
