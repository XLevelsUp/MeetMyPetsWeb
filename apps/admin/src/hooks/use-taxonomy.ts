"use client";

import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { apiErrorSchema } from "@/lib/api-contract";
import {
  breedsResponseSchema,
  speciesResponseSchema,
  taxonomyActionResponseSchema,
  type BreedsQuery,
  type CreateBreedRequest,
  type CreateSpeciesRequest,
  type SpeciesQuery,
  type UpdateBreedRequest,
  type UpdateSpeciesRequest,
} from "@/lib/taxonomy-contract";

async function postJson(url: string, body: unknown) {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const parsed = apiErrorSchema.safeParse(await res.json().catch(() => null));
    throw new Error(parsed.success ? parsed.data.message : `Request failed (${res.status}).`);
  }
  return taxonomyActionResponseSchema.parse(await res.json());
}

export function useSpecies(query: SpeciesQuery) {
  return useQuery({
    queryKey: ["taxonomy", "species", query],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: String(query.page),
        pageSize: String(query.pageSize),
        status: query.status,
      });
      if (query.q) params.set("q", query.q);

      const res = await fetch(`/api/v1/admin/taxonomy/species?${params.toString()}`);
      if (!res.ok) {
        const parsed = apiErrorSchema.safeParse(await res.json().catch(() => null));
        throw new Error(parsed.success ? parsed.data.message : `Request failed (${res.status}).`);
      }
      return speciesResponseSchema.parse(await res.json());
    },
    placeholderData: keepPreviousData,
    staleTime: 15_000,
  });
}

export function useBreeds(query: BreedsQuery) {
  return useQuery({
    queryKey: ["taxonomy", "breeds", query],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: String(query.page),
        pageSize: String(query.pageSize),
        status: query.status,
        speciesId: query.speciesId,
      });
      if (query.q) params.set("q", query.q);

      const res = await fetch(`/api/v1/admin/taxonomy/breeds?${params.toString()}`);
      if (!res.ok) {
        const parsed = apiErrorSchema.safeParse(await res.json().catch(() => null));
        throw new Error(parsed.success ? parsed.data.message : `Request failed (${res.status}).`);
      }
      return breedsResponseSchema.parse(await res.json());
    },
    placeholderData: keepPreviousData,
    staleTime: 15_000,
  });
}

/**
 * Every taxonomy mutation invalidates `["users"]` and `["analytics"]` as well
 * as `["taxonomy"]`. Species and breed names are denormalised into the pets
 * table payload and the dashboard's species chart, so a rename that only
 * refreshed this screen would leave the rest of the panel showing the old name
 * for up to the 30s query staleTime.
 */
function useTaxonomyMutation<TInput>(fn: (input: TInput) => Promise<unknown>) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: fn,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["taxonomy"] });
      void queryClient.invalidateQueries({ queryKey: ["users"] });
      void queryClient.invalidateQueries({ queryKey: ["analytics"] });
    },
  });
}

export function useCreateSpecies() {
  return useTaxonomyMutation((input: CreateSpeciesRequest & { reason: string }) =>
    postJson("/api/v1/admin/taxonomy/species", input),
  );
}

export function useUpdateSpecies() {
  return useTaxonomyMutation(({ id, ...input }: UpdateSpeciesRequest & { id: string; reason: string }) =>
    postJson(`/api/v1/admin/taxonomy/species/${id}`, input),
  );
}

export function useCreateBreed() {
  return useTaxonomyMutation((input: CreateBreedRequest & { reason: string }) =>
    postJson("/api/v1/admin/taxonomy/breeds", input),
  );
}

export function useUpdateBreed() {
  return useTaxonomyMutation(({ id, ...input }: UpdateBreedRequest & { id: string; reason: string }) =>
    postJson(`/api/v1/admin/taxonomy/breeds/${id}`, input),
  );
}
