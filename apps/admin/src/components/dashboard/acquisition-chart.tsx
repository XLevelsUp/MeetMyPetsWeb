"use client";

import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from "recharts";

import { ChartFrame, tickFormatter } from "@/components/dashboard/chart-frame";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { copy } from "@/config/admin";
import type { Bucket } from "@/lib/analytics-constants";
import type { TimeseriesPoint } from "@/lib/api-contract";

// Single series, so no legend: the card title names it. `--chart-1` is the
// first categorical slot; see globals.css.
const config = {
  value: { label: "Sign-ups", color: "var(--chart-1)" },
} satisfies ChartConfig;

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
    <ChartFrame
      title={copy.dashboard.charts.acquisitionTitle}
      description={copy.dashboard.charts.acquisitionDescription}
      bucket={bucket}
      data={data}
      isFetching={isFetching}
    >
      {/* h-56 covers the plot AND the x-axis band — sizing to the plot alone
          gives the card its own tiny nested scrollbar. */}
      <ChartContainer config={config} className="h-56 w-full">
        <AreaChart data={data} margin={{ left: -20, right: 4 }}>
          {/* Solid hairline grid: dashes read as "projection" when it is just a grid. */}
          <CartesianGrid vertical={false} />
          <XAxis
            dataKey="date"
            tickLine={false}
            axisLine={false}
            minTickGap={28}
            tickFormatter={tickFormatter(bucket)}
          />
          <YAxis tickLine={false} axisLine={false} allowDecimals={false} width={52} />
          <ChartTooltip content={<ChartTooltipContent />} />
          <Area
            dataKey="value"
            type="monotone"
            stroke="var(--color-value)"
            fill="var(--color-value)"
            fillOpacity={0.15}
            strokeWidth={2}
          />
        </AreaChart>
      </ChartContainer>
    </ChartFrame>
  );
}
