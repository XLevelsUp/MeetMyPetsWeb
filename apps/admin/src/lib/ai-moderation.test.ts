import { beforeEach, describe, expect, it, vi } from "vitest";

import { makeSupabaseMock, type SupabaseMock, type TableResult } from "@/test/supabase-mock";

const holder = vi.hoisted(() => ({
  admin: null as SupabaseMock | null,
  configured: true,
}));

vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: () => holder.admin }));
vi.mock("@/lib/supabase/reference", () => ({ isSupabaseConfigured: () => holder.configured }));
vi.mock("@/lib/audit", () => ({ writeAuditLog: async () => ({ ok: true }) }));

import { resolveAiDecision } from "@/lib/ai-moderation";

const ID = "33333333-3333-4333-8333-333333333333";
const MEDIA = "44444444-4444-4444-8444-444444444444";
const PET = "55555555-5555-4555-8555-555555555555";
const ACTOR = { userId: "99999999-9999-4999-8999-999999999999", email: "mod@meetmypets.dev", role: "moderator" as const };

const decision = (overrides: Record<string, unknown> = {}) => ({
  id: ID,
  review_status: "pending",
  media_type: "pet_media",
  media_id: MEDIA,
  pet_id: PET,
  decision: "APPROVED",
  rejection_code: null,
  ai_generated: false,
  ...overrides,
});

function setup(tables: Record<string, TableResult>) {
  holder.admin = makeSupabaseMock(tables);
  return holder.admin;
}

const body = (overrides: Record<string, unknown> = {}) => ({
  aiWasRight: true,
  wrongReason: null,
  finalRejectionCode: null,
  isAiGenerated: false,
  ...overrides,
});

beforeEach(() => {
  holder.configured = true;
});

describe("resolveAiDecision — rejection code", () => {
  it("falls back to a default when a block has no code to inherit", async () => {
    const db = setup({
      // HUMAN_REVIEW with no rejection_code: agreeing blocks the post, and the
      // database refuses a block without a code.
      "moderation.decisions#select": { single: decision({ decision: "HUMAN_REVIEW", rejection_code: null }) },
      "moderation.decisions#update": { rows: [{ id: ID }] },
      "pets.pet_media#update": { rows: [{ id: MEDIA }] },
    });

    await resolveAiDecision(ID, body({ aiWasRight: true }), ACTOR);

    const write = db.calls.find((c) => c.op === "update" && c.key === "moderation.decisions");
    expect(write?.values).toMatchObject({ final_decision: "REJECTED", final_rejection_code: "MOD_007" });
  });

  it("prefers the moderator's code over the default", async () => {
    const db = setup({
      "moderation.decisions#select": { single: decision({ decision: "HUMAN_REVIEW", rejection_code: null }) },
      "moderation.decisions#update": { rows: [{ id: ID }] },
      "pets.pet_media#update": { rows: [{ id: MEDIA }] },
    });

    await resolveAiDecision(ID, body({ aiWasRight: true, finalRejectionCode: "MOD_004" }), ACTOR);

    const write = db.calls.find((c) => c.op === "update" && c.key === "moderation.decisions");
    expect(write?.values).toMatchObject({ final_rejection_code: "MOD_004" });
  });

  it("inherits the AI's own code when there is one", async () => {
    const db = setup({
      "moderation.decisions#select": { single: decision({ decision: "REJECTED", rejection_code: "MOD_002" }) },
      "moderation.decisions#update": { rows: [{ id: ID }] },
      "pets.pet_media#update": { rows: [{ id: MEDIA }] },
    });

    await resolveAiDecision(ID, body({ aiWasRight: true }), ACTOR);

    const write = db.calls.find((c) => c.op === "update" && c.key === "moderation.decisions");
    expect(write?.values).toMatchObject({ final_rejection_code: "MOD_002" });
  });

  it("sends no code when the post ends up published", async () => {
    const db = setup({
      "moderation.decisions#select": { single: decision({ decision: "APPROVED", rejection_code: null }) },
      "moderation.decisions#update": { rows: [{ id: ID }] },
      "pets.pet_media#update": { rows: [{ id: MEDIA }] },
    });

    await resolveAiDecision(ID, body({ aiWasRight: true }), ACTOR);

    const write = db.calls.find((c) => c.op === "update" && c.key === "moderation.decisions");
    expect(write?.values).toMatchObject({ final_decision: "APPROVED", final_rejection_code: null });
  });
});

describe("resolveAiDecision — half-landed saves", () => {
  it("reports contentHidden false when the photo write fails", async () => {
    setup({
      "moderation.decisions#select": { single: decision() },
      "moderation.decisions#update": { rows: [{ id: ID }] },
      "pets.pet_media#update": { error: { message: "permission denied for column is_ai_generated" } },
    });

    const result = await resolveAiDecision(ID, body(), ACTOR);

    // The decision is durable even when the post did not move: the UI warns
    // rather than reporting a clean success.
    expect(result).toMatchObject({ ok: true, contentHidden: false });
  });

  it("reports contentHidden true when both writes land", async () => {
    setup({
      "moderation.decisions#select": { single: decision() },
      "moderation.decisions#update": { rows: [{ id: ID }] },
      "pets.pet_media#update": { rows: [{ id: MEDIA }] },
    });

    const result = await resolveAiDecision(ID, body(), ACTOR);

    expect(result).toMatchObject({ ok: true, contentHidden: true });
  });

  it("reports the failure for a profile photo too", async () => {
    setup({
      "moderation.decisions#select": { single: decision({ media_type: "pet_profile_photo" }) },
      "moderation.decisions#update": { rows: [{ id: ID }] },
      "pets.pets#update": { error: { message: "permission denied" } },
    });

    const result = await resolveAiDecision(ID, body(), ACTOR);

    expect(result).toMatchObject({ ok: true, contentHidden: false });
  });
});

