"use client";

import { useQuery } from "@tanstack/react-query";
import type { z } from "zod";

import {
  analyticsSummarySchema,
  analyticsTimeseriesSchema,
  apiErrorSchema,
} from "@/lib/api-contract";

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

export function useAnalyticsSummary() {
  return useQuery({
    queryKey: ["analytics", "summary"],
    queryFn: () => fetchJson("/api/v1/admin/analytics/summary", analyticsSummarySchema),
    staleTime: 30_000,
    refetchInterval: 60_000,
    refetchOnWindowFocus: true,
  });
}

export function useAnalyticsTimeseries(days = 30) {
  return useQuery({
    queryKey: ["analytics", "timeseries", days],
    queryFn: () =>
      fetchJson(`/api/v1/admin/analytics/timeseries?days=${days}`, analyticsTimeseriesSchema),
    staleTime: 30_000,
    refetchInterval: 60_000,
    refetchOnWindowFocus: true,
  });
}
