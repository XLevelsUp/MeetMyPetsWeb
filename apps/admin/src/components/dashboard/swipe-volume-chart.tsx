"use client";

import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";

import { ChartFrame, tickFormatter } from "@/components/dashboard/chart-frame";
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { copy } from "@/config/admin";
import type { Bucket } from "@/lib/analytics-constants";
import type { TimeseriesPoint } from "@/lib/api-contract";

/**
 * Swipes, split by direction and stacked so the bar height still reads as the
 * total it did before the split.
 *
 * Colours are the first two categorical slots, VALIDATED rather than eyeballed:
 * #c2531f ↔ #2563eb separate at ΔE 30.4 under protanopia in light mode, well
 * clear of the ΔE 8 threshold. They carry identity (which direction), not
 * status — a pass is not a failure, so the good/bad tokens would be wrong here.
 */
const config = {
  likes: { label: copy.dashboard.charts.swipeLikes, color: "var(--chart-1)" },
  passes: { label: copy.dashboard.charts.swipePasses, color: "var(--chart-2)" },
} satisfies ChartConfig;

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
  // Recharts needs one row per x-value carrying both series. Merged on date,
  // not zipped by index: these arrive as two separate jsonb aggregates.
  const byDate = new Map<string, { date: string; likes: number; passes: number }>();
  for (const point of likes) {
    byDate.set(point.date, { date: point.date, likes: point.value, passes: 0 });
  }
  for (const point of passes) {
    const row = byDate.get(point.date) ?? { date: point.date, likes: 0, passes: 0 };
    row.passes = point.value;
    byDate.set(point.date, row);
  }
  const data = [...byDate.values()].sort((a, b) => a.date.localeCompare(b.date));

  return (
    <ChartFrame
      title={copy.dashboard.charts.swipeTitle}
      description={copy.dashboard.charts.swipeDescription}
      bucket={bucket}
      series={[
        { key: "likes", label: copy.dashboard.charts.swipeLikes, data: likes },
        { key: "passes", label: copy.dashboard.charts.swipePasses, data: passes },
      ]}
      isFetching={isFetching}
    >
      <ChartContainer config={config} className="h-56 w-full">
        <BarChart data={data} margin={{ left: -20, right: 4 }}>
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
          {/* Two series, so a legend is not optional: identity must never rest
              on colour alone. */}
          <ChartLegend content={<ChartLegendContent />} />
          {/*
            Stacked, bottom segment first. `stroke`/`strokeWidth` paint a 2px
            ring in the SURFACE colour between segments — a gap, not a border
            drawn around the marks. Only the top segment is rounded, because the
            radius belongs to the data-end of the stack, not to each slice.
          */}
          <Bar
            dataKey="likes"
            stackId="swipes"
            fill="var(--color-likes)"
            stroke="var(--card)"
            strokeWidth={2}
          />
          <Bar
            dataKey="passes"
            stackId="swipes"
            fill="var(--color-passes)"
            stroke="var(--card)"
            strokeWidth={2}
            radius={[4, 4, 0, 0]}
          />
        </BarChart>
      </ChartContainer>
    </ChartFrame>
  );
}
