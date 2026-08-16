import { NextResponse } from "next/server";

import type { ApiError } from "@/lib/api-contract";
import { requireRole } from "@/lib/dal";
import { USERS_VIEW_ROLES } from "@/lib/roles";
import { listSpeciesOptions } from "@/lib/users";

/**
 * Species options for the pets filter.
 *
 * Deliberately NOT the taxonomy endpoint: that one is gated to SETTINGS_ROLES
 * because it manages the taxonomy, and a moderator filtering a list would get a
 * 403. This is read-only reference data the mobile app already reads with the
 * anon key, so USERS_VIEW_ROLES — the gate on the surface it serves — is the
 * right one.
 */
export const dynamic = "force-dynamic";

export async function GET() {
  const session = await requireRole(...USERS_VIEW_ROLES);
  if (!session.ok) {
    const status = session.reason === "unauthenticated" ? 401 : 403;
    return NextResponse.json<ApiError>(
      { error: session.reason, message: session.message },
      { status },
    );
  }

  const result = await listSpeciesOptions();
  if (!result.ok) {
    return NextResponse.json<ApiError>(
      { error: result.reason, message: result.message },
      { status: 500 },
    );
  }

  return NextResponse.json(result.data);
}
