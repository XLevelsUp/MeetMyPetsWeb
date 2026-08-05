import { NextResponse } from "next/server";

import type { ApiError } from "@/lib/api-contract";
import { fetchAnalyticsSummary } from "@/lib/analytics";
import { requireRole } from "@/lib/dal";

// Touches auth cookies on every hit — never cacheable.
export const dynamic = "force-dynamic";

export async function GET() {
  // Authoritative RBAC — the proxy's 401 is only the optimistic first line.
  const session = await requireRole("moderator", "super_admin");
  if (!session.ok) {
    const status = session.reason === "unauthenticated" ? 401 : 403;
    return NextResponse.json<ApiError>(
      { error: session.reason, message: session.message },
      { status },
    );
  }

  const result = await fetchAnalyticsSummary();
  if (!result.ok) {
    return NextResponse.json<ApiError>(
      { error: result.reason, message: result.message },
      { status: 500 },
    );
  }

  return NextResponse.json(result.data);
}
