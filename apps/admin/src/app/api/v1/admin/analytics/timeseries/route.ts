import { NextResponse, type NextRequest } from "next/server";

import { timeseriesDaysSchema, type ApiError } from "@/lib/api-contract";
import { fetchAnalyticsTimeseries } from "@/lib/analytics";
import { requireRole } from "@/lib/dal";

// Touches auth cookies on every hit — never cacheable.
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const session = await requireRole("moderator", "super_admin");
  if (!session.ok) {
    const status = session.reason === "unauthenticated" ? 401 : 403;
    return NextResponse.json<ApiError>(
      { error: session.reason, message: session.message },
      { status },
    );
  }

  // Out-of-range or garbage ?days= falls back to 30 (zod .catch).
  const days = timeseriesDaysSchema.parse(request.nextUrl.searchParams.get("days") ?? undefined);

  const result = await fetchAnalyticsTimeseries(days);
  if (!result.ok) {
    return NextResponse.json<ApiError>(
      { error: result.reason, message: result.message },
      { status: 500 },
    );
  }

  return NextResponse.json(result.data);
}
