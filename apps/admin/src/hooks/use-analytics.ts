"use client";

import { keepPreviousData, useQuery } from "@tanstack/react-query";
import type { z } from "zod";

import {
  analyticsSummarySchema,
  analyticsTimeseriesSchema,
  apiErrorSchema,
  type AnalyticsRangeQuery,
} from "@/lib/api-contract";
import { queryToSearchParams } from "@/lib/contract-shared";

/**
 * React Query hooks for the analytics endpoints. Responses are zod-parsed
 * against the shared contract — a drifting backend fails loudly here, not
 * as NaN cards.
 */

async function fetchJson<S extends z.ZodType>(url: string, schema: S): Promise<z.infer<S>> {
  const res = await fetch(url);

  if (!res.ok) {
    const parsed = apiErrorSchema.safeParse(await res.json().catch(() => null));
    throw new Error(parsed.success ? parsed.data.message : `Request failed (${res.status}).`);
  }

  return schema.parse(await res.json());
}

/**
 * `keepPreviousData` on both: changing the range must hold the previous render
 * rather than flashing a skeleton and collapsing the page height. The charts
 * dim while `isFetching` instead — see `metric-grid.tsx`.
 */
export function useAnalyticsSummary(range: AnalyticsRangeQuery) {
  const search = queryToSearchParams(range).toString();
  return useQuery({
    queryKey: ["analytics", "summary", range],
    queryFn: () => fetchJson(`/api/v1/admin/analytics/summary?${search}`, analyticsSummarySchema),
    placeholderData: keepPreviousData,
    staleTime: 30_000,
    refetchInterval: 60_000,
    refetchOnWindowFocus: true,
  });
}

export function useAnalyticsTimeseries(range: AnalyticsRangeQuery) {
  const search = queryToSearchParams(range).toString();
  return useQuery({
    queryKey: ["analytics", "timeseries", range],
    queryFn: () =>
      fetchJson(`/api/v1/admin/analytics/timeseries?${search}`, analyticsTimeseriesSchema),
    placeholderData: keepPreviousData,
    staleTime: 30_000,
    refetchInterval: 60_000,
    refetchOnWindowFocus: true,
  });
}
