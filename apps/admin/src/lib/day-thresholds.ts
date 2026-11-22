// Global day thresholds for every dated badge in the admin — change a number here and all pages follow.
export const DAY_THRESHOLDS = {
  /** Days LEFT until a date (certificate expiry, ban end): red at or under `red`, amber at or under `amber`, else green. */
  countdown: { red: 3, amber: 10 },
  /** Days an item has WAITED for review: amber from `amber`, red from `red`. */
  waiting: { amber: 3, red: 7 },
} as const;

const DAY_MS = 86_400_000;

export type CountdownTone = "past" | "red" | "amber" | "green";

/** Colour for a date counting down: "past" once it has gone, then red, amber, green as it gets further away. */
export function countdownTone(target: string | null, now: number = Date.now()): CountdownTone | null {
  if (!target) return null;
  const at = new Date(target).getTime();
  if (Number.isNaN(at)) return null;
  if (at < now) return "past";
  const left = at - now;
  if (left <= DAY_THRESHOLDS.countdown.red * DAY_MS) return "red";
  if (left <= DAY_THRESHOLDS.countdown.amber * DAY_MS) return "amber";
  return "green";
}

/** Whole days left before a date, rounded up so tomorrow reads as 1; never negative. */
export function daysLeft(target: string, now: number = Date.now()): number {
  return Math.max(0, Math.ceil((new Date(target).getTime() - now) / DAY_MS));
}

/** Compact "time left" text for a badge: "today", "in 5d", or "in 4mo" past 60 days. */
export function countdownLabel(days: number): string {
  if (days < 1) return "today";
  if (days < 60) return `in ${days}d`;
  return `in ${Math.round(days / 30)}mo`;
}

/** Tailwind classes per countdown tone, shared so a red day looks the same on every page. */
export const COUNTDOWN_CLASSES: Record<CountdownTone, string> = {
  past: "border-rejected/30 bg-rejected-soft text-rejected-fg",
  red: "border-rejected/30 bg-rejected-soft text-rejected-fg",
  amber: "border-waiting/30 bg-waiting-soft text-waiting-fg",
  green: "border-approved/25 bg-approved-soft text-approved-fg",
};
