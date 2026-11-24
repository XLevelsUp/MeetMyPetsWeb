"use client";

import { useId, useState } from "react";
import { Bar, BarChart, CartesianGrid, Cell, Label, LabelList, Pie, PieChart, XAxis, YAxis } from "recharts";

import { ChartTypePicker } from "@/components/dashboard/chart-type-picker";
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { copy } from "@/config/admin";
import { CATEGORY_CHART_TYPES, useChartType, type CategoryChartType } from "@/hooks/use-chart-type";

const PALETTE = ["var(--chart-1)", "var(--chart-2)", "var(--chart-3)", "var(--chart-4)", "var(--chart-5)"];

export type CategoryItem = { label: string; count: number; color?: string };

const fmt = (n: number) => n.toLocaleString("en-IN");
const pct = (n: number, of: number) => (of === 0 ? 0 : Math.round((n / of) * 100));
// CSS custom-property names cannot hold spaces, so "Small Pet" becomes "small-pet".
const cssKey = (label: string, i: number) => `c${i}-${label.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;

// ~px per character at the 12px axis font; deliberately generous so a wrap happens before an overlap does.
const CHAR_PX = 6.6;
const MAX_LINES = 2;

// Greedy word-wrap into at most two lines; the last line ends in "…" if the label still doesn't fit.
export function wrapLabel(label: string, maxChars: number): string[] {
  const limit = Math.max(3, maxChars);
  const lines: string[] = [];
  let current = "";
  for (const word of label.split(/\s+/).filter(Boolean)) {
    const next = current ? `${current} ${word}` : word;
    if (next.length <= limit) {
      current = next;
      continue;
    }
    if (current) lines.push(current);
    current = word;
    if (lines.length === MAX_LINES) break;
  }
  if (current && lines.length < MAX_LINES) lines.push(current);
  const usedWords = lines.join(" ").split(/\s+/).length;
  const truncated = usedWords < label.split(/\s+/).filter(Boolean).length || lines.some((l) => l.length > limit);
  return lines.map((line, i) => {
    const isLast = i === lines.length - 1;
    if (line.length > limit) return `${line.slice(0, limit - 1)}…`;
    if (isLast && truncated) return line.length + 1 > limit ? `${line.slice(0, limit - 1)}…` : `${line}…`;
    return line;
  });
}

type TickProps = {
  x?: number;
  y?: number;
  payload?: { value?: unknown };
  width?: number;
  visibleTicksCount?: number;
};

// Every label is shown (interval 0), so each one must fit its own slot instead of spilling into the next.
function WrappedTick({ x = 0, y = 0, payload, width = 0, visibleTicksCount = 1 }: TickProps) {
  const label = String(payload?.value ?? "");
  const slot = width / Math.max(1, visibleTicksCount);
  const lines = wrapLabel(label, Math.floor((slot - 6) / CHAR_PX));
  return (
    <g transform={`translate(${x},${y})`}>
      <title>{label}</title>
      <text textAnchor="middle" className="fill-muted-foreground text-xs">
        {lines.map((line, i) => (
          <tspan key={i} x={0} dy={i === 0 ? "0.9em" : "1.15em"}>
            {line}
          </tspan>
        ))}
      </text>
    </g>
  );
}

/** Parts of a whole (devices, pet owners, species), switchable between bar, horizontal bar and donut. */
export function CategoryChart({
  chartId,
  title,
  description,
  items,
  unit,
  defaultType,
  isFetching = false,
}: {
  /** Stable id the viewer's chosen type is remembered under. */
  chartId: string;
  title: string;
  description?: string;
  items: CategoryItem[];
  /** What a count counts, e.g. "accounts"; shown in tooltips. */
  unit: string;
  defaultType: CategoryChartType;
  isFetching?: boolean;
}) {
  const [type, setType] = useChartType(chartId, CATEGORY_CHART_TYPES, defaultType);
  const [showTable, setShowTable] = useState(false);
  const tableId = useId();

  const total = items.reduce((sum, item) => sum + item.count, 0);
  const rows = items.map((item, i) => ({
    key: cssKey(item.label, i),
    label: item.label,
    count: item.count,
    share: pct(item.count, total),
    fill: `var(--color-${cssKey(item.label, i)})`,
    color: item.color ?? PALETTE[i % PALETTE.length],
  }));

  const config: ChartConfig = {
    count: { label: unit },
    ...Object.fromEntries(rows.map((r) => [r.key, { label: r.label, color: r.color }])),
  };

  const barLabel = (value: unknown) => `${fmt(Number(value))} (${pct(Number(value), total)}%)`;
  const horizontalHeight = Math.max(140, rows.length * 36 + 16);

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle className="text-base">{title}</CardTitle>
        {description ? <CardDescription>{description}</CardDescription> : null}
        <CardAction>
          <ChartTypePicker value={type} options={CATEGORY_CHART_TYPES} onChange={setType} chartName={title} />
        </CardAction>
      </CardHeader>
      <CardContent className="flex flex-1 flex-col gap-3">
        {total === 0 ? (
          <p className="text-sm text-muted-foreground">{copy.dashboard.noData}</p>
        ) : (
          <div
            // Dimmed, not replaced, while a refetch is in flight.
            className={isFetching ? "opacity-60 transition-opacity" : "transition-opacity"}
            aria-busy={isFetching}
          >
            {type === "donut" ? (
              <div className="flex flex-col gap-3">
                <ChartContainer config={config} className="mx-auto aspect-square h-52">
                  <PieChart>
                    <ChartTooltip content={<ChartTooltipContent nameKey="key" hideLabel />} />
                    <Pie
                      data={rows}
                      dataKey="count"
                      nameKey="key"
                      innerRadius="58%"
                      outerRadius="90%"
                      paddingAngle={rows.length > 1 ? 2 : 0}
                      stroke="var(--card)"
                      strokeWidth={2}
                    >
                      {rows.map((r) => (
                        <Cell key={r.key} fill={r.fill} />
                      ))}
                      <Label
                        position="center"
                        content={({ viewBox }) => {
                          const { cx, cy } = (viewBox ?? {}) as { cx?: number; cy?: number };
                          if (cx === undefined || cy === undefined) return null;
                          return (
                            <text x={cx} y={cy} textAnchor="middle" dominantBaseline="middle">
                              <tspan x={cx} dy="-0.2em" className="fill-foreground font-heading text-2xl font-semibold">
                                {fmt(total)}
                              </tspan>
                              <tspan x={cx} dy="1.5em" className="fill-muted-foreground text-xs">
                                {unit}
                              </tspan>
                            </text>
                          );
                        }}
                      />
                    </Pie>
                  </PieChart>
                </ChartContainer>
                {/* A donut has no axis, so the legend carries the names and numbers. */}
                <ul className="flex flex-col gap-1.5 text-sm">
                  {rows.map((r) => (
                    <li key={r.key} className="flex items-center justify-between gap-2">
                      <span className="flex min-w-0 items-center gap-2">
                        <span className="size-2.5 shrink-0 rounded-sm" style={{ background: r.color }} aria-hidden />
                        <span className="truncate">{r.label}</span>
                      </span>
                      <span className="shrink-0 tabular-nums text-muted-foreground">
                        {fmt(r.count)} <span className="text-xs">({r.share}%)</span>
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            ) : type === "horizontal" ? (
              <ChartContainer config={config} className="w-full" style={{ height: horizontalHeight }}>
                <BarChart data={rows} layout="vertical" margin={{ left: 0, right: 72, top: 4, bottom: 4 }}>
                  <XAxis type="number" hide allowDecimals={false} />
                  <YAxis type="category" dataKey="label" tickLine={false} axisLine={false} width={96} />
                  <ChartTooltip cursor={false} content={<ChartTooltipContent />} />
                  <Bar dataKey="count" radius={4} barSize={20}>
                    {rows.map((r) => (
                      <Cell key={r.key} fill={r.fill} />
                    ))}
                    <LabelList
                      dataKey="count"
                      position="right"
                      className="fill-muted-foreground text-xs tabular-nums"
                      formatter={barLabel}
                    />
                  </Bar>
                </BarChart>
              </ChartContainer>
            ) : (
              <ChartContainer config={config} className="h-56 w-full">
                <BarChart data={rows} margin={{ left: -20, right: 4, top: 20 }}>
                  <CartesianGrid vertical={false} />
                  <XAxis dataKey="label" tickLine={false} axisLine={false} interval={0} height={40} tick={<WrappedTick />} />
                  <YAxis tickLine={false} axisLine={false} allowDecimals={false} width={52} />
                  <ChartTooltip cursor={false} content={<ChartTooltipContent />} />
                  <Bar dataKey="count" radius={[4, 4, 0, 0]} maxBarSize={64}>
                    {rows.map((r) => (
                      <Cell key={r.key} fill={r.fill} />
                    ))}
                    <LabelList
                      dataKey="count"
                      position="top"
                      className="fill-muted-foreground text-xs tabular-nums"
                      formatter={barLabel}
                    />
                  </Bar>
                </BarChart>
              </ChartContainer>
            )}
          </div>
        )}

        {total > 0 ? (
          <div className="mt-auto">
            <button
              type="button"
              onClick={() => setShowTable((v) => !v)}
              aria-expanded={showTable}
              aria-controls={tableId}
              className="rounded-md text-xs text-muted-foreground underline-offset-4 hover:text-foreground hover:underline focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
            >
              {showTable ? copy.dashboard.charts.hideData : copy.dashboard.charts.showData}
            </button>
            {showTable ? (
              <div id={tableId} className="mt-2 max-h-64 overflow-y-auto rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{title}</TableHead>
                      <TableHead className="text-right capitalize">{unit}</TableHead>
                      <TableHead className="text-right">{copy.dashboard.location.tableShare}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rows.map((r) => (
                      <TableRow key={r.key}>
                        <TableCell>{r.label}</TableCell>
                        <TableCell className="text-right tabular-nums">{fmt(r.count)}</TableCell>
                        <TableCell className="text-right tabular-nums">{r.share}%</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : null}
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
