import { NextResponse } from "next/server";

import type { ApiError } from "@/lib/api-contract";
import { requireRole } from "@/lib/dal";
import { resolveAiDecision } from "@/lib/ai-moderation";
import { resolveAiDecisionSchema } from "@/lib/ai-moderation-contract";
import { REPORTS_ROLES } from "@/lib/roles";

export const dynamic = "force-dynamic";

/**
 * Record a moderator's verdict on an AI decision.
 *
 * Same allowlist as /reports: confirming or correcting the model is queue
 * hygiene, not a sanction. The punitive follow-ups (flag the pet, ban the
 * owner) live on /users and keep their own tighter role checks.
 *
 * 409 for `already_reviewed` — another moderator resolved the row between this
 * one opening the dialog and submitting it, which is a conflict rather than a
 * failure and the client re-fetches instead of showing an error.
 */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireRole(...REPORTS_ROLES);
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

  const parsed = resolveAiDecisionSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json<ApiError>(
      { error: "invalid_body", message: parsed.error.issues[0]?.message ?? "Invalid resolution." },
      { status: 400 },
    );
  }

  const { id } = await params;
  const result = await resolveAiDecision(id, parsed.data, {
    userId: session.userId,
    email: session.email,
    role: session.role,
  });

  if (!result.ok) {
    const status =
      result.reason === "not_found"
        ? 404
        : result.reason === "already_reviewed"
          ? 409
          : result.reason === "forbidden"
            ? 403
            : 500;
    return NextResponse.json<ApiError>(
      { error: result.reason, message: result.message },
      { status },
    );
  }

  // The consequences ride along so the client can state what happened rather
  // than implying it — a trust deduction that silently did not land would look
  // identical to one that did.
  return NextResponse.json({
    ok: true,
    finalDecision: result.finalDecision,
    contentHidden: result.contentHidden,
  });
}
