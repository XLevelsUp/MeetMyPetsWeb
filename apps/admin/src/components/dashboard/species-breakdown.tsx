"use client";

import { CategoryChart } from "@/components/dashboard/category-chart";
import { copy } from "@/config/admin";
import type { Operations, SpeciesCount } from "@/lib/api-contract";

const c = copy.dashboard.charts;

// Horizontal by default: at up to ten species, labelled bars read faster than a pie at desk density.
export function SpeciesBreakdown({ data }: { data: SpeciesCount[] }) {
  return (
    <CategoryChart
      chartId="species"
      title={c.speciesTitle}
      description={c.speciesDescription}
      unit={c.unitPets}
      defaultType="horizontal"
      items={data.map((row) => ({ label: row.species, count: row.count }))}
    />
  );
}

// People, not pets: one owner may hold up to 20, so this splits ACCOUNTS by whether they added one.
export function PetOwnershipChart({ ops }: { ops: Operations }) {
  const withPet = Math.min(ops.accountsWithPet, ops.totalAccounts);
  return (
    <CategoryChart
      chartId="pet-ownership"
      title={c.petsTitle}
      description={c.petsDescription}
      unit={c.unitAccounts}
      defaultType="donut"
      items={[
        { label: c.withPet, count: withPet, color: "var(--chart-3)" },
        { label: c.withoutPet, count: Math.max(0, ops.totalAccounts - withPet), color: "var(--chart-4)" },
      ]}
    />
  );
}

export function DeviceChart({ ops }: { ops: Operations }) {
  return (
    <CategoryChart
      chartId="devices"
      title={c.devicesTitle}
      description={c.devicesDescription}
      unit={c.unitPhones}
      defaultType="bar"
      items={[
        { label: copy.dashboard.operations.android, count: ops.devicesAndroid, color: "var(--chart-2)" },
        { label: copy.dashboard.operations.iphone, count: ops.devicesIos, color: "var(--chart-1)" },
      ]}
    />
  );
}
