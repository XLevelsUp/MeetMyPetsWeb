import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import { isSupabaseConfigured } from "@/lib/supabase/reference";

/**
 * Supabase Storage access for private review documents.
 *
 * The certificate documents were long assumed to live in Cloudflare R2 — they
 * never did (docs/admin/schema-notes.md, corrected 2026-08-15). They are in the
 * private `pet-certificates` bucket, and the service client the panel already
 * holds can sign them. No external credentials, no presign endpoint.
 *
 * House adapter pattern: discriminated unions, never throws.
 */

export const BUCKETS = {
  /** Private. Vaccination / health / license documents under review. */
  certificates: "pet-certificates",
} as const;

/**
 * Signed URLs are minted ON DEMAND, one document at a time, and deliberately
 * never embedded in a list response: a short-lived URL attached to a page of
 * rows is already expired by the time a reviewer reaches the third one.
 *
 * 5 minutes is long enough to actually read a document (including zooming
 * around a scanned PDF) and short enough that a leaked URL is worthless.
 */
export const DOCUMENT_URL_TTL_SECONDS = 300;

export type SignedDocument = {
  url: string;
  /** Echoed back so the viewer can pick <img> vs <object> without a second fetch. */
  mimeType: string | null;
  expiresInSeconds: number;
};

export type StorageResult<T> =
  | { ok: true; data: T }
  | { ok: false; reason: "unconfigured" | "not_found" | "sign_failed"; message: string };

/**
 * Mints a short-lived URL for one document in the private bucket.
 *
 * `path` is `pet_certificates.file_path`, which is owner-supplied data. It is
 * passed to the storage API as an object key, never interpolated into a URL we
 * build ourselves — supabase-js encodes it — so a path containing `../` or a
 * query string cannot escape the bucket or forge a different request.
 */
export async function signDocument(
  path: string | null,
  mimeType: string | null,
  ttlSeconds: number = DOCUMENT_URL_TTL_SECONDS,
): Promise<StorageResult<SignedDocument>> {
  if (!isSupabaseConfigured()) {
    return { ok: false, reason: "unconfigured", message: "Supabase env vars are not set." };
  }
  if (!path?.trim()) {
    return { ok: false, reason: "not_found", message: "This record has no document attached." };
  }

  try {
    const { data, error } = await createAdminClient()
      .storage.from(BUCKETS.certificates)
      .createSignedUrl(path, ttlSeconds);

    if (error) return { ok: false, reason: "sign_failed", message: error.message };
    if (!data?.signedUrl) {
      return { ok: false, reason: "sign_failed", message: "Storage returned no signed URL." };
    }

    return {
      ok: true,
      data: { url: data.signedUrl, mimeType, expiresInSeconds: ttlSeconds },
    };
  } catch (error) {
    return {
      ok: false,
      reason: "sign_failed",
      message: error instanceof Error ? error.message : "Unknown storage failure.",
    };
  }
}
