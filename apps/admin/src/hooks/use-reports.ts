"use client";

import { keepPreviousData, useMutation, useQueryClient, useQuery } from "@tanstack/react-query";

import { apiErrorSchema } from "@/lib/api-contract";
import { queryToSearchParams } from "@/lib/contract-shared";
import type { ReportResolution } from "@/lib/report-constants";
import {
  reportActionResponseSchema,
  reportsResponseSchema,
  type ReportsQuery,
} from "@/lib/reports-contract";

/** React Query hook for the report queue. Responses are zod-parsed. */
export function useReports(query: ReportsQuery) {
  return useQuery({
    queryKey: ["reports", query],
    queryFn: async () => {
      // Derived from the query object rather than hand-listed, so a new sort
      // or filter cannot be left out of the request.
      const params = queryToSearchParams(query);

      const res = await fetch(`/api/v1/admin/reports?${params.toString()}`);
      if (!res.ok) {
        const parsed = apiErrorSchema.safeParse(await res.json().catch(() => null));
        throw new Error(parsed.success ? parsed.data.message : `Request failed (${res.status}).`);
      }
      return reportsResponseSchema.parse(await res.json());
    },
    placeholderData: keepPreviousData,
    staleTime: 15_000,
  });
}

/**
 * Resolve a report. Invalidates the queue and the dashboard metrics — the
 * "Open Reports" card counts pending rows, so resolving one makes it stale.
 */
export function useResolveReport() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: { id: string; resolution: ReportResolution; reason: string }) => {
      const res = await fetch(`/api/v1/admin/reports/${input.id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resolution: input.resolution, reason: input.reason }),
      });
      if (!res.ok) {
        const parsed = apiErrorSchema.safeParse(await res.json().catch(() => null));
        throw new Error(parsed.success ? parsed.data.message : `Request failed (${res.status}).`);
      }
      return reportActionResponseSchema.parse(await res.json());
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["reports"] });
      void queryClient.invalidateQueries({ queryKey: ["analytics"] });
    },
  });
}