describe("resolveAiDecision — error messages", () => {
  it("explains a missing-reason constraint instead of naming it", async () => {
    setup({
      "moderation.decisions#select": { single: decision() },
      "moderation.decisions#update": {
        error: { message: 'new row for relation "decisions" violates check constraint "decisions_final_rejected_has_code_check"' },
      },
    });

    const result = await resolveAiDecision(ID, body(), ACTOR);

    expect(result).toMatchObject({ ok: false, reason: "action_failed" });
    if (!result.ok) {
      expect(result.message).toBe("This item needs a reason before it can be blocked. Pick one and submit again.");
      expect(result.message).not.toMatch(/constraint|relation/);
    }
  });

  it("explains a permission failure in terms of what to do", async () => {
    setup({
      "moderation.decisions#select": { single: decision() },
      "moderation.decisions#update": { error: { message: "permission denied for column is_ai_generated (42501)" } },
    });

    const result = await resolveAiDecision(ID, body(), ACTOR);

    if (!result.ok) expect(result.message).toMatch(/not allowed to write this yet/);
  });

  it("keeps an unrecognised message rather than hiding the cause", async () => {
    setup({
      "moderation.decisions#select": { single: decision() },
      "moderation.decisions#update": { error: { message: "connection terminated unexpectedly" } },
    });

    const result = await resolveAiDecision(ID, body(), ACTOR);

    if (!result.ok) expect(result.message).toBe("connection terminated unexpectedly");
  });
});

describe("resolveAiDecision — AI-generated write-back", () => {
  it("writes the moderator's flag to pets.pet_media", async () => {
    const db = setup({
      "moderation.decisions#select": { single: decision() },
      "moderation.decisions#update": { rows: [{ id: ID }] },
      "pets.pet_media#update": { rows: [{ id: MEDIA }] },
    });

    await resolveAiDecision(ID, body({ isAiGenerated: true }), ACTOR);

    const write = db.calls.find((c) => c.op === "update" && c.key === "pets.pet_media");
    expect(write?.values).toMatchObject({ moderation_status: "approved", is_ai_generated: true });
  });

  it("writes to social.post_media for a post photo", async () => {
    const db = setup({
      "moderation.decisions#select": { single: decision({ media_type: "post_media" }) },
      "moderation.decisions#update": { rows: [{ id: ID }] },
      "social.post_media#update": { rows: [{ id: MEDIA }] },
    });

    await resolveAiDecision(ID, body({ isAiGenerated: true }), ACTOR);

    const write = db.calls.find((c) => c.op === "update" && c.key === "social.post_media");
    expect(write?.values).toMatchObject({ is_ai_generated: true });
  });

  it("writes the profile-photo column on pets.pets, not pet_media", async () => {
    const db = setup({
      "moderation.decisions#select": { single: decision({ media_type: "pet_profile_photo" }) },
      "moderation.decisions#update": { rows: [{ id: ID }] },
      "pets.pets#update": { rows: [{ id: MEDIA }] },
    });

    await resolveAiDecision(ID, body({ isAiGenerated: true }), ACTOR);

    const write = db.calls.find((c) => c.op === "update" && c.key === "pets.pets");
    expect(write?.values).toMatchObject({
      profile_photo_moderation_status: "approved",
      profile_photo_is_ai_generated: true,
    });
    expect(db.calls.some((c) => c.op === "update" && c.key === "pets.pet_media")).toBe(false);
  });

  it("records false when the moderator turns the flag off", async () => {
    const db = setup({
      "moderation.decisions#select": { single: decision({ ai_generated: true }) },
      "moderation.decisions#update": { rows: [{ id: ID }] },
      "pets.pet_media#update": { rows: [{ id: MEDIA }] },
    });

    await resolveAiDecision(ID, body({ isAiGenerated: false }), ACTOR);

    const write = db.calls.find((c) => c.op === "update" && c.key === "pets.pet_media");
    expect(write?.values).toMatchObject({ is_ai_generated: false });
  });

  it("never writes to moderation.decisions.ai_generated — the model's own answer is read-only", async () => {
    const db = setup({
      "moderation.decisions#select": { single: decision() },
      "moderation.decisions#update": { rows: [{ id: ID }] },
      "pets.pet_media#update": { rows: [{ id: MEDIA }] },
    });

    await resolveAiDecision(ID, body({ isAiGenerated: true }), ACTOR);

    const write = db.calls.find((c) => c.op === "update" && c.key === "moderation.decisions");
    expect(write?.values).not.toHaveProperty("ai_generated");
  });
});
