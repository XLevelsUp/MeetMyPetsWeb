"use client";

import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { apiErrorSchema } from "@/lib/api-contract";
import {
  trustActionResponseSchema,
  trustLedgerResponseSchema,
  trustQueueResponseSchema,
  type TrustQuery,
} from "@/lib/trust-contract";

export function useTrustQueue(query: TrustQuery) {
  return useQuery({
    queryKey: ["trust", "queue", query],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: String(query.page),
        pageSize: String(query.pageSize),
        status: query.status,
        overdueOnly: String(query.overdueOnly),
      });
      if (query.q) params.set("q", query.q);

      const res = await fetch(`/api/v1/admin/trust?${params.toString()}`);
      if (!res.ok) {
        const parsed = apiErrorSchema.safeParse(await res.json().catch(() => null));
        throw new Error(parsed.success ? parsed.data.message : `Request failed (${res.status}).`);
      }
      return trustQueueResponseSchema.parse(await res.json());
    },
    placeholderData: keepPreviousData,
    staleTime: 15_000,
  });
}

/** The event ledger for one pet, fetched when a reviewer opens it. */
export function useTrustLedger(petId: string | null) {
  return useQuery({
    queryKey: ["trust", "ledger", petId],
    queryFn: async () => {
      const res = await fetch(`/api/v1/admin/trust/${petId}`);
      if (!res.ok) {
        const parsed = apiErrorSchema.safeParse(await res.json().catch(() => null));
        throw new Error(parsed.success ? parsed.data.message : `Request failed (${res.status}).`);
      }
      return trustLedgerResponseSchema.parse(await res.json());
    },
    enabled: Boolean(petId),
    staleTime: 15_000,
  });
}

/**
 * Restore. Invalidates the queue, the ledger, and `["users"]` — a pet's trust
 * is shown on the report queue and the pets table too, so refreshing only this
 * screen would leave the rest of the panel showing a ban that has been lifted.
 */
export function useRestoreTrust() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: { petId: string; reason: string }) => {
      const res = await fetch(`/api/v1/admin/trust/${input.petId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: input.reason }),
      });
      if (!res.ok) {
        const parsed = apiErrorSchema.safeParse(await res.json().catch(() => null));
        throw new Error(parsed.success ? parsed.data.message : `Request failed (${res.status}).`);
      }
      return trustActionResponseSchema.parse(await res.json());
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["trust"] });
      void queryClient.invalidateQueries({ queryKey: ["users"] });
      void queryClient.invalidateQueries({ queryKey: ["reports"] });
    },
  });
}
