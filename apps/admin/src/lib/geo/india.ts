import { geoBounds, geoContains } from "d3-geo";
import type { Feature, FeatureCollection, Geometry } from "geojson";
import { feature } from "topojson-client";
import type { GeometryCollection, Topology } from "topojson-specification";

// States/UTs from udit-001/india-maps-data (MIT), districts split per state, NOT simplified: simplifying swallows Puducherry and Chandigarh.
import { DISTRICT_LOADERS } from "./districts";
import { INDIA_STATE_NAMES } from "./state-names";
import topology from "./india-states.topo.json";

export type StateFeature = Feature<Geometry, { name: string }>;
export type DistrictFeature = StateFeature;

type Shapes = { features: StateFeature[]; bounds: [[number, number], [number, number]][] };

const topo = topology as unknown as Topology<{ states: GeometryCollection<{ name: string }> }>;

function toShapes(source: unknown, object: string): Shapes {
  const t = source as Topology<Record<string, GeometryCollection<{ name: string }>>>;
  const collection = feature(t, t.objects[object]) as FeatureCollection<Geometry, { name: string }>;
  const features = collection.features as StateFeature[];
  return { features, bounds: features.map((f) => geoBounds(f)) };
}

let states: Shapes | null = null;
const load = () => (states ??= toShapes(topo, "states"));

/** The 36 state and union-territory outlines, in the shape chartjs-chart-geo draws. */
export function indiaStateFeatures(): StateFeature[] {
  return load().features;
}

export { INDIA_STATE_NAMES };

const districtCache = new Map<string, Promise<Shapes>>();

function loadDistricts(state: string): Promise<Shapes> | null {
  const loader = DISTRICT_LOADERS[state];
  if (!loader) return null;
  let pending = districtCache.get(state);
  if (!pending) {
    pending = loader().then((mod) => toShapes(mod.default, "districts"));
    // A failed chunk load must be retryable, not cached forever.
    pending.catch(() => districtCache.delete(state));
    districtCache.set(state, pending);
  }
  return pending;
}

/** District outlines for one state, fetched on first use; empty for an unknown state. */
export async function stateDistrictFeatures(state: string): Promise<DistrictFeature[]> {
  return (await loadDistricts(state))?.features ?? [];
}

function containing({ features, bounds }: Shapes, longitude: number, latitude: number): string | null {
  for (let i = 0; i < features.length; i++) {
    const [[west, south], [east, north]] = bounds[i];
    // Bounding-box reject first: geoContains is spherical and far slower.
    if (longitude < west || longitude > east || latitude < south || latitude > north) continue;
    if (geoContains(features[i], [longitude, latitude])) return features[i].properties.name;
  }
  return null;
}

// ~2.5 km then ~5 km rings of eight bearings: catches beach-front GPS the drawn coastline just misses.
const COAST_RINGS = [0.025, 0.05].map((r) =>
  [0, 45, 90, 135, 180, 225, 270, 315].map((deg) => [
    r * Math.cos((deg * Math.PI) / 180),
    r * Math.sin((deg * Math.PI) / 180),
  ]),
);

function shapeAt(shapes: Shapes, longitude: number, latitude: number): string | null {
  if (!Number.isFinite(longitude) || !Number.isFinite(latitude)) return null;
  const exact = containing(shapes, longitude, latitude);
  if (exact) return exact;
  for (const ring of COAST_RINGS) {
    // Majority of the ring, not first hit: where two shapes meet the coast, first hit is arbitrary.
    const votes = new Map<string, number>();
    for (const [dx, dy] of ring) {
      const near = containing(shapes, longitude + dx, latitude + dy);
      if (near) votes.set(near, (votes.get(near) ?? 0) + 1);
    }
    const best = [...votes.entries()].sort((a, b) => b[1] - a[1])[0];
    if (best) return best[0];
  }
  return null;
}

/** The state containing a GPS point, or null when it lies outside India's mapped states. */
export function stateAt(longitude: number, latitude: number): string | null {
  return shapeAt(load(), longitude, latitude);
}

