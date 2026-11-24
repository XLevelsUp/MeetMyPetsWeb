import { copy } from "@/config/admin";

// Limits mirror the backend's chat.team_admin_* checks (team_messages_website_guide.md).
export const TEAM_BODY_MAX = 2000;
export const TEAM_REASON_MAX = 500;
export const TEAM_LIST_DEFAULT = 50;
export const TEAM_LIST_MAX = 200;
export const TEAM_MAX_SPECIES = 50;
export const TEAM_MAX_PETS = 1000;
export const TEAM_MAX_PEOPLE = 1000;
export const TEAM_MAX_PLACES_PER_LIST = 100;
export const TEAM_MAX_RADIUS_KM = 1000;
export const TEAM_MAX_SCHEDULE_DAYS = 365;

export const TEAM_AUDIENCES = ["all", "species", "pet", "pets", "no_pet", "people", "place", "nearby"] as const;
export type TeamAudience = (typeof TEAM_AUDIENCES)[number];

// Staff messages move through the first five; welcome versions are only ever "active" or "retired".
export const TEAM_STATES = ["scheduled", "sent", "cancelled", "deleted", "failed", "active", "retired"] as const;
export type TeamState = (typeof TEAM_STATES)[number];

// Backend-confirmed 2026-11-24: exactly these three; a new one would need a database change.
export const TEAM_KINDS = ["staff", "welcome", "pet_welcome"] as const;
export const WELCOME_KINDS = ["welcome", "pet_welcome"] as const;
export type WelcomeKind = (typeof WELCOME_KINDS)[number];

// Allow-list, as the backend asked: a future kind must never get Edit/Delete by accident.
export function isStaffKind(kind: string): boolean {
  return kind === "staff";
}

export const WELCOME_BODY_MAX = 2000;
export const PLACEHOLDERS = { userName: "{user_name}", petName: "{pet_name}" } as const;

export type WelcomeProblem = "body_empty" | "body_too_long" | "user_name_missing" | "pet_name_missing" | "pet_name_not_allowed";

// Mirrors the backend's checks so staff see the problem while typing, not after pressing Save.
export function welcomeProblems(kind: WelcomeKind, body: string): WelcomeProblem[] {
  const problems: WelcomeProblem[] = [];
  if (!body.trim()) problems.push("body_empty");
  if (body.length > WELCOME_BODY_MAX) problems.push("body_too_long");
  if (!body.includes(PLACEHOLDERS.userName)) problems.push("user_name_missing");
  const hasPet = body.includes(PLACEHOLDERS.petName);
  if (kind === "pet_welcome" && !hasPet) problems.push("pet_name_missing");
  if (kind === "welcome" && hasPet) problems.push("pet_name_not_allowed");
  return problems;
}

export const TEAM_ERROR_CODES = [
  "not_allowed",
  "actor_required",
  "bad_audience",
  "body_empty",
  "body_too_long",
  "species_required",
  "too_many_species",
  "unknown_species",
  "pets_required",
  "one_pet_only",
  "too_many_pets",
  "people_required",
  "too_many_people",
  "location_required",
  "bad_location",
  "too_many_places",
  "bad_kind",
  "user_name_missing",
  "pet_name_missing",
  "pet_name_not_allowed",
  "no_change",
  "no_active_welcome",
  "reason_too_long",
  "cannot_change_welcome",
] as const;
export type TeamErrorCode = (typeof TEAM_ERROR_CODES)[number];

export function isTeamErrorCode(value: string): value is TeamErrorCode {
  return (TEAM_ERROR_CODES as readonly string[]).includes(value);
}

// Unlisted codes still reach staff, with the raw code appended so it can be reported.
export function teamErrorText(code: string): string {
  if (isTeamErrorCode(code)) return copy.teamMessages.errors[code];
  return `${copy.teamMessages.errors.unknown} (${code})`;
}
