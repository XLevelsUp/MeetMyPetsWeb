import { NextResponse } from "next/server";

import type { ApiError } from "@/lib/api-contract";
import { requireRole } from "@/lib/dal";
import { ANALYTICS_ROLES, USER_ACTION_ROLES } from "@/lib/roles";
import { getTrustLedger, restoreTrust } from "@/lib/trust";
import { restoreTrustSchema } from "@/lib/trust-contract";

export const dynamic = "force-dynamic";

/** The ledger is evidence — same audience as the queue itself. */
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireRole(...ANALYTICS_ROLES);
  if (!session.ok) {
    const status = session.reason === "unauthenticated" ? 401 : 403;
    return NextResponse.json<ApiError>(
      { error: session.reason, message: session.message },
      { status },
    );
  }

  const { id } = await params;
  const result = await getTrustLedger(id);
  if (!result.ok) {
    const status = result.reason === "not_found" ? 404 : 500;
    return NextResponse.json<ApiError>({ error: result.reason, message: result.message }, { status });
  }

  return NextResponse.json(result.data);
}

/**
 * Restoring is gated to `USER_ACTION_ROLES.restore` — super_admin only.
 *
 * That matches the existing house rule that reversal is narrower than the
 * action it reverses: a moderator can suspend but only a super_admin can
 * un-ban. Here the "action" was taken by the backend's automated engine, and
 * overriding an automatic ban is at least as consequential as overriding a
 * human one.
 */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireRole(...USER_ACTION_ROLES.restore);
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

  const parsed = restoreTrustSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json<ApiError>(
      { error: "invalid_body", message: parsed.error.issues[0]?.message ?? "Invalid request." },
      { status: 400 },
    );
  }

  const { id } = await params;
  const result = await restoreTrust(id, parsed.data.reason, {
    userId: session.userId,
    email: session.email,
    role: session.role,
  });

  if (!result.ok) {
    const status = result.reason === "not_found" ? 404 : result.reason === "conflict" ? 409 : 500;
    return NextResponse.json<ApiError>({ error: result.reason, message: result.message }, { status });
  }

  return NextResponse.json({ ok: true });
}
