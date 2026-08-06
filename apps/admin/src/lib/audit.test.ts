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

import { listAuditLogs, writeAuditLog } from "@/lib/audit";
import type { AuditQuery } from "@/lib/audit-contract";

const ACTOR_ID = "99999999-9999-9999-9999-999999999999";
const TARGET_ID = "11111111-1111-1111-1111-111111111111";

const baseQuery: AuditQuery = {
  page: 1,
  pageSize: 25,
  q: undefined,
  action: "all",
  targetType: "all",
  from: undefined,
  to: undefined,
};

function setup(table: TableResult = {}) {
  holder.admin = makeSupabaseMock({ "public.admin_audit_logs": table });
  return holder.admin;
}

afterEach(() => {
  holder.admin = null;
  holder.configured = true;
});

const ROW = {
  id: "a1",
  created_at: "2026-08-06T10:00:00Z",
  actor_id: ACTOR_ID,
  actor_email: "mod@meetmypets.dev",
  actor_role: "moderator",
  action: "account.suspend",
  target_type: "account",
  target_id: TARGET_ID,
  reason: "Repeated harassment reports",
  metadata: { durationHours: 168 },
};

describe("writeAuditLog", () => {
  it("maps the entry onto snake_case columns and defaults metadata", async () => {
    const mock = setup();

    const result = await writeAuditLog({
      actorId: ACTOR_ID,
      actorEmail: "mod@meetmypets.dev",
      actorRole: "moderator",
      action: "pet.flag",
      targetType: "pet",
      targetId: TARGET_ID,
      reason: "Graphic imagery in photos",
    });

    expect(result).toEqual({ ok: true });
    const insert = mock.calls.find((c) => c.op === "insert");
    expect(insert?.values).toEqual({
      actor_id: ACTOR_ID,
      actor_email: "mod@meetmypets.dev",
      actor_role: "moderator",
      action: "pet.flag",
      target_type: "pet",
      target_id: TARGET_ID,
      reason: "Graphic imagery in photos",
      metadata: {},
    });
  });

  it("returns a failure message instead of throwing", async () => {
    setup({ error: { message: "disk full" } });
    const result = await writeAuditLog({
      actorId: ACTOR_ID,
      actorEmail: "mod@meetmypets.dev",
      actorRole: "moderator",
      action: "account.ban",
      targetType: "account",
      targetId: TARGET_ID,
      reason: "Fraudulent account",
    });
    expect(result).toEqual({ ok: false, message: "disk full" });
  });
});

describe("listAuditLogs", () => {
  it("returns unconfigured when env vars are missing", async () => {
    holder.configured = false;
    const result = await listAuditLogs(baseQuery);
    expect(result).toMatchObject({ ok: false, reason: "unconfigured" });
  });

  it("maps rows into the contract shape", async () => {
    setup({ rows: [ROW], count: 1 });

    const result = await listAuditLogs(baseQuery);
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.data.total).toBe(1);
    expect(result.data.items[0]).toEqual({
      id: "a1",
      createdAt: "2026-08-06T10:00:00Z",
      actorId: ACTOR_ID,
      actorEmail: "mod@meetmypets.dev",
      actorRole: "moderator",
      action: "account.suspend",
      targetType: "account",
      targetId: TARGET_ID,
      reason: "Repeated harassment reports",
      metadata: { durationHours: 168 },
    });
  });

  it("substitutes an empty object for null metadata", async () => {
    setup({ rows: [{ ...ROW, metadata: null }], count: 1 });
    const result = await listAuditLogs(baseQuery);
    expect(result.ok && result.data.items[0].metadata).toEqual({});
  });

  it("returns an empty page rather than failing when there are no rows", async () => {
    setup({ rows: [], count: 0 });
    const result = await listAuditLogs(baseQuery);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data).toEqual({ items: [], page: 1, pageSize: 25, total: 0 });
  });

  it("surfaces a query failure instead of throwing", async () => {
    setup({ error: { message: "boom" } });
    const result = await listAuditLogs(baseQuery);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.reason).toBe("query_failed");
    expect(result.message).toContain("boom");
  });

  it("computes the range offset from the page number", async () => {
    setup({ rows: [], count: 100 });
    const result = await listAuditLogs({ ...baseQuery, page: 3, pageSize: 10 });
    expect(result.ok && result.data.page).toBe(3);
    expect(result.ok && result.data.pageSize).toBe(10);
  });
});
