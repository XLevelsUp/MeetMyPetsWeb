import { NextResponse } from "next/server";

import type { ApiError } from "@/lib/api-contract";
import { requireRole } from "@/lib/dal";
import { USERS_VIEW_ROLES } from "@/lib/roles";
import { getAccountDetail } from "@/lib/users";

export const dynamic = "force-dynamic";

// Next 16: route params are async.
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireRole(...USERS_VIEW_ROLES);
  if (!session.ok) {
    const status = session.reason === "unauthenticated" ? 401 : 403;
    return NextResponse.json<ApiError>(
      { error: session.reason, message: session.message },
      { status },
    );
  }

  const { id } = await params;
  const result = await getAccountDetail(id);
  if (!result.ok) {
    const status = result.reason === "not_found" ? 404 : 500;
    return NextResponse.json<ApiError>(
      { error: result.reason, message: result.message },
      { status },
    );
  }

  return NextResponse.json(result.data);
}
