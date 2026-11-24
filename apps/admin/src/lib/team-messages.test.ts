import { afterEach, describe, expect, it, vi } from "vitest";

type RpcCall = { schema: string; fn: string; args: Record<string, unknown> };

const holder = vi.hoisted(() => ({
  configured: true,
  calls: [] as { schema: string; fn: string; args: Record<string, unknown> }[],
  reply: { data: null as unknown, error: null as { code?: string; message?: string } | null },
}));

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({
    schema: (schema: string) => ({
      rpc: async (fn: string, args: Record<string, unknown>) => {
        holder.calls.push({ schema, fn, args });
        return holder.reply;
      },
    }),
  }),
}));
vi.mock("@/lib/supabase/reference", () => ({ isSupabaseConfigured: () => holder.configured }));

import {
  actOnTeamMessage,
  actOnWelcome,
  audienceParams,
  classifyError,
  listPlaceOptions,
  listTeamMessages,
  listWelcomes,
  previewAudience,
  sendTeamMessage,
  toTeamMessage,
} from "@/lib/team-messages";
import { teamErrorText, welcomeProblems } from "@/lib/team-messages-constants";
import { messageActionBodySchema, sendBodySchema } from "@/lib/team-messages-contract";

const ACTOR = "99999999-9999-9999-9999-999999999999";
const PET = "11111111-1111-1111-1111-111111111111";
const MSG = "22222222-2222-2222-2222-222222222222";

const lastCall = (): RpcCall => holder.calls.at(-1)!;

afterEach(() => {
  holder.configured = true;
  holder.calls = [];
  holder.reply = { data: null, error: null };
});

describe("audienceParams", () => {
  it("sends only the parameters each audience needs", () => {
    expect(audienceParams({ audience: "all" })).toEqual({ p_audience: "all" });
    expect(audienceParams({ audience: "pet", petIds: [PET] })).toEqual({ p_audience: "pet", p_pet_ids: [PET] });
    expect(audienceParams({ audience: "people", accountIds: [PET] })).toEqual({ p_audience: "people", p_account_ids: [PET] });
  });

  it("drops empty place lists and renames radiusKm to radius_km", () => {
    expect(audienceParams({ audience: "place", location: { countries: ["India"], states: [], cities: undefined } })).toEqual({
      p_audience: "place",
      p_location: { countries: ["India"] },
    });
    expect(audienceParams({ audience: "nearby", location: { lat: 11, lng: 76.9, radiusKm: 20 } })).toEqual({
      p_audience: "nearby",
      p_location: { lat: 11, lng: 76.9, radius_km: 20 },
    });
  });
});

describe("classifyError", () => {
  it("treats a bare backend code as a rejection staff can fix", () => {
    expect(classifyError({ code: "22023", message: "pets_required" })).toMatchObject({ reason: "rejected", code: "pets_required" });
  });

  it("reports a missing function as unavailable, not as a crash", () => {
    expect(classifyError({ code: "PGRST202", message: "Could not find the function" })).toMatchObject({ reason: "unavailable" });
  });

  it("keeps anything else as a failure with its message", () => {
    expect(classifyError({ code: "08006", message: "connection reset" })).toMatchObject({ reason: "failed", message: "connection reset" });
  });
});

describe("rpc calls", () => {
  it("always calls the chat schema with the actor id", async () => {
    holder.reply = { data: { pets: 120, accounts_without_pets: 15, skipped_pets: 2, skipped_people: 0 }, error: null };
    const result = await previewAudience({ audience: "all" }, ACTOR);
    expect(lastCall()).toMatchObject({ schema: "chat", fn: "team_admin_preview_audience", args: { p_actor_id: ACTOR } });
    expect(result).toEqual({ ok: true, data: { pets: 120, accountsWithoutPets: 15, skippedPets: 2, skippedPeople: 0 } });
  });

  it("passes the schedule time and leaves out an empty reason", async () => {
    holder.reply = { data: { id: MSG, state: "scheduled", send_at: "2026-12-01T03:30:00+00:00", pets: 1 }, error: null };
    const result = await sendTeamMessage({ audience: "all", body: "Hi", sendAt: "2026-12-01T09:00:00+05:30" }, ACTOR);
    expect(lastCall().args).toEqual({ p_audience: "all", p_body: "Hi", p_send_at: "2026-12-01T09:00:00+05:30", p_actor_id: ACTOR });
    expect(result).toMatchObject({ ok: true, data: { state: "scheduled", sendAt: "2026-12-01T03:30:00+00:00" } });
  });

  it("routes edit and delete to their own functions", async () => {
    holder.reply = { data: { state: "cancelled" }, error: null };
    await actOnTeamMessage(MSG, { action: "edit", body: "Fixed", reason: "Fixing a typo here" }, ACTOR);
    expect(lastCall()).toMatchObject({ fn: "team_admin_edit", args: { p_message_id: MSG, p_body: "Fixed" } });
    const result = await actOnTeamMessage(MSG, { action: "delete", reason: "Sent by mistake today" }, ACTOR);
    expect(lastCall().fn).toBe("team_admin_delete");
    expect(result).toEqual({ ok: true, data: { state: "cancelled" } });
  });

  it("never touches the network when Supabase is not configured", async () => {
    holder.configured = false;
    expect(await previewAudience({ audience: "all" }, ACTOR)).toMatchObject({ ok: false, reason: "unconfigured" });
    expect(holder.calls).toHaveLength(0);
  });
});

