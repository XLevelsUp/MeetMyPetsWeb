import { NextResponse } from "next/server";

import type { ApiError } from "@/lib/api-contract";
import { requireRole } from "@/lib/dal";
import { VERIFICATION_ROLES } from "@/lib/roles";
import { decideCertificate } from "@/lib/verifications";
import { decideCertificateSchema } from "@/lib/verifications-contract";

export const dynamic = "force-dynamic";

/**
 * Approve or reject one certificate.
 *
 * ⚠️ An approval writes `status = 'approved'`, which fires the backend's
 * trust trigger and awards +500 to the pet. It is intentionally NOT reversible
 * from the panel — `decideCertificate` refuses anything already decided, so a
 * repeated POST cannot award trust twice.
 */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireRole(...VERIFICATION_ROLES);
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

  const parsed = decideCertificateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json<ApiError>(
      { error: "invalid_body", message: parsed.error.issues[0]?.message ?? "Invalid decision." },
      { status: 400 },
    );
  }

  const { id } = await params;
  const actor = { userId: session.userId, email: session.email, role: session.role };
  const result =
    parsed.data.decision === "approve"
      ? await decideCertificate(id, "approve", parsed.data.reason, actor)
      : await decideCertificate(
          id,
          "reject",
          parsed.data.reason,
          actor,
          parsed.data.rejectionReason,
        );

  if (!result.ok) {
    const status =
      result.reason === "not_found" ? 404 : result.reason === "conflict" ? 409 : 500;
    return NextResponse.json<ApiError>({ error: result.reason, message: result.message }, { status });
  }

  return NextResponse.json({ ok: true });
}
