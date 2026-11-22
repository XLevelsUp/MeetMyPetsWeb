import { describe, expect, it } from "vitest";

import { locationBreakdownSchema } from "@/lib/api-contract";
import {
  classifyCountry,
  districtAt,
  INDIA_STATE_NAMES,
  indiaStateFeatures,
  normalizeCity,
  normalizeState,
  stateAt,
  stateDistrictFeatures,
} from "@/lib/geo/india";
import {
  buildLocationBreakdown,
  TOP_CITY_LIMIT,
  type LocationProfileRow,
} from "@/lib/geo/location-breakdown";

const NOW = new Date("2026-11-21T00:00:00Z");

function profile(account_id: string, over: Partial<LocationProfileRow> = {}): LocationProfileRow {
  return { account_id, country: null, state: null, city: null, latitude: null, longitude: null, ...over };
}

describe("india map data", () => {
  it("has all 28 states and 8 union territories", () => {
    expect(INDIA_STATE_NAMES).toHaveLength(36);
    expect([...INDIA_STATE_NAMES].sort()).toEqual(indiaStateFeatures().map((f) => f.properties.name).sort());
    expect(INDIA_STATE_NAMES).toContain("Ladakh");
    expect(INDIA_STATE_NAMES).toContain("Dadra and Nagar Haveli and Daman and Diu");
  });

  it.each([
    ["Coimbatore", 76.9558, 11.0168, "Tamil Nadu"],
    ["Chennai", 80.2707, 13.0827, "Tamil Nadu"],
    ["Bengaluru", 77.5946, 12.9716, "Karnataka"],
    ["Pune", 73.8567, 18.5204, "Maharashtra"],
    ["Kochi", 76.2673, 9.9312, "Kerala"],
    ["Delhi", 77.209, 28.6139, "Delhi"],
    // Enclaves: any simplification of the map file folds these into the state around them.
    ["Puducherry", 79.8083, 11.9416, "Puducherry"],
    ["Karaikal", 79.838, 10.9254, "Puducherry"],
    ["Chandigarh", 76.7794, 30.7333, "Chandigarh"],
    // Beach-front GPS just past the drawn coastline; the coastal search lands it.
    ["Marina Beach", 80.2838, 13.05, "Tamil Nadu"],
    ["Kovalam", 76.9784, 8.4004, "Kerala"],
  ])("places %s by GPS", (_city, lng, lat, state) => {
    expect(stateAt(lng, lat)).toBe(state);
  });

  it("places nothing in the sea or abroad", () => {
    expect(stateAt(88, 5)).toBeNull();
    expect(stateAt(-0.1276, 51.5072)).toBeNull();
    expect(stateAt(Number.NaN, 10)).toBeNull();
  });
});

describe("district lookup", () => {
  it.each([
    ["Tamil Nadu", "Coimbatore", 76.9558, 11.0168, "Coimbatore"],
    ["Tamil Nadu", "Perur", 76.9346, 10.9757, "Coimbatore"],
    ["Tamil Nadu", "Avanashi", 77.2685, 11.1925, "Tiruppur"],
    ["Tamil Nadu", "Chennai", 80.2707, 13.0827, "Chennai"],
    ["Karnataka", "Bengaluru", 77.5946, 12.9716, "Bengaluru Urban"],
    ["Maharashtra", "Pune", 73.8567, 18.5204, "Pune"],
  ])("%s: %s lies in %s district", async (state, _place, lng, lat, district) => {
    expect(await districtAt(state, lng, lat)).toBe(district);
  });

  it("has district outlines for every state, and none for an unknown one", async () => {
    for (const state of INDIA_STATE_NAMES) expect((await stateDistrictFeatures(state)).length).toBeGreaterThan(0);
    expect(await stateDistrictFeatures("Narnia")).toEqual([]);
    expect(await districtAt("Narnia", 77, 11)).toBeNull();
  });
});

