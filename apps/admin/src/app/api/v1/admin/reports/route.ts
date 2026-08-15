import { NextResponse, type NextRequest } from "next/server";

import type { ApiError } from "@/lib/api-contract";
import { requireRole } from "@/lib/dal";
import { listReports } from "@/lib/reports";
import { reportsQuerySchema } from "@/lib/reports-contract";
import { REPORTS_ROLES } from "@/lib/roles";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const session = await requireRole(...REPORTS_ROLES);
  if (!session.ok) {
    const status = session.reason === "unauthenticated" ? 401 : 403;
    return NextResponse.json<ApiError>(
      { error: session.reason, message: session.message },
      { status },
    );
  }

  const params = request.nextUrl.searchParams;
  const query = reportsQuerySchema.parse({
    page: params.get("page") ?? undefined,
    pageSize: params.get("pageSize") ?? undefined,
    q: params.get("q") ?? undefined,
    status: params.get("status") ?? undefined,
    reason: params.get("reason") ?? undefined,
    scope: params.get("scope") ?? undefined,
  });

  const result = await listReports(query);
  if (!result.ok) {
    return NextResponse.json<ApiError>(
      { error: result.reason, message: result.message },
      { status: 500 },
    );
  }

  return NextResponse.json(result.data);
}
