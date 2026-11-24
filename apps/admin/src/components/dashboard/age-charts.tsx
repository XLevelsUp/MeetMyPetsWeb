"use client";

import { CategoryChart } from "@/components/dashboard/category-chart";
import { copy } from "@/config/admin";
import type { AnalyticsSummaryResponse } from "@/lib/api-contract";

const c = copy.dashboard.charts;

// Ordered data gets one hue, light (young) to dark (old); "Not given" is neutral grey so it never reads as an age.
// Sky = pets and indigo = people, the same meaning those hues carry on the Team messages screens.
const PET_RAMP = ["#bae6fd", "#7dd3fc", "#38bdf8", "#0284c7", "#075985"];
const PEOPLE_RAMP = ["#c7d2fe", "#a5b4fc", "#818cf8", "#6366f1", "#4338ca", "#312e81"];
const UNKNOWN = "#94a3b8";

export function PetAgeChart({ data }: { data: AnalyticsSummaryResponse["activePetsByAge"] }) {
  return (
    <CategoryChart
      chartId="pet-age"
      title={c.petAgeTitle}
      description={c.petAgeDescription}
      unit={c.unitPets}
      defaultType="bar"
      items={data.map((row, i) => ({
        label: c.petAges[row.key],
        count: row.count,
        color: row.key === "unknown" ? UNKNOWN : PET_RAMP[i % PET_RAMP.length],
      }))}
    />
  );
}

export function PeopleAgeChart({ data }: { data: AnalyticsSummaryResponse["accountsByAge"] }) {
  return (
    <CategoryChart
      chartId="people-age"
      title={c.peopleAgeTitle}
      description={c.peopleAgeDescription}
      unit={c.unitAccounts}
      defaultType="bar"
      items={data.map((row, i) => ({
        label: c.peopleAges[row.key],
        count: row.count,
        color: row.key === "unknown" ? UNKNOWN : PEOPLE_RAMP[i % PEOPLE_RAMP.length],
      }))}
    />
  );
}
