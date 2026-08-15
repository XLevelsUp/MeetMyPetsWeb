import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import { isSupabaseConfigured } from "@/lib/supabase/reference";
import { writeAuditLog } from "@/lib/audit";
import type { AuditAction } from "@/lib/audit-actions";
import type { AdminRole } from "@/lib/roles";
import type {
  CertificateDecision,
  CertificateStatus,
  RejectionReason,
} from "@/lib/certificate-constants";
import type {
  CertificateSummary,
  CertificatesQuery,
  CertificatesResponse,
  VerificationLevel,
} from "@/lib/verifications-contract";

/**
 * Certificate verification queue adapter — the backend's
 * `pets.pet_certificates`.
 *
 * OWNERSHIP: not our table. The panel holds SELECT plus a column-scoped
 * `UPDATE (status, reviewed_by, reviewed_at, remarks)` (migration
 * 20260815000001) — Postgres rejects any attempt to touch `file_path`, the
 * owner's typed claims, or anything else on the row. No insert or delete path
 * exists here by construction.
 *
 * ⚠️ APPROVING MOVES THEIR TRUST ENGINE. Writing `status = 'approved'` fires
 * `pets.trust_on_certificate_verified`, which awards +500 to the pet. This is
 * the one place a panel action reaches into the trust engine, and it is
 * deliberate: it is the backend's own designed consequence of approval, not a
 * side effect. Verified live — an approval moved a pet 575 → 1075.
 *
 * ⚠️ There is NO OCR data in this database. The fields under `claims` are what
 * the owner typed at upload; there are no extracted values and no confidence
 * scores anywhere (verified across every schema, 2026-08-15). This review is a
 * human transcription check against the document, not an OCR diff.
 *
 * SHAPE: PostgREST cannot join across schemas, so a page of certificates fans
 * out into parallel lookups against `pets` and `identity`, merged through Maps
 * — the same pattern `reports.ts` and `users.ts` use.
 *
 * House adapter pattern: discriminated unions, never throws.
 */

export type VerificationsResult<T> =
  | { ok: true; data: T }
  | { ok: false; reason: "unconfigured" | "not_found" | "query_failed"; message: string };

/** `unaudited` means the certificate WAS decided but the audit write failed. */
export type VerificationActionResult =
  | { ok: true }
  | {
      ok: false;
      reason: "unconfigured" | "not_found" | "conflict" | "action_failed" | "unaudited";
      message: string;
    };

const TABLES = {
  certificates: { schema: "pets", table: "pet_certificates" },
  pets: { schema: "pets", table: "pets" },
  levels: { schema: "pets", table: "pet_verification_levels" },
  accounts: { schema: "identity", table: "accounts" },
} as const;

type TableRef = { schema: string; table: string };

type Actor = { userId: string; email: string; role: AdminRole };

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function client() {
  return createAdminClient();
}

function from(ref: TableRef) {
  return client().schema(ref.schema).from(ref.table);
}

