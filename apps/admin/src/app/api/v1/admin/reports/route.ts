import { NextResponse, type NextRequest } from "next/server";

import type { ApiError } from "@/lib/api-contract";
import { searchParamsToQuery } from "@/lib/contract-shared";
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

  // Derived from the schema's own keys, so adding a sort or a filter wires it
  // end to end rather than being silently dropped here.
  const query = searchParamsToQuery(reportsQuerySchema, request.nextUrl.searchParams);
  const result = await listReports(query);
  if (!result.ok) {
    return NextResponse.json<ApiError>(
      { error: result.reason, message: result.message },
      { status: 500 },
    );
  }

  return NextResponse.json(result.data);
}
