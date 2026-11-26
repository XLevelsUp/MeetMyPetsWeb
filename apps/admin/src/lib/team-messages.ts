import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import { filterHistory, HISTORY_SCAN_LIMIT, paginate, senderOptions } from "@/lib/team-history";
import { isSupabaseConfigured } from "@/lib/supabase/reference";
import { isStaffKind, TEAM_AUDIENCES, TEAM_STATES, type TeamState } from "@/lib/team-messages-constants";
import type {
  ActionResult,
  AudienceCounts,
  AudienceInput,
  MessageActionRequest,
  PlaceOptionsResponse,
  SendRequest,
  SendResult,
  TeamHistoryQuery,
  TeamHistoryResponse,
  TeamMessage,
  WelcomeActionRequest,
  WelcomeActionResult,
  WelcomeListResponse,
} from "@/lib/team-messages-contract";

// Adapter for the backend's chat.team_admin_* RPCs; the database writes the audit rows itself.

export type TeamResult<T> =
  | { ok: true; data: T }
  | { ok: false; reason: "unconfigured" | "unavailable" | "rejected" | "failed"; code: string; message: string };

const FN = {
  preview: "team_admin_preview_audience",
  send: "team_admin_send",
  edit: "team_admin_edit",
  delete: "team_admin_delete",
  list: "team_admin_list",
  places: "team_admin_place_options",
  welcomeSet: "team_admin_welcome_set",
  welcomeStop: "team_admin_welcome_stop",
} as const;

type RpcError = { code?: string; message?: string } | null;

async function rpc(fn: (typeof FN)[keyof typeof FN], args: Record<string, unknown>) {
  return createAdminClient().schema("chat").rpc(fn, args) as unknown as Promise<{ data: unknown; error: RpcError }>;
}

function fail<T>(reason: "unconfigured" | "unavailable" | "rejected" | "failed", code: string, message: string): TeamResult<T> {
  return { ok: false, reason, code, message };
}

// The backend raises bare snake_case codes; anything else is an infrastructure failure.
export function classifyError<T>(error: NonNullable<RpcError>): TeamResult<T> {
  const message = error.message ?? "";
  if (error.code === "PGRST202") return fail("unavailable", "unavailable", "Team messages are not set up on this database yet.");
  if (/^[a-z_]+$/.test(message)) return fail("rejected", message, message);
  return fail("failed", error.code ?? "failed", message || "Unknown database error.");
}

async function call<T>(
  fn: (typeof FN)[keyof typeof FN],
  args: Record<string, unknown>,
  map: (data: unknown) => T,
): Promise<TeamResult<T>> {
  if (!isSupabaseConfigured()) return fail("unconfigured", "unconfigured", "Supabase env vars are not set.");
  try {
    const { data, error } = await rpc(fn, args);
    if (error) return classifyError(error);
    return { ok: true, data: map(data) };
  } catch (error) {
    return fail("failed", "failed", error instanceof Error ? error.message : "Unknown failure.");
  }
}

// Only the parameters the chosen audience needs are sent, as the guide asks.
export function audienceParams(input: AudienceInput): Record<string, unknown> {
  switch (input.audience) {
    case "all":
    case "no_pet":
      return { p_audience: input.audience };
    case "species":
      return { p_audience: input.audience, p_species_ids: input.speciesIds };
    case "pet":
    case "pets":
      return { p_audience: input.audience, p_pet_ids: input.petIds };
    case "people":
      return { p_audience: input.audience, p_account_ids: input.accountIds };
    case "place": {
      const location: Record<string, string[]> = {};
      for (const key of ["countries", "states", "cities"] as const) {
        if (input.location[key]?.length) location[key] = input.location[key];
      }
      return { p_audience: input.audience, p_location: location };
    }
    case "nearby":
      return {
        p_audience: input.audience,
        p_location: { lat: input.location.lat, lng: input.location.lng, radius_km: input.location.radiusKm },
      };
  }
}

type Row = Record<string, unknown>;

const str = (v: unknown): string | null => (typeof v === "string" ? v : null);
const num = (v: unknown): number => (typeof v === "number" && Number.isFinite(v) ? v : Number(v) || 0);
const ids = (v: unknown): string[] | null => (Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : null);
const state = (v: unknown): TeamState | null =>
  typeof v === "string" && (TEAM_STATES as readonly string[]).includes(v) ? (v as TeamState) : null;

function toCounts(row: Row): AudienceCounts {
  return {
    pets: num(row.pets),
    accountsWithoutPets: num(row.accounts_without_pets),
    skippedPets: num(row.skipped_pets),
    skippedPeople: num(row.skipped_people),
  };
}

export function toTeamMessage(row: Row): TeamMessage {
  const kind = str(row.kind) ?? "staff";
  const st = str(row.state) ?? "sent";
  const audience = str(row.audience);
  const location = row.location && typeof row.location === "object" && !Array.isArray(row.location) ? (row.location as Record<string, unknown>) : null;
  const isStaff = isStaffKind(kind);
  return {
    id: String(row.id),
    kind,
    state: st,
    body: str(row.body) ?? "",
    audience: audience && (TEAM_AUDIENCES as readonly string[]).includes(audience) ? (audience as TeamMessage["audience"]) : null,
    speciesIds: ids(row.species_ids),
    petIds: ids(row.pet_ids),
    accountIds: ids(row.account_ids),
    location,
    sendAt: str(row.send_at),
    sentAt: str(row.sent_at),
    createdAt: str(row.created_at) ?? "",
    createdBy: str(row.created_by),
    createdByEmail: str(row.created_by_email),
    createdByRole: str(row.created_by_role),
    editedAt: str(row.edited_at),
    deletedAt: str(row.deleted_at),
    failedReason: str(row.failed_reason),
    pets: num(row.pets),
    accounts: num(row.accounts),
    readCount: num(row.read_count),
    // Welcome messages are system-owned; the backend refuses edits to them anyway.
    canEdit: isStaff && (st === "scheduled" || st === "sent"),
    canDelete: isStaff && (st === "scheduled" || st === "sent" || st === "failed"),
  };
}

