import "server-only";

import { IMAGE_UPLOAD } from "@/lib/blog-contract";
import { BLOG_BUCKET } from "@/lib/blogs";
import { createAdminClient } from "@/lib/supabase/admin";
import { isSupabaseConfigured } from "@/lib/supabase/reference";

/**
 * Blog image uploads into the public `blog-images` bucket.
 *
 * The browser never holds a storage credential: it posts the file to an
 * RBAC-gated route, and this module — with the service key — writes it. The
 * bucket itself also caps size and MIME type (migration 20261008000000), so a
 * check skipped here would still be refused there.
 *
 * The declared Content-Type is NOT trusted. The type is decided by sniffing
 * the file's leading bytes, and SVG is not accepted at all: an SVG is a
 * document that can carry script, and it would be served from a public URL.
 *
 * House adapter pattern: discriminated unions, never throws.
 */

type Sniffed = { mime: (typeof IMAGE_UPLOAD.types)[number]; ext: string };

function ascii(bytes: Uint8Array, start: number, end: number): string {
  return String.fromCharCode(...bytes.subarray(start, end));
}

export function sniffImage(bytes: Uint8Array): Sniffed | null {
  if (bytes.length < 12) return null;
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return { mime: "image/jpeg", ext: "jpg" };
  if (
    bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47 &&
    bytes[4] === 0x0d && bytes[5] === 0x0a && bytes[6] === 0x1a && bytes[7] === 0x0a
  ) {
    return { mime: "image/png", ext: "png" };
  }
  const head6 = ascii(bytes, 0, 6);
  if (head6 === "GIF87a" || head6 === "GIF89a") return { mime: "image/gif", ext: "gif" };
  if (ascii(bytes, 0, 4) === "RIFF" && ascii(bytes, 8, 12) === "WEBP") return { mime: "image/webp", ext: "webp" };
  if (ascii(bytes, 4, 8) === "ftyp") {
    const brand = ascii(bytes, 8, 12);
    if (brand === "avif" || brand === "avis") return { mime: "image/avif", ext: "avif" };
  }
  return null;
}

export type UploadResult =
  | { ok: true; url: string }
  | { ok: false; reason: "unconfigured" | "invalid" | "upload_failed"; message: string };

export async function uploadBlogImage(file: File): Promise<UploadResult> {
  if (!isSupabaseConfigured()) {
    return { ok: false, reason: "unconfigured", message: "Supabase env vars are not set." };
  }
  if (file.size === 0) return { ok: false, reason: "invalid", message: "That file is empty." };
  if (file.size > IMAGE_UPLOAD.maxBytes) {
    return { ok: false, reason: "invalid", message: "Images must be 5 MB or smaller." };
  }

  try {
    const bytes = new Uint8Array(await file.arrayBuffer());
    const kind = sniffImage(bytes);
    if (!kind) {
      return { ok: false, reason: "invalid", message: "Upload a JPEG, PNG, WebP, AVIF or GIF image." };
    }

    // Random name: no user-chosen path ever reaches the object key.
    const now = new Date();
    const path = `${now.getUTCFullYear()}/${String(now.getUTCMonth() + 1).padStart(2, "0")}/${crypto.randomUUID()}.${kind.ext}`;

    const storage = createAdminClient().storage.from(BLOG_BUCKET);
    const { error } = await storage.upload(path, bytes, {
      contentType: kind.mime,
      // Object keys are never reused, so the file at a URL never changes.
      cacheControl: "31536000",
      upsert: false,
    });
    if (error) return { ok: false, reason: "upload_failed", message: error.message };

    return { ok: true, url: storage.getPublicUrl(path).data.publicUrl };
  } catch (error) {
    return {
      ok: false,
      reason: "upload_failed",
      message: error instanceof Error ? error.message : "Unknown upload failure.",
    };
  }
}
