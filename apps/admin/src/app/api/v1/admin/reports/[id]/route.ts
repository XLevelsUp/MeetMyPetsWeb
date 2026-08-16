import { NextResponse } from "next/server";

import type { ApiError } from "@/lib/api-contract";
import { requireRole } from "@/lib/dal";
import { resolveReport } from "@/lib/reports";
import { resolveReportSchema } from "@/lib/reports-contract";
import { REPORTS_ROLES } from "@/lib/roles";

export const dynamic = "force-dynamic";

/**
 * Resolve a report. Unlike the user/pet action routes there is no second,
 * narrower per-action allowlist: resolving a report is queue hygiene, not a
 * sanction — the punitive follow-ups (flag the pet, ban the owner) live on
 * /users and keep their own tighter role checks.
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

  const parsed = resolveReportSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json<ApiError>(
      { error: "invalid_body", message: parsed.error.issues[0]?.message ?? "Invalid resolution." },
      { status: 400 },
    );
  }

  const { id } = await params;
  const { resolution, reason } = parsed.data;
  const result = await resolveReport(id, resolution, reason, {
    userId: session.userId,
    email: session.email,
    role: session.role,
  });

  if (!result.ok) {
    const status = result.reason === "not_found" ? 404 : 500;
    return NextResponse.json<ApiError>({ error: result.reason, message: result.message }, { status });
  }

  return NextResponse.json({ ok: true });
}
