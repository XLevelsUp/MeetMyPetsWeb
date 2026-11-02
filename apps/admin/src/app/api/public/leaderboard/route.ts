import { NextResponse, type NextRequest } from "next/server";

import type { ApiError } from "@/lib/api-contract";
import { fetchLeaderboard } from "@/lib/public-leaderboard";

/**
 * Public leaderboard for the marketing site. The second unauthenticated route
 * in this app (see also api/public/vip-count), exempted from proxy.ts's session
 * check by the /api/public matcher.
 *
 * Read lib/public-leaderboard.ts's doc comment before changing anything here:
 * what this returns is world readable, so it is held to pet name, species,
 * public photo and rank — never a score, never an id, never an owner.
 *
 * CORS is an explicit allowlist, not "*" — this touches the same production
 * Supabase project as every role-gated admin route.
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
  return new NextResponse(null, {
    status: 204,
    headers: corsHeaders(request.headers.get("origin")),
  });
}

export async function GET(request: NextRequest) {
  const headers = corsHeaders(request.headers.get("origin"));

  // All four categories ship in one response: they are three rows each, and a
  // request per category would be four round trips for ~2KB of JSON.
  const result = await fetchLeaderboard();

  if (!result.ok) {
    return NextResponse.json<ApiError>(
      { error: result.reason, message: result.message },
      { status: 500, headers },
    );
  }

  return NextResponse.json(result.data, {
    headers: {
      ...headers,
      // Rankings are promotional, not per-user: 30 minutes fresh, then served
      // stale for an hour while revalidating. Matches the "updates every 30
      // minutes" the page tells visitors.
      "Cache-Control": "public, max-age=1800, stale-while-revalidate=3600",
    },
  });
}
