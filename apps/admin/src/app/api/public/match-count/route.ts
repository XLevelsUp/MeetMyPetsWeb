import { NextResponse, type NextRequest } from "next/server";

import type { ApiError } from "@/lib/api-contract";
import { fetchMatchStats } from "@/lib/public-stats";

// Public, unauthenticated (proxy.ts exempts /api/public): two match counts for meetmypets.app, nothing else.
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
  const result = await fetchMatchStats();

  if (!result.ok) {
    return NextResponse.json<ApiError>(
      { error: result.reason, message: result.message },
      { status: 500, headers },
    );
  }

  return NextResponse.json(result.data, {
    headers: {
      ...headers,
      // Public aggregate: cache 60s, then serve stale up to 5 min while revalidating.
      "Cache-Control": "public, max-age=60, stale-while-revalidate=300",
    },
  });
}
