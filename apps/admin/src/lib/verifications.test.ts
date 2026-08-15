import { afterEach, describe, expect, it, vi } from "vitest";

import { makeSupabaseMock, type SupabaseMock, type TableResult } from "@/test/supabase-mock";

const holder = vi.hoisted(() => ({
  admin: null as SupabaseMock | null,
  configured: true,
}));

vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: () => holder.admin }));
vi.mock("@/lib/supabase/reference", () => ({
  createReferenceClient: () => holder.admin,
  isSupabaseConfigured: () => holder.configured,
}));

import { decideCertificate, listCertificates } from "@/lib/verifications";
import type { CertificatesQuery } from "@/lib/verifications-contract";

const CERT_ID = "11111111-1111-1111-1111-111111111111";
const PET_ID = "22222222-2222-2222-2222-222222222222";
const OWNER_ID = "33333333-3333-3333-3333-333333333333";
const ACTOR_ID = "99999999-9999-9999-9999-999999999999";

const ACTOR = { userId: ACTOR_ID, email: "mod@meetmypets.dev", role: "moderator" as const };

const baseQuery: CertificatesQuery = {
  page: 1,
  pageSize: 25,
  q: undefined,
  status: "pending",
  certificateType: "all",
};

const CERT_ROW = {
  id: CERT_ID,
  pet_id: PET_ID,
  certificate_type: "vaccination",
  certificate_number: "VAC-9931",
  issued_by: null,
  issued_at: "2026-01-10",
  expires_at: "2027-01-10",
  next_due_at: null,
  title: "Rabies booster",
  veterinarian: "Dr Rao",
  clinic_name: "Paws Clinic",
  notes: null,
  status: "pending",
  reviewed_at: null,
  remarks: null,
  file_path: "owner/pet/vaccination_1.jpg",
  file_mime_type: "image/jpeg",
  created_at: "2026-08-11T10:00:00Z",
};

const PET_ROWS = [{ id: PET_ID, name: "Biscuit", owner_account_id: OWNER_ID }];

const LEVEL_ROWS = [
  {
    pet_id: PET_ID,
    level: 1,
    level_code: "ownership_verified",
    ownership_verified: true,
    vaccination_verified: false,
    health_verified: false,
    breeding_verified: false,
  },
];

function setup(tables: Record<string, TableResult>) {
  holder.admin = makeSupabaseMock(tables);
  return holder.admin;
}

afterEach(() => {
  holder.admin = null;
  holder.configured = true;
});

describe("listCertificates", () => {
  it("returns unconfigured when env vars are missing", async () => {
    holder.configured = false;
    const result = await listCertificates(baseQuery);
    expect(result).toEqual({
      ok: false,
      reason: "unconfigured",
      message: "Supabase env vars are not set.",
    });
  });

  it("hydrates a certificate with pet, owner and verification level", async () => {
    setup({
      "pets.pet_certificates": { rows: [CERT_ROW], count: 1 },
      "pets.pets": { rows: PET_ROWS },
      "pets.pet_verification_levels": { rows: LEVEL_ROWS },
      "identity.accounts": { rows: [{ id: OWNER_ID, email: "owner@example.com" }] },
    });

    const result = await listCertificates(baseQuery);
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const [item] = result.data.items;
    expect(item.id).toBe(CERT_ID);
    expect(item.petName).toBe("Biscuit");
    expect(item.ownerEmail).toBe("owner@example.com");
    expect(item.hasDocument).toBe(true);
    expect(item.mimeType).toBe("image/jpeg");
    expect(item.claims.certificateNumber).toBe("VAC-9931");
    // Sparse fields stay null rather than becoming "" — the UI distinguishes
    // "not provided" from "provided but blank".
    expect(item.claims.issuedBy).toBeNull();
    expect(item.level?.levelCode).toBe("ownership_verified");
  });

  it("never leaks file_path to the client payload", async () => {
    setup({
      "pets.pet_certificates": { rows: [CERT_ROW], count: 1 },
      "pets.pets": { rows: PET_ROWS },
      "pets.pet_verification_levels": { rows: [] },
      "identity.accounts": { rows: [] },
    });

    const result = await listCertificates(baseQuery);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    // The storage path is an internal detail; the client asks for a signed URL
    // by certificate id instead.
    expect(JSON.stringify(result.data)).not.toContain("owner/pet/vaccination_1.jpg");
  });

  it("flags a certificate with no document attached", async () => {
    setup({
      "pets.pet_certificates": { rows: [{ ...CERT_ROW, file_path: null }], count: 1 },
      "pets.pets": { rows: PET_ROWS },
      "pets.pet_verification_levels": { rows: [] },
      "identity.accounts": { rows: [] },
    });

    const result = await listCertificates(baseQuery);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.items[0].hasDocument).toBe(false);
  });

  it("degrades gracefully when the pet or owner row is gone", async () => {
    setup({
      "pets.pet_certificates": { rows: [CERT_ROW], count: 1 },
      "pets.pets": { rows: [] },
      "pets.pet_verification_levels": { rows: [] },
      "identity.accounts": { rows: [] },
    });

    const result = await listCertificates(baseQuery);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const [item] = result.data.items;
    expect(item.petName).toBeNull();
    expect(item.ownerAccountId).toBeNull();
    expect(item.level).toBeNull();
  });

  it("skips the hydration fan-out when the page is empty", async () => {
    const mock = setup({ "pets.pet_certificates": { rows: [], count: 0 } });

    const result = await listCertificates(baseQuery);
    expect(result).toEqual({ ok: true, data: { items: [], page: 1, pageSize: 25, total: 0 } });
    expect(mock.calls.filter((c) => c.op === "select")).toHaveLength(1);
  });

  it("surfaces a query failure as query_failed rather than throwing", async () => {
    setup({ "pets.pet_certificates": { error: { message: "permission denied" } } });

    const result = await listCertificates(baseQuery);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.reason).toBe("query_failed");
    expect(result.message).toContain("permission denied");
  });
});

