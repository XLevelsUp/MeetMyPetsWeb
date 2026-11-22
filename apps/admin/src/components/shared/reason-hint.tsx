import { copy } from "@/config/admin";
import { REASON_MIN_LENGTH } from "@/lib/contract-shared";

/** Says why the decision buttons are still disabled, with a live count; renders nothing once the reason is long enough. */
export function ReasonHint({ id, reason }: { id?: string; reason: string }) {
  const count = reason.trim().length;
  if (count >= REASON_MIN_LENGTH) return null;
  return (
    <p id={id} aria-live="polite" className="text-xs text-muted-foreground tabular-nums">
      {copy.common.reasonHint.replace("{count}", String(count)).replace("{min}", String(REASON_MIN_LENGTH))}
    </p>
  );
}
