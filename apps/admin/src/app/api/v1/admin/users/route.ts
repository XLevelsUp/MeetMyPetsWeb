import { NextResponse, type NextRequest } from "next/server";

import type { ApiError } from "@/lib/api-contract";
import { requireRole } from "@/lib/dal";
import { USERS_VIEW_ROLES } from "@/lib/roles";
import { listAccounts } from "@/lib/users";
import { accountsQuerySchema } from "@/lib/users-contract";

// Auth cookies + PII on every hit — never cacheable.
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const session = await requireRole(...USERS_VIEW_ROLES);
  if (!session.ok) {
    const status = session.reason === "unauthenticated" ? 401 : 403;
    return NextResponse.json<ApiError>(
      { error: session.reason, message: session.message },
      { status },
    );
  }

  const params = request.nextUrl.searchParams;
  const query = accountsQuerySchema.parse({
    page: params.get("page") ?? undefined,
    pageSize: params.get("pageSize") ?? undefined,
    q: params.get("q") ?? undefined,
    status: params.get("status") ?? undefined,
  });

  const result = await listAccounts(query);
  if (!result.ok) {
    return NextResponse.json<ApiError>(
      { error: result.reason, message: result.message },
      { status: 500 },
    );
  }

  return NextResponse.json(result.data);
}