/** See the identical note in `users.ts` — strip PostgREST `or=()` structure. */
function sanitizeSearch(term: string): string {
  return term.replace(/[,()"\\*]/g, "").trim();
}

// Deliberately one unbroken literal: supabase-js infers the row type from this
// string, and concatenating it degrades the result to GenericStringError[].
const CERTIFICATE_COLUMNS =
  "id,pet_id,certificate_type,certificate_number,issued_by,issued_at,expires_at,next_due_at,title,veterinarian,clinic_name,notes,status,reviewed_at,remarks,file_path,file_mime_type,created_at";

type CertificateRow = {
  id: string;
  pet_id: string;
  certificate_type: string;
  certificate_number: string | null;
  issued_by: string | null;
  issued_at: string | null;
  expires_at: string | null;
  next_due_at: string | null;
  title: string | null;
  veterinarian: string | null;
  clinic_name: string | null;
  notes: string | null;
  status: string;
  reviewed_at: string | null;
  remarks: string | null;
  file_path: string | null;
  file_mime_type: string | null;
  created_at: string | null;
};

type PetRow = { id: string; name: string | null; owner_account_id: string | null };

type LevelRow = {
  pet_id: string;
  level: number | null;
  level_code: string | null;
  ownership_verified: boolean | null;
  vaccination_verified: boolean | null;
  health_verified: boolean | null;
  breeding_verified: boolean | null;
};

async function petsById(ids: string[]): Promise<Map<string, PetRow>> {
  const map = new Map<string, PetRow>();
  if (ids.length === 0) return map;

  const { data, error } = await from(TABLES.pets)
    .select("id,name,owner_account_id")
    .in("id", ids);
  if (error) throw new Error(`pets.pets: ${error.message}`);

  for (const row of (data ?? []) as PetRow[]) map.set(row.id, row);
  return map;
}

async function ownerEmails(ids: string[]): Promise<Map<string, string | null>> {
  const map = new Map<string, string | null>();
  if (ids.length === 0) return map;

  const { data, error } = await from(TABLES.accounts).select("id,email").in("id", ids);
  if (error) throw new Error(`identity.accounts: ${error.message}`);

  for (const row of (data ?? []) as { id: string; email: string | null }[]) {
    map.set(row.id, row.email);
  }
  return map;
}

/** pet id → current badge. Read-only context; the panel never writes this. */
async function levelsByPet(ids: string[]): Promise<Map<string, VerificationLevel>> {
  const map = new Map<string, VerificationLevel>();
  if (ids.length === 0) return map;

  const { data, error } = await from(TABLES.levels)
    .select(
      "pet_id,level,level_code,ownership_verified,vaccination_verified,health_verified,breeding_verified",
    )
    .in("pet_id", ids);
  if (error) throw new Error(`pets.pet_verification_levels: ${error.message}`);

  for (const row of (data ?? []) as LevelRow[]) {
    map.set(row.pet_id, {
      level: row.level,
      levelCode: row.level_code,
      ownershipVerified: row.ownership_verified,
      vaccinationVerified: row.vaccination_verified,
      healthVerified: row.health_verified,
      breedingVerified: row.breeding_verified,
    });
  }
  return map;
}

function unique(values: string[]): string[] {
  return [...new Set(values)];
}

/* -------------------------------------------------------------------------
 * Read
 * ---------------------------------------------------------------------- */

export async function listCertificates(
  query: CertificatesQuery,
): Promise<VerificationsResult<CertificatesResponse>> {
  if (!isSupabaseConfigured()) {
    return { ok: false, reason: "unconfigured", message: "Supabase env vars are not set." };
  }

  try {
    const { page, pageSize, q, status, certificateType } = query;
    const offset = (page - 1) * pageSize;

    let request = from(TABLES.certificates).select(CERTIFICATE_COLUMNS, { count: "exact" });

    if (status !== "all") request = request.eq("status", status);
    if (certificateType !== "all") request = request.eq("certificate_type", certificateType);

    if (q) {
      const term = sanitizeSearch(q);
      if (term) {
        request = UUID_RE.test(term)
          ? request.or(`id.eq.${term},pet_id.eq.${term}`)
          : request.or(
              `certificate_number.ilike.*${term}*,veterinarian.ilike.*${term}*,clinic_name.ilike.*${term}*,title.ilike.*${term}*`,
            );
      }
    }

    // Oldest first: a review queue should surface what has waited longest,
    // the opposite of the audit log and the report queue.
    const { data, count, error } = await request
      .order("created_at", { ascending: true })
      .range(offset, offset + pageSize - 1);
    if (error) throw new Error(`pets.pet_certificates: ${error.message}`);

    const rows = (data ?? []) as CertificateRow[];
    if (rows.length === 0) {
      return { ok: true, data: { items: [], page, pageSize, total: count ?? 0 } };
    }

    const petIds = unique(rows.map((r) => r.pet_id));
    const [pets, levels] = await Promise.all([petsById(petIds), levelsByPet(petIds)]);

    // Owner emails need the pet lookup first, so this can't join the fan-out.
    const owners = await ownerEmails(
      unique(
        petIds.map((id) => pets.get(id)?.owner_account_id).filter((v): v is string => Boolean(v)),
      ),
    );

    const items: CertificateSummary[] = rows.map((row) => {
      const pet = pets.get(row.pet_id) ?? null;
      const ownerId = pet?.owner_account_id ?? null;

      return {
        id: row.id,
        status: row.status as CertificateStatus,
        certificateType: row.certificate_type,
        createdAt: row.created_at,

        petId: row.pet_id,
        petName: pet?.name ?? null,
        ownerAccountId: ownerId,
        ownerEmail: ownerId ? owners.get(ownerId) ?? null : null,

        claims: {
          title: row.title,
          certificateNumber: row.certificate_number,
          issuedBy: row.issued_by,
          issuedAt: row.issued_at,
          expiresAt: row.expires_at,
          nextDueAt: row.next_due_at,
          veterinarian: row.veterinarian,
          clinicName: row.clinic_name,
          notes: row.notes,
        },
        level: levels.get(row.pet_id) ?? null,

        hasDocument: Boolean(row.file_path?.trim()),
        mimeType: row.file_mime_type,

        reviewedAt: row.reviewed_at,
        remarks: row.remarks,
      };
    });

    return { ok: true, data: { items, page, pageSize, total: count ?? 0 } };
  } catch (error) {
    return {
      ok: false,
      reason: "query_failed",
      message: error instanceof Error ? error.message : "Unknown query failure.",
    };
  }
}

/** The storage path for one certificate, so the route can mint a signed URL. */
export async function getCertificateDocumentRef(
  certificateId: string,
): Promise<VerificationsResult<{ filePath: string | null; mimeType: string | null }>> {
  if (!isSupabaseConfigured()) {
    return { ok: false, reason: "unconfigured", message: "Supabase env vars are not set." };
  }
  if (!UUID_RE.test(certificateId)) {
    return { ok: false, reason: "not_found", message: "No certificate with that id." };
  }

  try {
    const { data, error } = await from(TABLES.certificates)
      .select("file_path,file_mime_type")
      .eq("id", certificateId)
      .maybeSingle();
    if (error) throw new Error(`pets.pet_certificates: ${error.message}`);
    if (!data) return { ok: false, reason: "not_found", message: "No certificate with that id." };

    const row = data as { file_path: string | null; file_mime_type: string | null };
    return { ok: true, data: { filePath: row.file_path, mimeType: row.file_mime_type } };
  } catch (error) {
    return {
      ok: false,
      reason: "query_failed",
      message: error instanceof Error ? error.message : "Unknown query failure.",
    };
  }
}

/* -------------------------------------------------------------------------
 * Decision
 *
 * status/remarks/reviewer write → audit row. A failed audit write returns
 * `unaudited` (the decision already happened, and on approval so did the +500)
 * rather than pretending nothing occurred — same contract as `users.ts` and
 * `reports.ts`.
 * ---------------------------------------------------------------------- */

const DECISION_ACTIONS: Record<CertificateDecision, AuditAction> = {
  approve: "certificate.approve",
  reject: "certificate.reject",
};

const DECISION_STATUS: Record<CertificateDecision, CertificateStatus> = {
  approve: "approved",
  reject: "rejected",
};

export async function decideCertificate(
  certificateId: string,
  decision: CertificateDecision,
  reason: string,
  actor: Actor,
  rejectionReason?: RejectionReason,
): Promise<VerificationActionResult> {
  if (!isSupabaseConfigured()) {
    return { ok: false, reason: "unconfigured", message: "Supabase env vars are not set." };
  }
  if (!UUID_RE.test(certificateId)) {
    return { ok: false, reason: "not_found", message: "No certificate with that id." };
  }

  try {
    const { data: existing, error: readError } = await from(TABLES.certificates)
      .select("id,status,pet_id,certificate_type")
      .eq("id", certificateId)
      .maybeSingle();
    if (readError) throw new Error(`pets.pet_certificates: ${readError.message}`);
    if (!existing) {
      return { ok: false, reason: "not_found", message: "No certificate with that id." };
    }

    const before = existing as {
      id: string;
      status: string;
      pet_id: string;
      certificate_type: string;
    };

    // Re-deciding is refused rather than silently re-run. Approving an already
    // approved certificate would be a no-op for the trigger (it tests
    // OLD.status IS DISTINCT FROM NEW.status), but approving one that was
    // rejected would award another +500 — so the guard is about trust, not
    // tidiness.
    if (before.status !== "pending") {
      return {
        ok: false,
        reason: "conflict",
        message: `This certificate was already ${before.status}. Reload the queue.`,
      };
    }

    const nextStatus = DECISION_STATUS[decision];

    // Only the four granted columns. `remarks` carries the structured
    // rejection reason so the owner-facing record says why, not just "rejected".
    const { data: updated, error: updateError } = await from(TABLES.certificates)
      .update({
        status: nextStatus,
        reviewed_by: actor.userId,
        reviewed_at: new Date().toISOString(),
        remarks: decision === "reject" ? `${rejectionReason}: ${reason}` : reason,
      })
      .eq("id", certificateId)
      // Guards against two moderators deciding the same row at once: the second
      // update matches zero rows instead of double-awarding trust.
      .eq("status", "pending")
      .select("id");
    if (updateError) throw new Error(`pets.pet_certificates: ${updateError.message}`);
    if ((updated ?? []).length === 0) {
      return {
        ok: false,
        reason: "conflict",
        message: "Someone else decided this certificate first. Reload the queue.",
      };
    }

    const result = await writeAuditLog({
      actorId: actor.userId,
      actorEmail: actor.email,
      actorRole: actor.role,
      action: DECISION_ACTIONS[decision],
      targetType: "certificate",
      targetId: certificateId,
      reason,
      metadata: {
        previousStatus: before.status,
        newStatus: nextStatus,
        petId: before.pet_id,
        certificateType: before.certificate_type,
        ...(decision === "reject" ? { rejectionReason } : {}),
        // Records that this approval moved the backend's trust engine, so the
        // +500 is traceable from the audit trail rather than only the ledger.
        ...(decision === "approve" ? { trustAwarded: true, trustDelta: 500 } : {}),
      },
    });
    if (!result.ok) {
      return {
        ok: false,
        reason: "unaudited",
        message: `Certificate ${nextStatus}, but the audit write failed: ${result.message}`,
      };
    }

    return { ok: true };
  } catch (error) {
    return {
      ok: false,
      reason: "action_failed",
      message: error instanceof Error ? error.message : "Unknown action failure.",
    };
  }
}
