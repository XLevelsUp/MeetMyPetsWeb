import { NextResponse, type NextRequest } from "next/server";

import { analyticsRangeQuerySchema, type ApiError } from "@/lib/api-contract";
import { resolveRange } from "@/lib/analytics-constants";
import { fetchAnalyticsTimeseries } from "@/lib/analytics";
import { searchParamsToQuery } from "@/lib/contract-shared";
import { requireRole } from "@/lib/dal";
import { ANALYTICS_ROLES } from "@/lib/roles";

// Touches auth cookies on every hit — never cacheable.
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const session = await requireRole(...ANALYTICS_ROLES);
  if (!session.ok) {
    const status = session.reason === "unauthenticated" ? 401 : 403;
    return NextResponse.json<ApiError>(
      { error: session.reason, message: session.message },
      { status },
    );
  }

  // Garbage or missing params fall back to the default preset (zod .catch).
  const query = searchParamsToQuery(analyticsRangeQuerySchema, request.nextUrl.searchParams);
  const result = await fetchAnalyticsTimeseries(
    resolveRange(query.preset, query.from, query.to),
  );
  if (!result.ok) {
    return NextResponse.json<ApiError>(
      { error: result.reason, message: result.message },
      { status: 500 },
    );
  }

  return NextResponse.json(result.data);
}