describe("listTeamMessages", () => {
  const row = (createdAt: string, extra: Record<string, unknown> = {}) => ({
    id: MSG, kind: "staff", state: "sent", body: "Hi", created_at: createdAt, pets: 3, accounts: 1, read_count: 2, ...extra,
  });

  it("offers a next page only when the page came back full", async () => {
    holder.reply = { data: [row("2026-11-02T00:00:00+00:00"), row("2026-11-01T00:00:00+00:00")], error: null };
    const full = await listTeamMessages({ limit: 2 }, ACTOR);
    expect(full).toMatchObject({ ok: true, data: { nextBefore: "2026-11-01T00:00:00+00:00" } });
    const short = await listTeamMessages({ limit: 50, state: "sent" }, ACTOR);
    expect(short).toMatchObject({ ok: true, data: { nextBefore: null } });
    expect(lastCall().args).toMatchObject({ p_state: "sent", p_limit: 50 });
  });

  it("offers edit and delete on real staff rows (kind 'staff', as Staging returns them)", () => {
    const staff = toTeamMessage(row("2026-11-24T00:00:00+00:00", { kind: "staff", audience: "pet", created_by_role: "moderator" }));
    expect(staff).toMatchObject({ kind: "staff", canEdit: true, canDelete: true });
    const petWelcome = toTeamMessage(row("2026-11-01T00:00:00+00:00", { kind: "pet_welcome", audience: null, created_by: null }));
    expect(petWelcome).toMatchObject({ canEdit: false, canDelete: false });
  });

  it("offers edit and delete only to kind 'staff', so an unknown future kind gets neither", () => {
    const future = toTeamMessage(row("2026-11-24T00:00:00+00:00", { kind: "system_notice", audience: "all" }));
    expect(future).toMatchObject({ canEdit: false, canDelete: false });
    const activeWelcome = toTeamMessage(row("2026-11-24T00:00:00+00:00", { kind: "welcome", state: "active", audience: null }));
    expect(activeWelcome).toMatchObject({ state: "active", canEdit: false, canDelete: false });
  });

  it("never offers edit or delete on welcome messages", () => {
    const welcome = toTeamMessage(row("2026-11-01T00:00:00+00:00", { kind: "welcome", audience: null }));
    expect(welcome).toMatchObject({ canEdit: false, canDelete: false, audience: null });
    const scheduled = toTeamMessage(row("2026-11-01T00:00:00+00:00", { state: "scheduled" }));
    expect(scheduled).toMatchObject({ canEdit: true, canDelete: true });
    const failed = toTeamMessage(row("2026-11-01T00:00:00+00:00", { state: "failed" }));
    expect(failed).toMatchObject({ canEdit: false, canDelete: true });
  });
});

describe("listPlaceOptions", () => {
  it("groups by level, most people first", async () => {
    holder.reply = {
      data: [
        { level: "city", value: "Chennai", people: 2 },
        { level: "city", value: "Coimbatore", people: 9 },
        { level: "country", value: "India", people: 20 },
        { level: "galaxy", value: "Milky Way", people: 1 },
      ],
      error: null,
    };
    const result = await listPlaceOptions(ACTOR);
    expect(result).toEqual({
      ok: true,
      data: {
        countries: [{ value: "India", people: 20 }],
        states: [],
        cities: [{ value: "Coimbatore", people: 9 }, { value: "Chennai", people: 2 }],
      },
    });
  });
});

