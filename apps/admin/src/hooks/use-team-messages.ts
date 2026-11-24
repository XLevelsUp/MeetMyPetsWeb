"use client";

import { keepPreviousData, useInfiniteQuery, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { queryToSearchParams } from "@/lib/contract-shared";
import { postJson, shouldRetry, teamRequest } from "@/lib/team-messages-client";
import { TEAM_LIST_DEFAULT, type TeamState } from "@/lib/team-messages-constants";
import {
  actionResultSchema,
  audienceCountsSchema,
  placeOptionsResponseSchema,
  sendResultSchema,
  teamListResponseSchema,
  type AudienceInput,
  type MessageActionRequest,
  type SendRequest,
  type WelcomeActionRequest,
  welcomeActionResultSchema,
  welcomeListResponseSchema,
} from "@/lib/team-messages-contract";

const BASE = "/api/v1/admin/team-messages";

export function useTeamMessages(state: TeamState) {
  return useInfiniteQuery({
    queryKey: ["team-messages", "list", state],
    initialPageParam: undefined as string | undefined,
    queryFn: ({ pageParam }) => {
      const params = queryToSearchParams({ state, before: pageParam, limit: TEAM_LIST_DEFAULT });
      return teamRequest(`${BASE}?${params.toString()}`, teamListResponseSchema);
    },
    getNextPageParam: (last) => last.nextBefore ?? undefined,
    retry: shouldRetry,
    staleTime: 15_000,
    refetchInterval: 60_000,
  });
}

// One row is enough to know whether the failed banner should show.
export function useHasFailedMessages() {
  return useQuery({
    queryKey: ["team-messages", "list", "failed", "probe"],
    queryFn: async () => (await teamRequest(`${BASE}?state=failed&limit=1`, teamListResponseSchema)).items.length > 0,
    retry: shouldRetry,
    staleTime: 60_000,
    refetchInterval: 60_000,
  });
}

export function usePlaceOptions() {
  return useQuery({
    queryKey: ["team-messages", "places"],
    queryFn: () => teamRequest(`${BASE}/places`, placeOptionsResponseSchema),
    retry: shouldRetry,
    staleTime: 5 * 60_000,
  });
}

// `audience` is null until the picker is complete, which keeps the query idle.
export function useAudiencePreview(audience: AudienceInput | null) {
  return useQuery({
    queryKey: ["team-messages", "preview", audience],
    queryFn: () => postJson(`${BASE}/preview`, audienceCountsSchema, audience),
    enabled: audience !== null,
    placeholderData: keepPreviousData,
    retry: shouldRetry,
    staleTime: 30_000,
  });
}

export function useSendTeamMessage() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: SendRequest) => postJson(BASE, sendResultSchema, input),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ["team-messages", "list"] }),
  });
}

export function useTeamMessageAction() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...body }: MessageActionRequest & { id: string }) =>
      postJson(`${BASE}/${id}/actions`, actionResultSchema, body),
    onSettled: () => void queryClient.invalidateQueries({ queryKey: ["team-messages", "list"] }),
  });
}

export function useWelcomes() {
  return useQuery({
    queryKey: ["team-messages", "welcomes"],
    queryFn: () => teamRequest(`${BASE}/welcome`, welcomeListResponseSchema),
    retry: shouldRetry,
    staleTime: 15_000,
  });
}

export function useWelcomeAction() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: WelcomeActionRequest) => postJson(`${BASE}/welcome`, welcomeActionResultSchema, input),
    onSettled: () => void queryClient.invalidateQueries({ queryKey: ["team-messages"] }),
  });
}
