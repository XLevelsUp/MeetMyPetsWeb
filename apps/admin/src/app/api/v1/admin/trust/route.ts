import { NextResponse, type NextRequest } from "next/server";

import type { ApiError } from "@/lib/api-contract";
import { requireRole } from "@/lib/dal";
import { ANALYTICS_ROLES } from "@/lib/roles";
import { listTrustQueue } from "@/lib/trust";
import { trustQuerySchema } from "@/lib/trust-contract";

export const dynamic = "force-dynamic";

/**
 * Reading the queue uses ANALYTICS_ROLES (super_admin + moderator) — a
 * moderator should be able to see who the automated system has banned. Acting
 * on it is narrower; see the [id] route.
 */
export async function GET(request: NextRequest) {
  const session = await requireRole(...ANALYTICS_ROLES);
  if (!session.ok) {
    const status = session.reason === "unauthenticated" ? 401 : 403;
    return NextResponse.json<ApiError>(
      { error: session.reason, message: session.message },
      { status },
    );
  }

  const params = request.nextUrl.searchParams;
  const query = trustQuerySchema.parse({
    page: params.get("page") ?? undefined,
    pageSize: params.get("pageSize") ?? undefined,
    q: params.get("q") ?? undefined,
    status: params.get("status") ?? undefined,
    overdueOnly: params.get("overdueOnly") ?? undefined,
  });

  const result = await listTrustQueue(query);
  if (!result.ok) {
    return NextResponse.json<ApiError>(
      { error: result.reason, message: result.message },
      { status: 500 },
    );
  }

  return NextResponse.json(result.data);
}
