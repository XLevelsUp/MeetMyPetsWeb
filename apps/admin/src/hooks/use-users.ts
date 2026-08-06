"use client";

import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { z } from "zod";

import { apiErrorSchema } from "@/lib/api-contract";
import {
  accountDetailSchema,
  accountsResponseSchema,
  actionResponseSchema,
  petsResponseSchema,
  type AccountActionRequest,
  type AccountsQuery,
  type PetActionRequest,
  type PetsQuery,
} from "@/lib/users-contract";

/**
 * React Query hooks for the moderation surface. Responses are zod-parsed
 * against the shared contract, so a drifting backend fails loudly here rather
 * than rendering a half-empty table.
 */

async function fetchJson<S extends z.ZodType>(url: string, schema: S): Promise<z.infer<S>> {
  const res = await fetch(url);
  if (!res.ok) {
    const parsed = apiErrorSchema.safeParse(await res.json().catch(() => null));
    throw new Error(parsed.success ? parsed.data.message : `Request failed (${res.status}).`);
  }
  return schema.parse(await res.json());
}

async function postJson<S extends z.ZodType>(
  url: string,
  body: unknown,
  schema: S,
): Promise<z.infer<S>> {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const parsed = apiErrorSchema.safeParse(await res.json().catch(() => null));
    throw new Error(parsed.success ? parsed.data.message : `Request failed (${res.status}).`);
  }
  return schema.parse(await res.json());
}

function toSearchParams(query: AccountsQuery | PetsQuery): string {
  const params = new URLSearchParams({
    page: String(query.page),
    pageSize: String(query.pageSize),
    status: query.status,
  });
  if (query.q) params.set("q", query.q);
  return params.toString();
}

export function useAccounts(query: AccountsQuery) {
  return useQuery({
    queryKey: ["users", "accounts", query],
    queryFn: () => fetchJson(`/api/v1/admin/users?${toSearchParams(query)}`, accountsResponseSchema),
    // Keeps the previous page on screen while the next one loads, so paging
    // doesn't flash an empty table.
    placeholderData: keepPreviousData,
    staleTime: 15_000,
  });
}

export function usePets(query: PetsQuery) {
  return useQuery({
    queryKey: ["users", "pets", query],
    queryFn: () => fetchJson(`/api/v1/admin/pets?${toSearchParams(query)}`, petsResponseSchema),
    placeholderData: keepPreviousData,
    staleTime: 15_000,
  });
}

export function useAccountDetail(id: string) {
  return useQuery({
    queryKey: ["users", "account", id],
    queryFn: () => fetchJson(`/api/v1/admin/users/${id}`, accountDetailSchema),
    staleTime: 15_000,
  });
}

/** Invalidates every moderation query so lists and detail agree again. */
function useInvalidateModeration() {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: ["users"] });
}

export function useAccountAction(accountId: string) {
  const invalidate = useInvalidateModeration();
  return useMutation({
    mutationFn: (body: AccountActionRequest) =>
      postJson(`/api/v1/admin/users/${accountId}/actions`, body, actionResponseSchema),
    onSuccess: invalidate,
  });
}

export function usePetAction(petId: string) {
  const invalidate = useInvalidateModeration();
  return useMutation({
    mutationFn: (body: PetActionRequest) =>
      postJson(`/api/v1/admin/pets/${petId}/actions`, body, actionResponseSchema),
    onSuccess: invalidate,
  });
}
