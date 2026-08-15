import { NextResponse } from "next/server";

import type { ApiError } from "@/lib/api-contract";
import { requireRole } from "@/lib/dal";
import { VERIFICATION_ROLES } from "@/lib/roles";
import { signDocument } from "@/lib/storage";
import { getCertificateDocumentRef } from "@/lib/verifications";

export const dynamic = "force-dynamic";

/**
 * Mints a short-lived signed URL for one certificate document.
 *
 * Separate from the list endpoint on purpose: the bucket is private and the
 * URLs are deliberately short-lived, so embedding them in a page of rows would
 * hand the reviewer a set of links that expire before they reach the third one.
 * This is called when an item is actually opened, and again if it goes stale.
 *
 * The URL grants anyone holding it read access to a private document until it
 * expires, so this route is role-gated exactly like the rest of the queue and
 * is never cached.
 */
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireRole(...VERIFICATION_ROLES);
  if (!session.ok) {
    const status = session.reason === "unauthenticated" ? 401 : 403;
    return NextResponse.json<ApiError>(
      { error: session.reason, message: session.message },
      { status },
    );
  }

  const { id } = await params;

  const ref = await getCertificateDocumentRef(id);
  if (!ref.ok) {
    const status = ref.reason === "not_found" ? 404 : 500;
    return NextResponse.json<ApiError>({ error: ref.reason, message: ref.message }, { status });
  }

  const signed = await signDocument(ref.data.filePath, ref.data.mimeType);
  if (!signed.ok) {
    const status = signed.reason === "not_found" ? 404 : 500;
    return NextResponse.json<ApiError>(
      { error: signed.reason, message: signed.message },
      { status },
    );
  }

  return NextResponse.json(signed.data, {
    // The payload contains a live credential for a private document; it must
    // never sit in a shared cache.
    headers: { "Cache-Control": "no-store, private" },
  });
}
