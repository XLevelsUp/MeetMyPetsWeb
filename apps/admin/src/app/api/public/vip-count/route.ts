import { NextResponse, type NextRequest } from "next/server";

import type { ApiError } from "@/lib/api-contract";
import { fetchVipCount } from "@/lib/public-stats";

/**
 * The ONE unauthenticated route in this app. Exempted from proxy.ts's
 * session check (see its matcher comment) so meetmypets.app — a static
 * export with no server of its own — can read a single public number.
 *
 * Never add a second route under /api/public without re-reading
 * lib/public-stats.ts's doc comment: everything reachable from here must
 * stay reducible to a count/aggregate, never a row.
 *
 * CORS is an explicit allowlist, not "*" — this still touches the same
 * production Supabase project as every role-gated admin route, so the
 * response is scoped to the one origin that's supposed to call it.
 */
export const dynamic = "force-dynamic";

/** www is what the site actually serves — the apex 308-redirects to it. */
const ALLOWED_ORIGINS = new Set([
  "https://www.meetmypets.app",
  "https://meetmypets.app",
  ...(process.env.NODE_ENV === "production" ? [] : ["http://localhost:3000"]),
]);

function corsHeaders(origin: string | null): HeadersInit {
  const allowed = origin && ALLOWED_ORIGINS.has(origin) ? origin : "https://www.meetmypets.app";
  return {
    "Access-Control-Allow-Origin": allowed,
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    Vary: "Origin",
  };
}

export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, { status: 204, headers: corsHeaders(request.headers.get("origin")) });
}

export async function GET(request: NextRequest) {
  const headers = corsHeaders(request.headers.get("origin"));
  const result = await fetchVipCount();

  if (!result.ok) {
    return NextResponse.json<ApiError>(
      { error: result.reason, message: result.message },
      { status: 500, headers },
    );
  }

  return NextResponse.json(result.data, {
    headers: {
      ...headers,
      // Public promo number, not per-user data: a CDN/browser may cache it
      // briefly. 60s fresh, then serve stale for up to 5min while
      // revalidating — a visitor never blocks on a slow DB round trip, and
      // the count still can't drift far from live.
      "Cache-Control": "public, max-age=60, stale-while-revalidate=300",
    },
  });
}
