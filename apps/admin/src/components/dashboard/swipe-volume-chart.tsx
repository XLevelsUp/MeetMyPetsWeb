"use client";

import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";

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

const config = {
  value: { label: "Swipes", color: "var(--chart-2)" },
} satisfies ChartConfig;

export function SwipeVolumeChart({
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
      title={copy.dashboard.charts.swipeTitle}
      description={copy.dashboard.charts.swipeDescription}
      bucket={bucket}
      data={data}
      isFetching={isFetching}
    >
      <ChartContainer config={config} className="h-56 w-full">
        <BarChart data={data} margin={{ left: -20, right: 4 }}>
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
          {/* 4px rounded data-end, anchored to the baseline. */}
          <Bar dataKey="value" fill="var(--color-value)" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ChartContainer>
    </ChartFrame>
  );
}
