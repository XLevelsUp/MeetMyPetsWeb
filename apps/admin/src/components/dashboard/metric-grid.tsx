"use client";

import {
  BadgeCheck,
  Flag,
  Heart,
  MessagesSquare,
  PawPrint,
  Users,
  type LucideIcon,
} from "lucide-react";

import { AcquisitionChart } from "@/components/dashboard/acquisition-chart";
import { ChartSkeleton, MetricGridSkeleton } from "@/components/dashboard/dashboard-skeleton";
import { MetricCard } from "@/components/dashboard/metric-card";
import { RangeFilter } from "@/components/dashboard/range-filter";
import { SpeciesBreakdown } from "@/components/dashboard/species-breakdown";
import { SwipeVolumeChart } from "@/components/dashboard/swipe-volume-chart";
import { QueryErrorCard } from "@/components/shared/query-error-card";
import { copy } from "@/config/admin";
import { useUrlSyncedQuery } from "@/hooks/use-url-query";
import { useAnalyticsSummary, useAnalyticsTimeseries } from "@/hooks/use-analytics";
import { bucketFor, comparisonLabel, resolveRange } from "@/lib/analytics-constants";
import {
  DEFAULT_ANALYTICS_RANGE_QUERY,
  type AnalyticsRangeQuery,
  type MetricKey,
} from "@/lib/api-contract";

const metricIcons: Record<MetricKey, LucideIcon> = {
  totalUsers: Users,
  activePets: PawPrint,
  totalMatches: Heart,
  activeChats: MessagesSquare,
  pendingVerifications: BadgeCheck,
  openReports: Flag,
};

export function MetricGrid({ initialRange }: { initialRange: AnalyticsRangeQuery }) {
  // Shared with /users — the range is part of the URL, so a view can be linked
  // and survives a reload. `active` is always true: unlike the users tabs there
  // is only one writer on this page.
  const [range, setRange] = useUrlSyncedQuery(initialRange, DEFAULT_ANALYTICS_RANGE_QUERY, {
    active: true,
  });

  const summary = useAnalyticsSummary(range);
  const timeseries = useAnalyticsTimeseries(range);

  const resolved = resolveRange(range.preset, range.from, range.to);
  const comparison = comparisonLabel(resolved);
  // The server may clamp `from` back to the first real row; trust its answer
  // over the requested range so the label matches what is actually drawn.
  const drawn = timeseries.data
    ? { from: timeseries.data.from, to: timeseries.data.to }
    : resolved;
  const bucket = timeseries.data?.bucket ?? bucketFor(drawn.from, drawn.to);
  const dataStartsAt = timeseries.data?.dataStartsAt ?? null;
  const isClamped = Boolean(dataStartsAt && timeseries.data && dataStartsAt >= drawn.from);

  return (
    <div className="flex flex-col gap-4">
      {/* One filter row, above everything it scopes. */}
      <RangeFilter range={range} onChange={(next) => setRange(() => next)} dataStartsAt={dataStartsAt} />

      {summary.isPending ? (
        <MetricGridSkeleton />
      ) : summary.isError ? (
        <QueryErrorCard message={summary.error.message} onRetry={() => summary.refetch()} />
      ) : (
        <>
          <div
            className={summary.isFetching ? "opacity-60 transition-opacity" : "transition-opacity"}
            aria-busy={summary.isFetching}
          >
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {(Object.keys(metricIcons) as MetricKey[]).map((key) => (
                <MetricCard
                  key={key}
                  label={copy.dashboard.metrics[key]}
                  metric={summary.data.metrics[key]}
                  icon={metricIcons[key]}
                  comparison={comparison}
                />
              ))}
            </div>
          </div>
          <SpeciesBreakdown data={summary.data.activePetsBySpecies} />
        </>
      )}

      {timeseries.isPending ? (
        <div className="grid grid-cols-1 gap-4 2xl:grid-cols-2">
          <ChartSkeleton />
          <ChartSkeleton />
        </div>
      ) : timeseries.isError ? (
        <QueryErrorCard message={timeseries.error.message} onRetry={() => timeseries.refetch()} />
      ) : (
        <>
          <div className="grid grid-cols-1 gap-4 2xl:grid-cols-2">
            <AcquisitionChart
              data={timeseries.data.userAcquisition}
              bucket={bucket}
              isFetching={timeseries.isFetching}
            />
            <SwipeVolumeChart
              data={timeseries.data.swipeVolume}
              bucket={bucket}
              isFetching={timeseries.isFetching}
            />
          </div>
          {/* Said out loud rather than silently drawing a shorter axis: a
              range that reaches past the first row is clamped, not empty. */}
          {isClamped && dataStartsAt ? (
            <p className="text-xs text-muted-foreground">
              {copy.dashboard.range.clamped.replace("{date}", dataStartsAt)}
            </p>
          ) : null}
        </>
      )}
    </div>
  );
}
