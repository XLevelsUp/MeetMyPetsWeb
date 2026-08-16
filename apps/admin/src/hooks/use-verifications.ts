"use client";

import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { apiErrorSchema } from "@/lib/api-contract";
import type { RejectionReason } from "@/lib/certificate-constants";
import {
  certificateActionResponseSchema,
  certificatesResponseSchema,
  signedDocumentSchema,
  type CertificatesQuery,
} from "@/lib/verifications-contract";

/** React Query hook for the certificate queue. Responses are zod-parsed. */
export function useCertificates(query: CertificatesQuery) {
  return useQuery({
    queryKey: ["verifications", query],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: String(query.page),
        pageSize: String(query.pageSize),
        status: query.status,
        certificateType: query.certificateType,
      });
      if (query.q) params.set("q", query.q);

      const res = await fetch(`/api/v1/admin/verifications?${params.toString()}`);
      if (!res.ok) {
        const parsed = apiErrorSchema.safeParse(await res.json().catch(() => null));
        throw new Error(parsed.success ? parsed.data.message : `Request failed (${res.status}).`);
      }
      return certificatesResponseSchema.parse(await res.json());
    },
    placeholderData: keepPreviousData,
    staleTime: 15_000,
  });
}

/**
 * Mints a signed document URL for one certificate.
 *
 * `staleTime`/`gcTime` sit below the URL's own 300s TTL so React Query can
 * never hand back a cached link that has already expired — a stale URL renders
 * as a broken pane, which is worse than a refetch.
 */
export function useCertificateDocument(certificateId: string | null, enabled: boolean) {
  return useQuery({
    queryKey: ["verifications", "document", certificateId],
    queryFn: async () => {
      const res = await fetch(`/api/v1/admin/verifications/${certificateId}/document`);
      if (!res.ok) {
        const parsed = apiErrorSchema.safeParse(await res.json().catch(() => null));
        throw new Error(parsed.success ? parsed.data.message : `Request failed (${res.status}).`);
      }
      return signedDocumentSchema.parse(await res.json());
    },
    enabled: Boolean(certificateId) && enabled,
    staleTime: 240_000,
    gcTime: 240_000,
    retry: false,
  });
}

/**
 * Approve or reject. Invalidates the queue and the dashboard metrics.
 *
 * No optimistic update: an approval moves the backend's trust engine, so the
 * UI should reflect what the server actually did rather than what we assumed.
 */
export function useDecideCertificate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: {
      id: string;
      decision: "approve" | "reject";
      reason: string;
      rejectionReason?: RejectionReason;
    }) => {
      const body =
        input.decision === "approve"
          ? { decision: "approve", reason: input.reason }
          : {
              decision: "reject",
              reason: input.reason,
              rejectionReason: input.rejectionReason,
            };

      const res = await fetch(`/api/v1/admin/verifications/${input.id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const parsed = apiErrorSchema.safeParse(await res.json().catch(() => null));
        throw new Error(parsed.success ? parsed.data.message : `Request failed (${res.status}).`);
      }
      return certificateActionResponseSchema.parse(await res.json());
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["verifications"] });
      void queryClient.invalidateQueries({ queryKey: ["analytics"] });
    },
  });
}
