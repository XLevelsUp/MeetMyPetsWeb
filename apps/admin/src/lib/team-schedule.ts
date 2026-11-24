import { TEAM_MAX_SCHEDULE_DAYS } from "@/lib/team-messages-constants";

// Converts between <input type="datetime-local"> (browser-local, zoneless) and zoned ISO for the backend.

const pad = (n: number) => String(n).padStart(2, "0");

export function toLocalInput(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

// A datetime-local value parses as local time; toISOString then pins it to UTC with an explicit Z.
export function localInputToIso(value: string): string | null {
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(value)) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

export type TwelveHour = { date: string; hour: number; minute: number; period: "am" | "pm" };

// "2026-12-01T21:05" → { date: "2026-12-01", hour: 9, minute: 5, period: "pm" }. Midnight is 12 am, noon is 12 pm.
export function to12Hour(value: string): TwelveHour {
  const match = /^(\d{4}-\d{2}-\d{2})T(\d{2}):(\d{2})/.exec(value);
  if (!match) return { date: "", hour: 9, minute: 0, period: "am" };
  const h24 = Number(match[2]);
  return { date: match[1], hour: h24 % 12 === 0 ? 12 : h24 % 12, minute: Number(match[3]), period: h24 < 12 ? "am" : "pm" };
}

export function from12Hour({ date, hour, minute, period }: TwelveHour): string {
  if (!date) return "";
  const h24 = (hour % 12) + (period === "pm" ? 12 : 0);
  return `${date}T${pad(h24)}:${pad(minute)}`;
}

// Today, at the first 5-minute slot at least 30 minutes ahead (rolls into tomorrow late at night).
export function defaultSchedule(now: Date = new Date()): string {
  const step = 5 * 60_000;
  const at = new Date(Math.ceil((now.getTime() + 30 * 60_000) / step) * step);
  at.setSeconds(0, 0);
  return toLocalInput(at.toISOString());
}

export type ScheduleProblem = "missing" | "past" | "tooFar";

// One minute of headroom so a time picked "now" isn't already past when it reaches the database.
export function checkSchedule(value: string, now: Date = new Date()): ScheduleProblem | null {
  const iso = localInputToIso(value);
  if (!iso) return "missing";
  const at = new Date(iso).getTime();
  if (at <= now.getTime() + 60_000) return "past";
  if (at > now.getTime() + TEAM_MAX_SCHEDULE_DAYS * 86_400_000) return "tooFar";
  return null;
}

export function localZoneName(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone;
  } catch {
    return "local time";
  }
}
