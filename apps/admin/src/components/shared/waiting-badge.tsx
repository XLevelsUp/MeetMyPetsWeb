import { Clock } from "lucide-react";

/**
 * How long a queue item has sat unresolved.
 *
 * Every review surface had the same blind spot: a count says how much work
 * there is, a date says when it arrived, and neither says "this has been
 * forgotten". Measured against the live database, reports had an item waiting
 * 94 days and verifications 127 — nobody knew until someone asked.
 *
 * One component so a day means the same colour on every page.
 */

/** Green under 3 days, amber under a week, red beyond. */
function tone(days: number) {
  if (days >= 7) return "border-rejected/30 bg-rejected-soft text-rejected-fg";
  if (days >= 3) return "border-waiting/30 bg-waiting-soft text-waiting-fg";
  return "border-approved/25 bg-approved-soft text-approved-fg";
}

/** Compact by design: these sit in a table cell beside five other badges. */
function label(days: number) {
  if (days < 1) return "today";
  if (days < 60) return `${days}d`;
  return `${Math.round(days / 30)}mo`;
}

export function waitingDays(since: string | null | undefined): number | null {
  if (!since) return null;
  const ms = Date.now() - new Date(since).getTime();
  if (Number.isNaN(ms)) return null;
  return Math.max(0, Math.round(ms / 86_400_000));
}

/** Renders nothing when `since` is absent — an unknown age must not read as "new". */
export function WaitingBadge({
  since,
  className = "",
}: {
  since: string | null | undefined;
  className?: string;
}) {
  const days = waitingDays(since);
  if (days === null) return null;

  return (
    <span
      title={days < 1 ? "Arrived today" : `Waiting ${days} day${days === 1 ? "" : "s"}`}
      className={`inline-flex items-center gap-1 rounded-full border px-1.5 py-px text-[0.6875rem] font-medium whitespace-nowrap ${tone(days)} ${className}`}
    >
      <Clock className="size-3 shrink-0" aria-hidden="true" />
      {label(days)}
    </span>
  );
}
