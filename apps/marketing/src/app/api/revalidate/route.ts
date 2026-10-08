import { createHash, timingSafeEqual } from "node:crypto";

import { revalidatePath, revalidateTag } from "next/cache";

import { BLOG_TAG } from "@/lib/blog";

/**
 * Cache invalidation for the blog, called by the admin after every write
 * that touches a public post (apps/admin/src/lib/blog-revalidate.ts).
 *
 * Auth: the shared BLOG_REVALIDATE_SECRET in an `x-revalidate-secret` header,
 * compared in constant time. It is a server-to-server secret — never
 * NEXT_PUBLIC_, never in a URL (URLs end up in logs).
 *
 * `revalidateTag(tag, { expire: 0 })`, not `"max"`: an external caller needs
 * the NEXT visitor to get fresh HTML. With "max" the first visitor after a
 * publish would still be served the stale page, which is exactly the "admin
 * says live, site says otherwise" gap this endpoint exists to close.
 *
 * Only blog paths and the sitemap may be named, so a leaked secret can at
 * worst make the blog re-render — it cannot be used to churn the whole site.
 */
export const dynamic = "force-dynamic";

const ALLOWED_PATH = /^\/blog\/(?:[a-z0-9]+(?:-[a-z0-9]+)*\/)?$|^\/sitemap\.xml$/;

function secretMatches(given: string | null): boolean {
  const expected = process.env.BLOG_REVALIDATE_SECRET;
  if (!expected || !given) return false;
  // Hash both sides so the comparison is constant-time even when lengths differ.
  const a = createHash("sha256").update(given).digest();
  const b = createHash("sha256").update(expected).digest();
  return timingSafeEqual(a, b);
}

export async function POST(request: Request) {
  if (!process.env.BLOG_REVALIDATE_SECRET) {
    return Response.json({ revalidated: false, message: "Revalidation is not configured." }, { status: 503 });
  }
  if (!secretMatches(request.headers.get("x-revalidate-secret"))) {
    return Response.json({ revalidated: false, message: "Unauthorized." }, { status: 401 });
  }

  let paths: string[] = [];
  try {
    const body = (await request.json()) as { paths?: unknown };
    if (Array.isArray(body.paths)) {
      paths = body.paths.filter((p): p is string => typeof p === "string" && ALLOWED_PATH.test(p)).slice(0, 50);
    }
  } catch {
    // An empty or malformed body still expires the tag below.
  }

  revalidateTag(BLOG_TAG, { expire: 0 });
  for (const path of paths) {
    // Route paths, not URLs: trailingSlash is a URL concern.
    revalidatePath(path === "/sitemap.xml" ? path : path.replace(/\/$/, ""));
  }

  return Response.json({ revalidated: true, paths, now: Date.now() });
}
