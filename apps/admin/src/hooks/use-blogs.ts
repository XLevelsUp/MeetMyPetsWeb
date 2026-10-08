"use client";

import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { copy } from "@/config/admin";
import { apiErrorSchema } from "@/lib/api-contract";
import {
  blogCategoriesResponseSchema,
  blogCategorySchema,
  blogImageUploadResponseSchema,
  blogListResponseSchema,
  blogMutationResponseSchema,
  blogPostSchema,
  blogPreviewResponseSchema,
  revalidationSchema,
  type BlogAction,
  type BlogListQuery,
  type BlogMutationResponse,
  type BlogSaveBody,
} from "@/lib/blog-contract";
import { queryToSearchParams } from "@/lib/contract-shared";

const BASE = "/api/v1/admin/blogs";

async function request(url: string, init?: RequestInit): Promise<unknown> {
  const res = await fetch(url, init);
  if (!res.ok) {
    const parsed = apiErrorSchema.safeParse(await res.json().catch(() => null));
    throw new Error(parsed.success ? parsed.data.message : `Request failed (${res.status}).`);
  }
  return res.json();
}

function postJson(url: string, body: unknown) {
  return request(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

export function useBlogPosts(query: BlogListQuery) {
  return useQuery({
    queryKey: ["blogs", "list", query],
    queryFn: async () =>
      blogListResponseSchema.parse(await request(`${BASE}?${queryToSearchParams(query).toString()}`)),
    placeholderData: keepPreviousData,
    staleTime: 15_000,
  });
}

export function useBlogPost(id: string | null) {
  return useQuery({
    queryKey: ["blogs", "post", id],
    queryFn: async () => blogPostSchema.parse(await request(`${BASE}/${id}`)),
    enabled: Boolean(id),
    // The editor seeds its form from this once; a background refetch must not
    // look like fresh data mid-edit.
    staleTime: Infinity,
    refetchOnWindowFocus: false,
  });
}

export function useBlogCategories() {
  return useQuery({
    queryKey: ["blogs", "categories"],
    queryFn: async () => blogCategoriesResponseSchema.parse(await request(`${BASE}/categories`)).items,
    staleTime: 60_000,
  });
}

/**
 * Surfaces the cache-refresh outcome next to the save. A failed refresh is a
 * warning with a retry, never a silent success: the database has the change,
 * but visitors may not see it yet.
 */
export function reportRevalidation(result: BlogMutationResponse, success: string) {
  if (result.revalidation.status === "failed" || result.revalidation.status === "unconfigured") {
    const slugs = [result.slug];
    toast.warning(copy.blogs.toast.stale.replace("{reason}", result.revalidation.message ?? ""), {
      duration: 20_000,
      action: {
        label: copy.blogs.toast.retry,
        onClick: () => {
          void retryRevalidation(slugs);
        },
      },
    });
    return;
  }
  toast.success(success);
}

async function retryRevalidation(slugs: string[]) {
  try {
    const result = revalidationSchema.parse(await postJson(`${BASE}/revalidate`, { slugs }));
    if (result.status === "ok") toast.success(copy.blogs.toast.refreshed);
    else toast.error(result.message ?? copy.blogs.toast.stale.replace("{reason}", ""));
  } catch (error) {
    toast.error(error instanceof Error ? error.message : "Refresh failed.");
  }
}

function useBlogMutation<TInput>(fn: (input: TInput) => Promise<BlogMutationResponse>) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: fn,
    onSuccess: (result) => {
      void queryClient.invalidateQueries({ queryKey: ["blogs", "list"] });
      void queryClient.invalidateQueries({ queryKey: ["blogs", "post", result.id] });
    },
  });
}

export function useSaveBlogPost() {
  return useBlogMutation(async ({ id, ...body }: BlogSaveBody & { id: string | null }) =>
    blogMutationResponseSchema.parse(await postJson(id ? `${BASE}/${id}` : BASE, body)),
  );
}

export function useBlogAction() {
  return useBlogMutation(async ({ id, action, reason }: { id: string; action: BlogAction; reason?: string }) =>
    blogMutationResponseSchema.parse(await postJson(`${BASE}/${id}/actions`, { action, reason })),
  );
}

export function useCreateBlogCategory() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (name: string) => blogCategorySchema.parse(await postJson(`${BASE}/categories`, { name })),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ["blogs", "categories"] }),
  });
}

export async function uploadBlogImage(file: File): Promise<string> {
  const form = new FormData();
  form.set("file", file);
  return blogImageUploadResponseSchema.parse(await request(`${BASE}/images`, { method: "POST", body: form })).url;
}

/**
 * Opens the preview in a new tab. The tab is opened synchronously, inside the
 * click, and pointed at the URL once it arrives — opening it after the await
 * would be treated as an unsolicited pop-up and blocked.
 */
export async function openPreview(id: string) {
  const tab = window.open("about:blank", "_blank");
  try {
    const { url } = blogPreviewResponseSchema.parse(await postJson(`${BASE}/${id}/preview`, {}));
    if (tab) {
      tab.opener = null;
      tab.location.href = url;
    } else {
      toast.error(copy.blogs.toast.previewBlocked);
    }
  } catch (error) {
    tab?.close();
    toast.error(error instanceof Error ? error.message : "Could not open a preview.");
  }
}