describe("contract", () => {
  it("refuses a schedule time without a time zone", () => {
    expect(sendBodySchema.safeParse({ audience: "all", body: "Hi", sendAt: "2026-12-01T09:00:00" }).success).toBe(false);
    expect(sendBodySchema.safeParse({ audience: "all", body: "Hi", sendAt: "2026-12-01T09:00:00+05:30" }).success).toBe(true);
  });

  it("enforces the audience inputs before the database sees them", () => {
    expect(sendBodySchema.safeParse({ audience: "pet", petIds: [PET, PET], body: "Hi" }).success).toBe(false);
    expect(sendBodySchema.safeParse({ audience: "place", location: { countries: [] }, body: "Hi" }).success).toBe(false);
    expect(sendBodySchema.safeParse({ audience: "all", body: "   " }).success).toBe(false);
    expect(sendBodySchema.safeParse({ audience: "all", body: "x".repeat(2001) }).success).toBe(false);
  });

  it("requires a reason and an actual change to edit", () => {
    expect(messageActionBodySchema.safeParse({ action: "edit", reason: "Fixing a typo here" }).success).toBe(false);
    expect(messageActionBodySchema.safeParse({ action: "edit", body: "New", reason: "short" }).success).toBe(false);
    expect(messageActionBodySchema.safeParse({ action: "edit", body: "New", reason: "Fixing a typo here" }).success).toBe(true);
  });

  it("gives staff friendly text, and the raw code when it is unknown", () => {
    expect(teamErrorText("one_pet_only")).toBe("Choose exactly one pet for this option.");
    expect(teamErrorText("message_not_found")).toContain("(message_not_found)");
  });
});

describe("welcomeProblems", () => {
  it("mirrors the backend's placeholder rules for each welcome", () => {
    expect(welcomeProblems("welcome", "Hey {user_name}!")).toEqual([]);
    expect(welcomeProblems("welcome", "Welcome to MeetMyPets!")).toEqual(["user_name_missing"]);
    expect(welcomeProblems("welcome", "Hi {user_name}, meet {pet_name}")).toEqual(["pet_name_not_allowed"]);
    expect(welcomeProblems("pet_welcome", "Woohoo, {user_name}! {pet_name} is ready!")).toEqual([]);
    expect(welcomeProblems("pet_welcome", "Hi {user_name}, your pet is ready!")).toEqual(["pet_name_missing"]);
    expect(welcomeProblems("pet_welcome", "   ")).toEqual(["body_empty", "user_name_missing", "pet_name_missing"]);
    expect(welcomeProblems("welcome", `{user_name}${"x".repeat(2000)}`)).toContain("body_too_long");
  });
});

describe("welcome messages", () => {
  it("saves through team_admin_welcome_set and stops through team_admin_welcome_stop", async () => {
    holder.reply = { data: { id: MSG, kind: "pet_welcome", state: "active", previous_id: PET }, error: null };
    const saved = await actOnWelcome({ action: "set", kind: "pet_welcome", body: "Hi {user_name}, {pet_name}!" }, ACTOR);
    expect(lastCall()).toMatchObject({ schema: "chat", fn: "team_admin_welcome_set", args: { p_kind: "pet_welcome", p_body: "Hi {user_name}, {pet_name}!", p_actor_id: ACTOR } });
    expect(lastCall().args).not.toHaveProperty("p_reason");
    expect(saved).toEqual({ ok: true, data: { id: MSG, kind: "pet_welcome", state: "active", previousId: PET } });

    holder.reply = { data: { id: MSG, kind: "welcome", state: "retired" }, error: null };
    await actOnWelcome({ action: "stop", kind: "welcome", reason: "Rewriting the onboarding copy" }, ACTOR);
    expect(lastCall()).toMatchObject({ fn: "team_admin_welcome_stop", args: { p_kind: "welcome", p_reason: "Rewriting the onboarding copy" } });
    expect(lastCall().args).not.toHaveProperty("p_body");
  });

  it("turns the backend's welcome codes into staff-friendly text", async () => {
    holder.reply = { data: null, error: { code: "22023", message: "user_name_missing" } };
    const result = await actOnWelcome({ action: "set", kind: "welcome", body: "Hello!" }, ACTOR);
    expect(result).toMatchObject({ ok: false, reason: "rejected", code: "user_name_missing" });
    expect(teamErrorText("user_name_missing")).toContain("{user_name}");
    expect(teamErrorText("no_change")).toMatch(/Nothing changed/);
  });

  it("lists the active version per welcome and only welcome rows among retired ones, newest first", async () => {
    holder.reply = {
      data: [
        { id: "a", kind: "welcome", state: "active", body: "Hey {user_name}", created_at: "2026-11-01T00:00:00Z" },
        { id: "b", kind: "staff", state: "sent", body: "x", created_at: "2026-11-02T00:00:00Z" },
        { id: "c", kind: "pet_welcome", state: "retired", body: "old", created_at: "2026-10-01T00:00:00Z" },
        { id: "d", kind: "welcome", state: "retired", body: "older", created_at: "2026-11-03T00:00:00Z" },
      ],
      error: null,
    };
    const result = await listWelcomes(ACTOR);
    if (!result.ok) throw new Error("expected ok");
    expect(result.data.active.welcome?.id).toBe("a");
    // The mock answers both list calls with the same rows: the staff row is dropped, the rest sorted newest first.
    expect(result.data.retired.map((m) => m.id)).toEqual(["d", "a", "c"]);
    expect(holder.calls.map((c) => c.args.p_state)).toEqual(["active", "retired"]);
  });
});
