import { CalendarClock, CalendarX2 } from "lucide-react";

import { expiryState, formatDate } from "@/components/verifications/verification-format";
import { copy } from "@/config/admin";
import { COUNTDOWN_CLASSES, countdownLabel, daysLeft } from "@/lib/day-thresholds";

const t = copy.verifications.expiry;

/** A claimed expiry date on the shared countdown scale: red once lapsed or close, amber soon, green well ahead. */
export function ExpiryDate({ expiresAt }: { expiresAt: string | null }) {
  const tone = expiryState(expiresAt);
  // Null means "no stated expiry", not "expires now", which is also why these sort last.
  if (!expiresAt || !tone) return <span className="text-muted-foreground">—</span>;

  if (tone === "past") {
    return (
      <span className="flex items-center gap-1 text-destructive" title={t.expiredTitle}>
        <CalendarX2 className="size-3.5 shrink-0" aria-hidden="true" />
        {formatDate(expiresAt)}
      </span>
    );
  }

  return (
    <span
      className={`inline-flex w-fit items-center gap-1 rounded-md border px-1.5 py-0.5 font-medium whitespace-nowrap ${COUNTDOWN_CLASSES[tone]}`}
      title={t.leftTitle.replace("{left}", countdownLabel(daysLeft(expiresAt)))}
    >
      <CalendarClock className="size-3.5 shrink-0" aria-hidden="true" />
      {formatDate(expiresAt)}
      <span className="text-xs font-normal">· {countdownLabel(daysLeft(expiresAt))}</span>
    </span>
  );
}
