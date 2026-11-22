"use client";

import { TimeseriesChart } from "@/components/dashboard/timeseries-chart";
import { copy } from "@/config/admin";
import type { Bucket } from "@/lib/analytics-constants";
import type { TimeseriesPoint } from "@/lib/api-contract";

export function SwipeVolumeChart({
  likes,
  passes,
  bucket,
  isFetching,
}: {
  likes: TimeseriesPoint[];
  passes: TimeseriesPoint[];
  bucket: Bucket;
  isFetching: boolean;
}) {
  return (
    <TimeseriesChart
      chartId="swipes"
      title={copy.dashboard.charts.swipeTitle}
      description={copy.dashboard.charts.swipeDescription}
      bucket={bucket}
      // Validated pair: #ff1744 vs #2563eb stay distinct under protanopia; identity, not status.
      series={[
        { key: "likes", label: copy.dashboard.charts.swipeLikes, color: "var(--chart-1)", data: likes },
        { key: "passes", label: copy.dashboard.charts.swipePasses, color: "var(--chart-2)", data: passes },
      ]}
      // Stacked so the bar height still reads as total swipes.
      stacked
      defaultType="bar"
      isFetching={isFetching}
    />
  );
}