/** The district of `state` containing a GPS point, or null when none does. */
export async function districtAt(state: string, longitude: number, latitude: number): Promise<string | null> {
  const shapes = await loadDistricts(state);
  return shapes ? shapeAt(shapes, longitude, latitude) : null;
}

const squash = (value: string) => value.toLowerCase().replace(/[^a-z]/g, "");

// Short forms and old names seen in, or likely in, free-typed profile text.
const STATE_ALIASES: Record<string, string> = {
  tn: "Tamil Nadu",
  tamilnadu: "Tamil Nadu",
  ka: "Karnataka",
  kl: "Kerala",
  mh: "Maharashtra",
  ap: "Andhra Pradesh",
  ts: "Telangana",
  tg: "Telangana",
  up: "Uttar Pradesh",
  mp: "Madhya Pradesh",
  wb: "West Bengal",
  dl: "Delhi",
  ncr: "Delhi",
  delhincr: "Delhi",
  newdelhi: "Delhi",
  nctofdelhi: "Delhi",
  orissa: "Odisha",
  pondicherry: "Puducherry",
  uttaranchal: "Uttarakhand",
  jk: "Jammu and Kashmir",
  jammukashmir: "Jammu and Kashmir",
  andamanandnicobar: "Andaman and Nicobar Islands",
  dadraandnagarhaveli: "Dadra and Nagar Haveli and Daman and Diu",
  damananddiu: "Dadra and Nagar Haveli and Daman and Diu",
};

const STATE_BY_SQUASHED = new Map<string, string>(INDIA_STATE_NAMES.map((name) => [squash(name), name]));

/** Maps free-typed state text to a canonical name, or null when unrecognised. */
export function normalizeState(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const key = squash(raw.replace(/&/g, "and"));
  if (!key) return null;
  return STATE_BY_SQUASHED.get(key) ?? STATE_ALIASES[key] ?? null;
}

const INDIA_SPELLINGS = new Set(["india", "inda", "indai", "in", "ind", "bharat", "republicofindia"]);

/** "india" for any spelling of India, "other" for another country, null when blank. */
export function classifyCountry(raw: string | null | undefined): "india" | "other" | null {
  const key = squash(raw ?? "");
  if (!key) return null;
  return INDIA_SPELLINGS.has(key) ? "india" : "other";
}

// Old names, short forms and reverse-geocoder wards folded into the city people would say.
const CITY_ALIASES: Record<string, string> = {
  cbe: "Coimbatore",
  kovai: "Coimbatore",
  madras: "Chennai",
  bangalore: "Bengaluru",
  bengalore: "Bengaluru",
  blr: "Bengaluru",
  bombay: "Mumbai",
  calcutta: "Kolkata",
  gurgaon: "Gurugram",
  cochin: "Kochi",
  ernakulam: "Kochi",
  trivandrum: "Thiruvananthapuram",
  poona: "Pune",
  newdelhi: "Delhi",
  trichy: "Tiruchirappalli",
  tiruchi: "Tiruchirappalli",
};

const PLACEHOLDER_CITIES = new Set(["unknown", "unknowncity", "na", "none", "null", "city"]);

/** Cleans free-typed or reverse-geocoded city text into a groupable name, or null. */
export function normalizeCity(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const stripped = raw
    .trim()
    .replace(/\s+/g, " ")
    // "Chennai Corporation", "Coimbatore North" and the like are wards of one city.
    .replace(/\s+(municipal\s+)?corporation$/i, "")
    .replace(/\s+(city|north|south|east|west|central)$/i, "")
    .trim();
  const key = squash(stripped);
  if (!key || PLACEHOLDER_CITIES.has(key)) return null;
  if (CITY_ALIASES[key]) return CITY_ALIASES[key];
  return stripped
    .toLowerCase()
    .replace(/(^|[\s-])\p{L}/gu, (match) => match.toUpperCase());
}
