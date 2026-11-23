"use client";

import { Area, AreaChart, Bar, BarChart, CartesianGrid, Line, LineChart, XAxis, YAxis } from "recharts";

import { ChartFrame, tickFormatter, type ChartSeries } from "@/components/dashboard/chart-frame";
import { ChartTypePicker } from "@/components/dashboard/chart-type-picker";
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { TIME_CHART_TYPES, useChartType, type TimeChartType } from "@/hooks/use-chart-type";
import type { Bucket } from "@/lib/analytics-constants";

export type TimeseriesSeries = ChartSeries & { color: string };

/** One or more series over time, switchable between area, line and bar by the viewer. */
export function TimeseriesChart({
  chartId,
  title,
  description,
  bucket,
  series,
  stacked = false,
  defaultType,
  isFetching,
}: {
  /** Stable id the viewer's chosen type is remembered under. */
  chartId: string;
  title: string;
  description: string;
  bucket: Bucket;
  series: TimeseriesSeries[];
  /** Stack series so the height reads as their total (bar and area only). */
  stacked?: boolean;
  defaultType: TimeChartType;
  isFetching: boolean;
}) {
  const [type, setType] = useChartType(chartId, TIME_CHART_TYPES, defaultType);

  const config = Object.fromEntries(
    series.map((s) => [s.key, { label: s.label, color: s.color }]),
  ) satisfies ChartConfig;

  // Recharts wants one row per date carrying every series; merged on date, never zipped by index.
  const byDate = new Map<string, Record<string, number | string>>();
  for (const s of series) {
    for (const point of s.data) {
      const row = byDate.get(point.date) ?? { date: point.date };
      row[s.key] = point.value;
      byDate.set(point.date, row);
    }
  }
  const data = [...byDate.values()]
    .map((row) => ({ ...Object.fromEntries(series.map((s) => [s.key, 0])), ...row }))
    .sort((a, b) => String(a.date).localeCompare(String(b.date)));

  const stackId = stacked ? "stack" : undefined;
  const last = series.length - 1;
  const axes = (
    <>
      {/* Solid hairline grid: dashes read as "projection" when it is just a grid. */}
      <CartesianGrid vertical={false} />
      <XAxis dataKey="date" tickLine={false} axisLine={false} minTickGap={28} tickFormatter={tickFormatter(bucket)} />
      <YAxis tickLine={false} axisLine={false} allowDecimals={false} width={52} />
      <ChartTooltip content={<ChartTooltipContent />} />
      {/* Identity must never rest on colour alone, so 2+ series always get a legend. */}
      {series.length > 1 ? <ChartLegend content={<ChartLegendContent />} /> : null}
    </>
  );

  return (
    <ChartFrame
      title={title}
      description={description}
      bucket={bucket}
      series={series}
      isFetching={isFetching}
      actions={<ChartTypePicker value={type} options={TIME_CHART_TYPES} onChange={setType} chartName={title} />}
    >
      {/* h-56 covers the plot AND the x-axis band, so the card never gets its own scrollbar. */}
      <ChartContainer config={config} className="h-56 w-full">
        {type === "bar" ? (
          <BarChart data={data} margin={{ left: -20, right: 4 }}>
            {axes}
            {series.map((s, i) => (
              <Bar
                key={s.key}
                dataKey={s.key}
                stackId={stackId}
                fill={`var(--color-${s.key})`}
                // A surface-coloured ring separates stacked segments; only the top end is rounded.
                stroke={stacked ? "var(--card)" : undefined}
                strokeWidth={stacked ? 2 : 0}
                radius={!stacked || i === last ? [4, 4, 0, 0] : 0}
              />
            ))}
          </BarChart>
        ) : type === "line" ? (
          <LineChart data={data} margin={{ left: -20, right: 4 }}>
            {axes}
            {series.map((s) => (
              <Line
                key={s.key}
                dataKey={s.key}
                type="monotone"
                stroke={`var(--color-${s.key})`}
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4 }}
              />
            ))}
          </LineChart>
        ) : (
          <AreaChart data={data} margin={{ left: -20, right: 4 }}>
            {axes}
            {series.map((s) => (
              <Area
                key={s.key}
                dataKey={s.key}
                type="monotone"
                stackId={stackId}
                stroke={`var(--color-${s.key})`}
                fill={`var(--color-${s.key})`}
                fillOpacity={0.15}
                strokeWidth={2}
              />
            ))}
          </AreaChart>
        )}
      </ChartContainer>
    </ChartFrame>
  );
}
