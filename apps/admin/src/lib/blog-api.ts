import "server-only";

import { NextResponse } from "next/server";

import type { ApiError } from "@/lib/api-contract";
import { requireRole } from "@/lib/dal";
import { BLOG_ROLES, type AdminRole } from "@/lib/roles";

/**
 * Shared plumbing for the /api/v1/admin/blogs routes: the role gate, JSON body
 * parsing and the failure-reason → HTTP status map. Every route still calls
 * `blogSession()` itself, first, before touching anything else.
 */

export type BlogActor = { userId: string; email: string; role: AdminRole };

export async function blogSession(): Promise<
  { ok: true; actor: BlogActor } | { ok: false; response: NextResponse }
> {
  const session = await requireRole(...BLOG_ROLES);
  if (!session.ok) {
    const status = session.reason === "unauthenticated" ? 401 : 403;
    return {
      ok: false,
      response: NextResponse.json<ApiError>({ error: session.reason, message: session.message }, { status }),
    };
  }
  return { ok: true, actor: { userId: session.userId, email: session.email, role: session.role } };
}

export async function readJson(
  request: Request,
): Promise<{ ok: true; body: unknown } | { ok: false; response: NextResponse }> {
  try {
    return { ok: true, body: await request.json() };
  } catch {
    return {
      ok: false,
      response: NextResponse.json<ApiError>(
        { error: "invalid_body", message: "Expected a JSON body." },
        { status: 400 },
      ),
    };
  }
}

const STATUS: Record<string, number> = {
  not_found: 404,
  conflict: 409,
  invalid: 400,
  unconfigured: 503,
};

export function failureResponse(reason: string, message: string): NextResponse {
  return NextResponse.json<ApiError>({ error: reason, message }, { status: STATUS[reason] ?? 500 });
}
