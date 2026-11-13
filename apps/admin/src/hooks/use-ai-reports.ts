"use client";

import { keepPreviousData, useMutation, useQueryClient, useQuery } from "@tanstack/react-query";

import { apiErrorSchema } from "@/lib/api-contract";
import { queryToSearchParams } from "@/lib/contract-shared";
import {
  aiActionResponseSchema,
  aiDecisionsResponseSchema,
  type AiDecisionsQuery,
  type AiDecisionsResponse,
  type ResolveAiDecisionRequest,
} from "@/lib/ai-moderation-contract";

/** React Query hook for the AI moderation queue. Responses are zod-parsed. */
export function useAiReports(query: AiDecisionsQuery) {
  return useQuery({
    queryKey: ["ai-reports", query],
    queryFn: async () => {
      // Derived from the query object rather than hand-listed, so a new sort
      // or filter cannot be left out of the request.
      const params = queryToSearchParams(query);

      const res = await fetch(`/api/v1/admin/ai-reports?${params.toString()}`);
      if (!res.ok) {
        const parsed = apiErrorSchema.safeParse(await res.json().catch(() => null));
        throw new Error(parsed.success ? parsed.data.message : `Request failed (${res.status}).`);
      }
      return aiDecisionsResponseSchema.parse(await res.json());
    },
    placeholderData: keepPreviousData,
    staleTime: 15_000,
  });
}

/**
 * Record a verdict, removing the row from the queue before the server answers.
 *
 * A moderator clears hundreds of these; waiting for a round trip on each is the
 * difference between a tool that keeps up and one that does not. The row is
 * pulled from every cached page immediately and restored if the write fails,
 * so a server error never silently loses the item.
 */
export function useResolveAiDecision() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: ["ai-reports"],
    mutationFn: async (input: { id: string } & ResolveAiDecisionRequest) => {
      const { id, ...body } = input;
      const res = await fetch(`/api/v1/admin/ai-reports/${id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const parsed = apiErrorSchema.safeParse(await res.json().catch(() => null));
        throw new Error(parsed.success ? parsed.data.message : `Request failed (${res.status}).`);
      }
      return aiActionResponseSchema.parse(await res.json());
    },

    onMutate: async ({ id }) => {
      await queryClient.cancelQueries({ queryKey: ["ai-reports"] });
      const snapshot = queryClient.getQueriesData<AiDecisionsResponse>({
        queryKey: ["ai-reports"],
      });

      queryClient.setQueriesData<AiDecisionsResponse>({ queryKey: ["ai-reports"] }, (old) =>
        old
          ? {
              ...old,
              items: old.items.filter((item) => item.id !== id),
              total: Math.max(0, old.total - 1),
            }
          : old,
      );

      return { snapshot };
    },

    onError: (_error, _input, context) => {
      // Put every page back exactly as it was; a failed write must not eat the row.
      for (const [key, data] of context?.snapshot ?? []) {
        queryClient.setQueryData(key, data);
      }
    },

    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: ["ai-reports"] });
      void queryClient.invalidateQueries({ queryKey: ["analytics"] });
    },
  });
}
