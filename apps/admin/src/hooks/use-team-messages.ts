"use client";

import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { queryToSearchParams } from "@/lib/contract-shared";
import { postJson, shouldRetry, teamRequest } from "@/lib/team-messages-client";
import type { TeamAudience, TeamState } from "@/lib/team-messages-constants";
import {
  actionResultSchema,
  audienceCountsSchema,
  placeOptionsResponseSchema,
  sendResultSchema,
  teamHistoryResponseSchema,
  type AudienceInput,
  type MessageActionRequest,
  type SendRequest,
  type WelcomeActionRequest,
  welcomeActionResultSchema,
  welcomeListResponseSchema,
} from "@/lib/team-messages-contract";

const BASE = "/api/v1/admin/team-messages";

export type HistoryView = {
  state: TeamState;
  from?: string;
  to?: string;
  sender?: string;
  audience?: TeamAudience;
  q?: string;
  page: number;
  pageSize: number;
};

// Minutes east of UTC, so the server cuts days at the viewer's midnight, not UTC's.
const viewerOffset = () => -new Date().getTimezoneOffset();

export function useTeamMessages(view: HistoryView) {
  return useQuery({
    queryKey: ["team-messages", "list", view],
    queryFn: () => {
      const params = queryToSearchParams({ ...view, tz: viewerOffset() });
      return teamRequest(`${BASE}?${params.toString()}`, teamHistoryResponseSchema);
    },
    // Keeps the current page on screen while the next one loads, so paging doesn't flash empty.
    placeholderData: keepPreviousData,
    retry: shouldRetry,
    staleTime: 15_000,
    refetchInterval: 60_000,
  });
}

// One row is enough to know whether the failed banner should show.
export function useHasFailedMessages() {
  return useQuery({
    queryKey: ["team-messages", "list", "failed", "probe"],
    queryFn: async () => (await teamRequest(`${BASE}?state=failed&pageSize=1`, teamHistoryResponseSchema)).total > 0,
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
