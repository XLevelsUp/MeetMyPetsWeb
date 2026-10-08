import "server-only";

import type { Revalidation } from "@/lib/blog-contract";

/**
 * Tells meetmypets.app to drop its cached blog pages and sitemap.
 *
 * The marketing site renders the blog as cached HTML (ISR) for crawlers and
 * speed, so a database write alone changes nothing a visitor sees. This calls
 * the site's authenticated `POST /api/revalidate/` after every write that
 * touches a public post. The result is reported separately from the save —
 * see `revalidationSchema` — so the UI can say "saved, but the site is still
 * showing the old version" instead of claiming it is live.
 *
 * If this never succeeds, pages still refresh on their own within the
 * marketing site's BLOG_REVALIDATE_SECONDS (1 hour): stale, not stuck.
 *
 * Never throws.
 */

/** Where the article lives publicly. Matches `site.url` in apps/marketing. */
export const PUBLIC_SITE_URL = "https://meetmypets.app";

const TIMEOUT_MS = 8_000;

/** The deployment to call. May differ from PUBLIC_SITE_URL (www, preview deploys, localhost). */
export function marketingOrigin(): string | null {
  const raw = process.env.MARKETING_SITE_URL?.trim();
  if (!raw) return null;
  return raw.replace(/\/+$/, "");
}

export function blogPaths(slugs: (string | null | undefined)[]): string[] {
  const paths = new Set(["/blog/", "/sitemap.xml"]);
  for (const slug of slugs) if (slug) paths.add(`/blog/${slug}/`);
  return [...paths];
}

export async function revalidateMarketing(paths: string[]): Promise<Revalidation> {
  const origin = marketingOrigin();
  const secret = process.env.BLOG_REVALIDATE_SECRET;
  if (!origin || !secret) {
    return {
      status: "unconfigured",
      message:
        "MARKETING_SITE_URL / BLOG_REVALIDATE_SECRET are not set, so the public site was not told. It will pick the change up within an hour.",
    };
  }

  try {
    const res = await fetch(`${origin}/api/revalidate/`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-revalidate-secret": secret },
      body: JSON.stringify({ paths }),
      // A redirect (apex → www, http → https) would silently drop the secret on
      // a cross-origin hop. Fail loudly instead, naming where it went.
      redirect: "manual",
      cache: "no-store",
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });

    if (res.status >= 300 && res.status < 400) {
      return {
        status: "failed",
        message: `MARKETING_SITE_URL redirects to ${res.headers.get("location") ?? "another URL"} — set it to that address.`,
      };
    }
    if (!res.ok) {
      return {
        status: "failed",
        message: `The public site refused the refresh (HTTP ${res.status}).`,
      };
    }
    return { status: "ok" };
  } catch (error) {
    return {
      status: "failed",
      message:
        error instanceof Error && error.name === "TimeoutError"
          ? "The public site did not answer the refresh in time."
          : `Could not reach the public site: ${error instanceof Error ? error.message : "unknown error"}.`,
    };
  }
}