describe("decideCertificate", () => {
  function setupDecide(overrides: Record<string, TableResult> = {}) {
    return setup({
      "pets.pet_certificates#select": { single: { ...CERT_ROW } },
      "pets.pet_certificates#update": { rows: [{ id: CERT_ID }] },
      "public.admin_audit_logs": {},
      ...overrides,
    });
  }

  it("rejects a non-uuid id without touching the database", async () => {
    const mock = setupDecide();
    const result = await decideCertificate("nope", "approve", "Looks legitimate to me", ACTOR);
    expect(result).toEqual({
      ok: false,
      reason: "not_found",
      message: "No certificate with that id.",
    });
    expect(mock.calls).toHaveLength(0);
  });

  it("writes only the four granted columns on approval", async () => {
    const mock = setupDecide();

    const result = await decideCertificate(CERT_ID, "approve", "Vet and dates check out", ACTOR);
    expect(result).toEqual({ ok: true });

    const update = mock.calls.find((c) => c.op === "update")?.values as Record<string, unknown>;
    // The grant is column-scoped; anything wider would be rejected by Postgres.
    expect(Object.keys(update).sort()).toEqual(
      ["remarks", "reviewed_at", "reviewed_by", "status"].sort(),
    );
    expect(update.status).toBe("approved");
    expect(update.reviewed_by).toBe(ACTOR_ID);
  });

  it("uses 'approved', the value their trust trigger tests for", async () => {
    const mock = setupDecide();
    await decideCertificate(CERT_ID, "approve", "Vet and dates check out", ACTOR);
    const update = mock.calls.find((c) => c.op === "update")?.values as Record<string, unknown>;
    // Writing 'verified' here would silently fail to award trust — the trigger
    // tests `NEW.status = 'approved'`. This assertion is the guard.
    expect(update.status).toBe("approved");
    expect(update.status).not.toBe("verified");
  });

  it("records the trust award in the audit metadata on approval only", async () => {
    const approveMock = setupDecide();
    await decideCertificate(CERT_ID, "approve", "Vet and dates check out", ACTOR);
    const approveAudit = approveMock.calls.find((c) => c.op === "insert")?.values as Record<
      string,
      unknown
    >;
    expect(approveAudit.action).toBe("certificate.approve");
    expect(approveAudit.target_type).toBe("certificate");
    expect(approveAudit.metadata).toMatchObject({
      newStatus: "approved",
      petId: PET_ID,
      trustAwarded: true,
      trustDelta: 500,
    });

    const rejectMock = setupDecide();
    await decideCertificate(CERT_ID, "reject", "Scan is unreadable", ACTOR, "illegible");
    const rejectAudit = rejectMock.calls.find((c) => c.op === "insert")?.values as Record<
      string,
      unknown
    >;
    expect(rejectAudit.action).toBe("certificate.reject");
    expect(rejectAudit.metadata).toMatchObject({ newStatus: "rejected", rejectionReason: "illegible" });
    expect(rejectAudit.metadata).not.toHaveProperty("trustAwarded");
  });

  it("stores the structured rejection reason alongside the free text", async () => {
    const mock = setupDecide();
    await decideCertificate(CERT_ID, "reject", "Expiry was last year", ACTOR, "expired");
    const update = mock.calls.find((c) => c.op === "update")?.values as Record<string, unknown>;
    expect(update.status).toBe("rejected");
    expect(update.remarks).toBe("expired: Expiry was last year");
  });

  it("refuses to re-decide an already reviewed certificate", async () => {
    const mock = setupDecide({
      "pets.pet_certificates#select": { single: { ...CERT_ROW, status: "rejected" } },
    });

    const result = await decideCertificate(CERT_ID, "approve", "Changed my mind about this", ACTOR);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    // Approving a previously rejected certificate would award another +500.
    expect(result.reason).toBe("conflict");
    expect(mock.calls.some((c) => c.op === "update")).toBe(false);
  });

  it("reports a conflict when another moderator decided it first", async () => {
    setupDecide({ "pets.pet_certificates#update": { rows: [] } });

    const result = await decideCertificate(CERT_ID, "approve", "Vet and dates check out", ACTOR);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.reason).toBe("conflict");
  });

  it("reports `unaudited` when the decision landed but the audit write failed", async () => {
    setupDecide({ "public.admin_audit_logs": { error: { message: "audit table down" } } });

    const result = await decideCertificate(CERT_ID, "approve", "Vet and dates check out", ACTOR);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    // The certificate WAS approved and the +500 already fired — reporting a
    // plain failure would be a lie.
    expect(result.reason).toBe("unaudited");
    expect(result.message).toContain("audit table down");
  });

  it("surfaces an update failure as action_failed", async () => {
    setupDecide({
      "pets.pet_certificates#update": { error: { message: "permission denied for column file_path" } },
    });

    const result = await decideCertificate(CERT_ID, "approve", "Vet and dates check out", ACTOR);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.reason).toBe("action_failed");
  });
});
