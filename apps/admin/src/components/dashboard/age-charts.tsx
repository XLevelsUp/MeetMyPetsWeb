"use client";

import { CategoryChart } from "@/components/dashboard/category-chart";
import { copy } from "@/config/admin";
import type { AnalyticsSummaryResponse } from "@/lib/api-contract";

const c = copy.dashboard.charts;

// Ordered data gets one hue, light (young) to dark (old); "Not given" is neutral grey so it never reads as an age.
// Indigo = people, the same meaning that hue carries on the Team messages screens.
const PEOPLE_RAMP = ["#c7d2fe", "#a5b4fc", "#818cf8", "#6366f1", "#4338ca", "#312e81"];
const UNKNOWN = "#94a3b8";

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