const asRow = (data: unknown): Row => (data && typeof data === "object" && !Array.isArray(data) ? (data as Row) : {});

export function previewAudience(input: AudienceInput, actorId: string) {
  return call<AudienceCounts>(FN.preview, { ...audienceParams(input), p_actor_id: actorId }, (d) => toCounts(asRow(d)));
}

export function sendTeamMessage(input: SendRequest, actorId: string) {
  const { body, sendAt, reason, ...audience } = input;
  const args: Record<string, unknown> = { ...audienceParams(audience as AudienceInput), p_body: body, p_actor_id: actorId };
  if (sendAt) args.p_send_at = sendAt;
  if (reason) args.p_reason = reason;
  return call<SendResult>(FN.send, args, (d) => {
    const row = asRow(d);
    return { ...toCounts(row), id: String(row.id ?? ""), state: state(row.state) ?? "sent", sendAt: str(row.send_at) };
  });
}

export function actOnTeamMessage(messageId: string, input: MessageActionRequest, actorId: string) {
  const args: Record<string, unknown> = { p_message_id: messageId, p_reason: input.reason, p_actor_id: actorId };
  if (input.action === "edit") {
    if (input.body !== undefined) args.p_body = input.body;
    if (input.sendAt !== undefined) args.p_send_at = input.sendAt;
  }
  return call<ActionResult>(input.action === "edit" ? FN.edit : FN.delete, args, (d) => ({ state: state(asRow(d).state) }));
}

// team_admin_list has no date filter or total count, so read the tab (newest first, 200 a call), then filter and page here.
export async function listTeamHistory(query: TeamHistoryQuery, actorId: string): Promise<TeamResult<TeamHistoryResponse>> {
  const batch = 200;
  const all: TeamMessage[] = [];
  let before: string | undefined;
  let truncated = false;
  for (;;) {
    const args: Record<string, unknown> = { p_actor_id: actorId, p_state: query.state, p_limit: batch };
    if (before) args.p_before = before;
    const res = await call(FN.list, args, (d) => (Array.isArray(d) ? (d as Row[]) : []).map(toTeamMessage));
    if (!res.ok) return res;
    all.push(...res.data);
    if (res.data.length < batch) break;
    if (all.length >= HISTORY_SCAN_LIMIT) {
      truncated = true;
      break;
    }
    before = res.data.at(-1)?.createdAt;
    if (!before) break;
  }
  const filtered = filterHistory(all, query);
  return { ok: true, data: { ...paginate(filtered, query.page, query.pageSize), truncated, senders: senderOptions(all) } };
}

export function listPlaceOptions(actorId: string) {
  return call<PlaceOptionsResponse>(FN.places, { p_actor_id: actorId }, (d) => {
    const out: PlaceOptionsResponse = { countries: [], states: [], cities: [] };
    const bucket = { country: out.countries, state: out.states, city: out.cities } as const;
    for (const row of Array.isArray(d) ? (d as Row[]) : []) {
      const target = bucket[str(row.level) as keyof typeof bucket];
      const value = str(row.value);
      if (target && value) target.push({ value, people: num(row.people) });
    }
    for (const list of [out.countries, out.states, out.cities]) list.sort((a, b) => b.people - a.people);
    return out;
  });
}

// Save a new welcome text (it becomes the active version) or stop one. Only reaches future sign-ups / new pets.
export function actOnWelcome(input: WelcomeActionRequest, actorId: string) {
  const args: Record<string, unknown> = { p_kind: input.kind, p_actor_id: actorId };
  if (input.action === "set") args.p_body = input.body;
  if (input.reason) args.p_reason = input.reason;
  return call<WelcomeActionResult>(input.action === "set" ? FN.welcomeSet : FN.welcomeStop, args, (d) => {
    const row = asRow(d);
    return {
      id: String(row.id ?? ""),
      kind: row.kind === "pet_welcome" ? "pet_welcome" : "welcome",
      state: str(row.state) ?? "",
      previousId: str(row.previous_id),
    };
  });
}

// The active version of each welcome (null = stopped) plus every retired version, newest first.
export async function listWelcomes(actorId: string): Promise<TeamResult<WelcomeListResponse>> {
  const welcomeRows = (d: unknown) =>
    (Array.isArray(d) ? (d as Row[]) : []).filter((r) => r.kind === "welcome" || r.kind === "pet_welcome").map(toTeamMessage);
  const [active, retired] = await Promise.all([
    call(FN.list, { p_actor_id: actorId, p_state: "active", p_limit: 50 }, welcomeRows),
    call(FN.list, { p_actor_id: actorId, p_state: "retired", p_limit: 200 }, welcomeRows),
  ]);
  if (!active.ok) return active;
  if (!retired.ok) return retired;
  const pick = (kind: string) => active.data.find((m) => m.kind === kind) ?? null;
  return {
    ok: true,
    data: {
      active: { welcome: pick("welcome"), pet_welcome: pick("pet_welcome") },
      retired: [...retired.data].sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    },
  };
}
