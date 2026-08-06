import { NextResponse } from "next/server";

import type { ApiError } from "@/lib/api-contract";
import { requireRole } from "@/lib/dal";
import { USERS_VIEW_ROLES, USER_ACTION_ROLES } from "@/lib/roles";
import { flagPet, unflagPet } from "@/lib/users";
import { petActionSchema } from "@/lib/users-contract";

export const dynamic = "force-dynamic";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireRole(...USERS_VIEW_ROLES);
  if (!session.ok) {
    const status = session.reason === "unauthenticated" ? 401 : 403;
    return NextResponse.json<ApiError>(
      { error: session.reason, message: session.message },
      { status },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json<ApiError>(
      { error: "invalid_body", message: "Expected a JSON body." },
      { status: 400 },
    );
  }

  const parsed = petActionSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json<ApiError>(
      { error: "invalid_body", message: parsed.error.issues[0]?.message ?? "Invalid action." },
      { status: 400 },
    );
  }

  const { action, reason } = parsed.data;
  if (!USER_ACTION_ROLES[action].includes(session.role)) {
    return NextResponse.json<ApiError>(
      { error: "forbidden", message: `Your role cannot perform "${action}".` },
      { status: 403 },
    );
  }

  const { id } = await params;
  const actor = { userId: session.userId, email: session.email, role: session.role };
  const result = action === "flag" ? await flagPet(id, reason, actor) : await unflagPet(id, reason, actor);

  if (!result.ok) {
    const status = result.reason === "not_found" ? 404 : 500;
    return NextResponse.json<ApiError>(
      { error: result.reason, message: result.message },
      { status },
    );
  }

  return NextResponse.json({ ok: true });
}
