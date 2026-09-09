import { NextResponse, type NextRequest } from "next/server";

import type { ApiError } from "@/lib/api-contract";
import { searchParamsToQuery } from "@/lib/contract-shared";
import { requireRole } from "@/lib/dal";
import { VERIFICATION_ROLES } from "@/lib/roles";
import { listCertificates } from "@/lib/verifications";
import { certificatesQuerySchema } from "@/lib/verifications-contract";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const session = await requireRole(...VERIFICATION_ROLES);
  if (!session.ok) {
    const status = session.reason === "unauthenticated" ? 401 : 403;
    return NextResponse.json<ApiError>(
      { error: session.reason, message: session.message },
      { status },
    );
  }

  // Derived from the schema's own keys, so adding a sort or a filter wires it
  // end to end instead of being silently dropped here. Garbage degrades via
  // the contract's `.catch()` rather than 400-ing.
  const query = searchParamsToQuery(certificatesQuerySchema, request.nextUrl.searchParams);
  const result = await listCertificates(query);
  if (!result.ok) {
    return NextResponse.json<ApiError>(
      { error: result.reason, message: result.message },
      { status: 500 },
    );
  }

  return NextResponse.json(result.data);
}
