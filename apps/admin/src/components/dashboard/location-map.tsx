"use client";

import { useQuery } from "@tanstack/react-query";
import { useEffect, useMemo } from "react";

import ChoroplethMap from "@/components/dashboard/choropleth-map";
import { Skeleton } from "@/components/ui/skeleton";
import { copy } from "@/config/admin";
import type { LocationBreakdown } from "@/lib/api-contract";
import { indiaStateFeatures, stateDistrictFeatures } from "@/lib/geo/india";

const t = copy.dashboard.location;

export type LocationMapProps = {
  view: "india" | "state";
  state: string;
  byState: LocationBreakdown["byState"];
  byDistrict: LocationBreakdown["byDistrict"];
  onSelectState: (state: string) => void;
  onError: () => void;
};

// Reports from an effect: telling the parent during render would update it mid-render.
function ReportError({ onError }: { onError: () => void }) {
  useEffect(() => onError(), [onError]);
  return null;
}

/** Lazily loaded with the map libraries: India by state, or one state by district. */
export default function LocationMap({ view, state, byState, byDistrict, onSelectState, onError }: LocationMapProps) {
  const indiaFeatures = useMemo(() => indiaStateFeatures(), []);
  const stateCounts = useMemo(() => new Map(byState.map((r) => [r.state, r.count])), [byState]);
  const districtCounts = useMemo(
    () => new Map(byDistrict.filter((r) => r.state === state).map((r) => [r.district, r.count])),
    [byDistrict, state],
  );

  // Outlines never change at runtime, so one fetch per state for the life of the tab.
  const districts = useQuery({
    queryKey: ["geo", "districts", state],
    queryFn: () => stateDistrictFeatures(state),
    enabled: view === "state",
    staleTime: Infinity,
    gcTime: Infinity,
  });

  if (view === "india") {
    return (
      <ChoroplethMap
        features={indiaFeatures}
        counts={stateCounts}
        label={t.mapLabel}
        onSelect={onSelectState}
        onError={onError}
      />
    );
  }

  if (districts.isError) return <ReportError onError={onError} />;

  if (!districts.data) {
    return <Skeleton className="size-full" aria-label={t.districtsLoading} />;
  }

  return (
    <ChoroplethMap
      features={districts.data}
      counts={districtCounts}
      label={t.stateMapLabel.replace("{state}", state)}
      onError={onError}
    />
  );
}
