import "server-only";

import { NextResponse } from "next/server";

import type { ApiError } from "@/lib/api-contract";
import { requireRole } from "@/lib/dal";
import { TEAM_MESSAGE_ROLES } from "@/lib/roles";
import { teamErrorText } from "@/lib/team-messages-constants";
import type { TeamResult } from "@/lib/team-messages";

// Shared by every /api/v1/admin/team-messages route: role gate first, friendly error text out.

export async function teamSession() {
  let session: Awaited<ReturnType<typeof requireRole>>;
  try {
    session = await requireRole(...TEAM_MESSAGE_ROLES);
  } catch {
    // The auth server itself was unreachable; answer in our error shape rather than an empty 500.
    return {
      ok: false as const,
      response: NextResponse.json<ApiError>(
        { error: "auth_unavailable", message: "Couldn't check your sign-in just now. Please try again." },
        { status: 503 },
      ),
    };
  }
  if (session.ok) return { ok: true as const, actorId: session.userId };
  const status = session.reason === "unauthenticated" ? 401 : 403;
  return {
    ok: false as const,
    response: NextResponse.json<ApiError>({ error: session.reason, message: session.message }, { status }),
  };
}

export function badRequest(message: string) {
  return NextResponse.json<ApiError>({ error: "invalid_body", message }, { status: 400 });
}

export async function readJson(request: Request): Promise<{ ok: true; body: unknown } | { ok: false }> {
  try {
    return { ok: true, body: await request.json() };
  } catch {
    return { ok: false };
  }
}

export function teamResponse<T>(result: TeamResult<T>) {
  if (result.ok) return NextResponse.json(result.data);
  if (result.reason === "rejected") {
    const status = result.code === "not_allowed" ? 403 : 400;
    return NextResponse.json<ApiError>({ error: result.code, message: teamErrorText(result.code) }, { status });
  }
  const status = result.reason === "unavailable" ? 503 : 500;
  return NextResponse.json<ApiError>({ error: result.reason, message: result.message }, { status });
}
