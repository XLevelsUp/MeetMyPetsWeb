"use client";

import { keepPreviousData, useQuery } from "@tanstack/react-query";

import { apiErrorSchema } from "@/lib/api-contract";
import { auditResponseSchema, type AuditQuery } from "@/lib/audit-contract";

/** React Query hook for the audit log. Responses are zod-parsed. */
export function useAuditLogs(query: AuditQuery) {
  return useQuery({
    queryKey: ["audit", query],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: String(query.page),
        pageSize: String(query.pageSize),
        action: query.action,
        targetType: query.targetType,
      });
      if (query.q) params.set("q", query.q);
      if (query.from) params.set("from", query.from);
      if (query.to) params.set("to", query.to);

      const res = await fetch(`/api/v1/admin/audit?${params.toString()}`);
      if (!res.ok) {
        const parsed = apiErrorSchema.safeParse(await res.json().catch(() => null));
        throw new Error(parsed.success ? parsed.data.message : `Request failed (${res.status}).`);
      }
      return auditResponseSchema.parse(await res.json());
    },
    placeholderData: keepPreviousData,
    staleTime: 15_000,
  });
}
