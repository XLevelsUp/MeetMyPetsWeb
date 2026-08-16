import { NextResponse } from "next/server";

import type { ApiError } from "@/lib/api-contract";
import { requireRole } from "@/lib/dal";
import { TRUST_ROLES, USER_ACTION_ROLES } from "@/lib/roles";
import { banPetPermanently, getTrustLedger, restoreTrust } from "@/lib/trust";
import { trustActionSchema } from "@/lib/trust-contract";

export const dynamic = "force-dynamic";

/** The ledger is evidence — same audience as the queue itself. */
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireRole(...TRUST_ROLES);
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
 * Both actions are gated to super_admin.
 *
 * `restore` matches the house rule that reversal is narrower than the action it
 * reverses — and here the thing being reversed was decided by the backend's
 * automated engine, which is at least as consequential as overriding a human.
 * `ban` is the same allowlist (`USER_ACTION_ROLES.ban` is also super_admin), so
 * one check covers both; if those ever diverge, split them.
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

  const parsed = trustActionSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json<ApiError>(
      { error: "invalid_body", message: parsed.error.issues[0]?.message ?? "Invalid request." },
      { status: 400 },
    );
  }

  const { id } = await params;
  const actor = { userId: session.userId, email: session.email, role: session.role };
  const result =
    parsed.data.action === "ban"
      ? await banPetPermanently(id, parsed.data.reason, actor)
      : await restoreTrust(id, parsed.data.reason, actor);

  if (!result.ok) {
    const status = result.reason === "not_found" ? 404 : result.reason === "conflict" ? 409 : 500;
    return NextResponse.json<ApiError>({ error: result.reason, message: result.message }, { status });
  }

  return NextResponse.json({ ok: true });
}
