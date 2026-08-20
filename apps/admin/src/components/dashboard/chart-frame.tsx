"use client";

import { useId, useState } from "react";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { copy } from "@/config/admin";
import type { Bucket } from "@/lib/analytics-constants";
import type { TimeseriesPoint } from "@/lib/api-contract";

/**
 * The card, description and table-view twin shared by both timeseries charts.
 *
 * TWO THINGS THIS EXISTS TO GUARANTEE
 *
 * 1. **Every chart has a table view.** A tooltip must enhance, never gate: a
 *    value that is only reachable by hovering is unreachable by keyboard-only
 *    and screen-reader users, and unreadable in print.
 * 2. **No skeleton flash on refetch.** Changing the range holds the previous
 *    render at reduced opacity instead of collapsing the card to a skeleton and
 *    bouncing the page height. The skeleton is for the first load only.
 */
export type ChartSeries = { key: string; label: string; data: TimeseriesPoint[] };

export function ChartFrame({
  title,
  description,
  bucket,
  series,
  isFetching,
  children,
}: {
  title: string;
  description: string;
  bucket: Bucket;
  /** One entry per plotted series — the table gets a column for each. */
  series: ChartSeries[];
  isFetching: boolean;
  children: React.ReactNode;
}) {
  const [showTable, setShowTable] = useState(false);
  const tableId = useId();

  // Merged on date rather than zipped by index: the series come from separate
  // jsonb aggregates, and lining them up by position would silently mis-pair
  // them if one ever came back short.
  const byDate = new Map<string, Record<string, number>>();
  for (const s of series) {
    for (const point of s.data) {
      const row = byDate.get(point.date) ?? {};
      row[s.key] = point.value;
      byDate.set(point.date, row);
    }
  }
  const rows = [...byDate.entries()].sort(([a], [b]) => a.localeCompare(b));

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{title}</CardTitle>
        <CardDescription>
          {description} · {copy.dashboard.charts.perBucket[bucket]}
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <div
          // Dimmed, not replaced — the frame stays put while new data arrives.
          className={isFetching ? "opacity-60 transition-opacity" : "transition-opacity"}
          aria-busy={isFetching}
        >
          {children}
        </div>

        <div>
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
                    <TableHead>{copy.dashboard.charts.tableDate}</TableHead>
                    {series.map((s) => (
                      <TableHead key={s.key} className="text-right">
                        {s.label}
                      </TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map(([date, values]) => (
                    <TableRow key={date}>
                      <TableCell>{date}</TableCell>
                      {series.map((s) => (
                        // tabular-nums HERE is right: these align vertically.
                        <TableCell key={s.key} className="text-right tabular-nums">
                          {(values[s.key] ?? 0).toLocaleString("en-IN")}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * Axis tick text for a bucket.
 *
 * Day buckets show MM-DD as before; week and month buckets need the month name,
 * because "08-03" as a *week* start is unreadable and "08-01" as a *month* is
 * ambiguous with a day.
 */
export function tickFormatter(bucket: Bucket) {
  return (value: string): string => {
    const date = new Date(`${value}T00:00:00Z`);
    if (bucket === "month") {
      return date.toLocaleDateString("en-IN", { month: "short", year: "2-digit", timeZone: "UTC" });
    }
    if (bucket === "week") {
      return date.toLocaleDateString("en-IN", { day: "numeric", month: "short", timeZone: "UTC" });
    }
    return value.slice(5);
  };
}
