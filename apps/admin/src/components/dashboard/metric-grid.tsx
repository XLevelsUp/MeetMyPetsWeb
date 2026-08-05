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
import { SpeciesBreakdown } from "@/components/dashboard/species-breakdown";
import { SwipeVolumeChart } from "@/components/dashboard/swipe-volume-chart";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { copy } from "@/config/admin";
import { useAnalyticsSummary, useAnalyticsTimeseries } from "@/hooks/use-analytics";
import type { MetricKey } from "@/lib/api-contract";

const metricIcons: Record<MetricKey, LucideIcon> = {
  totalUsers: Users,
  activePets: PawPrint,
  totalMatches: Heart,
  activeChats: MessagesSquare,
  pendingVerifications: BadgeCheck,
  openReports: Flag,
};

/** Soft failure state — query-level errors render inline with a retry. */
function QueryError({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <Card>
      <CardContent className="flex flex-col items-start gap-3 pt-6">
        <p className="text-sm text-destructive">{message}</p>
        <Button variant="outline" size="sm" onClick={onRetry}>
          Retry
        </Button>
      </CardContent>
    </Card>
  );
}

export function MetricGrid() {
  const summary = useAnalyticsSummary();
  const timeseries = useAnalyticsTimeseries(30);

  return (
    <div className="flex flex-col gap-4">
      {/* Headline metrics */}
      {summary.isPending ? (
        <MetricGridSkeleton />
      ) : summary.isError ? (
        <QueryError message={summary.error.message} onRetry={() => summary.refetch()} />
      ) : (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {(Object.keys(metricIcons) as MetricKey[]).map((key) => (
              <MetricCard
                key={key}
                label={copy.dashboard.metrics[key]}
                metric={summary.data.metrics[key]}
                icon={metricIcons[key]}
              />
            ))}
          </div>
          <SpeciesBreakdown data={summary.data.activePetsBySpecies} />
        </>
      )}

      {/* 30-day charts */}
      {timeseries.isPending ? (
        <div className="grid grid-cols-1 gap-4 2xl:grid-cols-2">
          <ChartSkeleton />
          <ChartSkeleton />
        </div>
      ) : timeseries.isError ? (
        <QueryError message={timeseries.error.message} onRetry={() => timeseries.refetch()} />
      ) : (
        <div className="grid grid-cols-1 gap-4 2xl:grid-cols-2">
          <AcquisitionChart data={timeseries.data.userAcquisition} />
          <SwipeVolumeChart data={timeseries.data.swipeVolume} />
        </div>
      )}
    </div>
  );
}
