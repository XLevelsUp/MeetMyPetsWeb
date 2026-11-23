"use client";

import { TimeseriesChart } from "@/components/dashboard/timeseries-chart";
import { copy } from "@/config/admin";
import type { Bucket } from "@/lib/analytics-constants";
import type { TimeseriesPoint } from "@/lib/api-contract";

export function AcquisitionChart({
  data,
  bucket,
  isFetching,
}: {
  data: TimeseriesPoint[];
  bucket: Bucket;
  isFetching: boolean;
}) {
  return (
    <TimeseriesChart
      chartId="signups"
      title={copy.dashboard.charts.acquisitionTitle}
      description={copy.dashboard.charts.acquisitionDescription}
      bucket={bucket}
      // Single series, so no legend: the card title names it.
      series={[{ key: "value", label: "Sign-ups", color: "var(--chart-1)", data }]}
      defaultType="area"
      isFetching={isFetching}
    />
  );
}