describe("text normalisation", () => {
  it.each([
    ["Tamil Nadu", "Tamil Nadu"],
    ["tamil nadu ", "Tamil Nadu"],
    ["TN", "Tamil Nadu"],
    ["NCR", "Delhi"],
    ["Orissa", "Odisha"],
    ["Jammu & Kashmir", "Jammu and Kashmir"],
    ["Narnia", null],
    ["", null],
  ])("state %j -> %j", (raw, expected) => {
    expect(normalizeState(raw)).toBe(expected);
  });

  it.each([
    ["India", "india"],
    ["INDA", "india"],
    ["IN", "india"],
    ["Sri Lanka", "other"],
    ["  ", null],
  ] as const)("country %j -> %j", (raw, expected) => {
    expect(classifyCountry(raw)).toBe(expected);
  });

  it.each([
    ["Coimbatore North", "Coimbatore"],
    ["Coimbatore South", "Coimbatore"],
    ["CBE", "Coimbatore"],
    ["Chennai Corporation", "Chennai"],
    ["bangalore", "Bengaluru"],
    ["Unknown City", null],
    ["perur", "Perur"],
    ["  ", null],
  ])("city %j -> %j", (raw, expected) => {
    expect(normalizeCity(raw)).toBe(expected);
  });
});

describe("buildLocationBreakdown", () => {
  it("puts every live account in exactly one bucket, preferring GPS over text", async () => {
    const accounts = ["a", "b", "c", "d", "e", "f", "g"].map((id) => ({ id, deleted_at: null }));
    const result = await buildLocationBreakdown(
      [...accounts, { id: "gone", deleted_at: "2026-10-01T00:00:00Z" }],
      [
        // GPS in Coimbatore beats a typed state that says Karnataka.
        profile("a", { latitude: 11.0168, longitude: 76.9558, state: "Karnataka", city: "Coimbatore North" }),
        profile("b", { state: "TN", city: "CBE" }),
        profile("c", { country: "Sri Lanka", city: "Colombo" }),
        profile("d", { latitude: 51.5072, longitude: -0.1276 }),
        profile("e", { country: "India" }),
        // 0,0 is a permission-denied default, so the typed state wins.
        profile("f", { latitude: 0, longitude: 0, state: "Kerala" }),
        profile("gone", { state: "Kerala" }),
      ],
      NOW,
    );

    expect(locationBreakdownSchema.parse(result)).toEqual(result);
    expect(result.totalAccounts).toBe(7);
    expect(result.located + result.outsideIndia + result.unknown).toBe(result.totalAccounts);
    expect(result).toMatchObject({ located: 3, outsideIndia: 2, unknown: 2, fromCoordinates: 1, fromText: 2 });
    expect(result.byState).toEqual([
      { state: "Tamil Nadu", count: 2 },
      { state: "Kerala", count: 1 },
    ]);
    // Only the GPS-placed account gets a district; the typed "TN" one stays state-level.
    expect(result.byDistrict).toEqual([{ state: "Tamil Nadu", district: "Coimbatore", count: 1 }]);
    // Colombo is abroad, so it is not listed as a city on an India card.
    expect(result.byCity).toEqual([{ city: "Coimbatore", state: "Tamil Nadu", count: 2 }]);
  });

  it("keeps same-named cities in different states apart and caps the list", async () => {
    const ids = Array.from({ length: 14 }, (_, i) => `id${i}`);
    const profiles = ids.map((id, i) =>
      profile(id, { state: i === 0 ? "Telangana" : "Tamil Nadu", city: i < 2 ? "Aurangabad" : `Town ${i}` }),
    );
    const result = await buildLocationBreakdown(ids.map((id) => ({ id, deleted_at: null })), profiles, NOW);

    expect(result.byCity).toHaveLength(TOP_CITY_LIMIT);
    const aurangabads = result.byCity.filter((c) => c.city === "Aurangabad");
    expect(aurangabads.map((c) => c.state).sort()).toEqual(["Tamil Nadu", "Telangana"]);
  });

  it("returns an empty but valid breakdown with no data", async () => {
    const result = await buildLocationBreakdown([], [], NOW);
    expect(locationBreakdownSchema.parse(result)).toEqual(result);
    expect(result).toMatchObject({ totalAccounts: 0, located: 0, byState: [], byDistrict: [], byCity: [] });
  });
});
