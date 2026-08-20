import { copy } from "@/config/admin";
import type { TrustRevertPreview, TrustSignal } from "@/lib/reports-contract";

/** Shared formatting so the table row and the detail dialog never disagree. */

export function formatWhen(value: string | null): string {
  if (!value) return "—";
  return new Date(value).toLocaleString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/**
 * The stored values are CHECK-constrained by the backend, but they are read
 * here as plain strings: a row written by a newer backend than this build still
 * renders as its raw value rather than a blank cell.
 */
export function statusLabel(status: string): string {
  const labels = copy.reports.statusLabels as Record<string, string>;
  return labels[status] ?? status;
}

export function reasonLabel(reason: string): string {
  const labels = copy.reports.reasonLabels as Record<string, string>;
  return labels[reason] ?? reason;
}

export function scopeLabel(scope: string): string {
  const labels = copy.reports.scopeLabels as Record<string, string>;
  return labels[scope] ?? scope;
}

export function trustLabel(status: TrustSignal["status"]): string {
  if (!status) return copy.reports.noTrustScore;
  return copy.reports.trustLabels[status];
}

/** Pending is the only status that needs to pull the eye. */
export function statusVariant(status: string): "default" | "secondary" | "outline" {
  if (status === "pending") return "default";
  if (status === "actioned") return "secondary";
  return "outline";
}

/**
 * What dismissing will do — or did do — to the pet's trust score.
 *
 * `tense` picks between the prediction shown in the dialog and the statement
 * shown after saving; every other outcome reads the same either way, because
 * "nothing happened" does not have a future tense worth distinguishing.
 */
export function revertMessage(
  revert: TrustRevertPreview,
  tense: "will" | "did" = "will",
): string {
  const messages = copy.reports.revert as Record<string, string>;
  if (revert.outcome === "reverted") {
    const template = tense === "did" ? messages.revertedDone : messages.reverted;
    return template
      .replace("{delta}", String(revert.delta ?? 0))
      .replace("{score}", String(revert.scoreAfter ?? 0));
  }
  return messages[revert.outcome] ?? revert.outcome;
}

/** Only a blocked or failed credit needs to pull the eye. */
export function revertTone(revert: TrustRevertPreview): "warn" | "muted" {
  return revert.outcome === "would_restore" ||
    revert.outcome === "failed" ||
    revert.outcome === "score_moved"
    ? "warn"
    : "muted";
}

/**
 * A sinking trust score is the signal worth surfacing, so only the bad states
 * get a loud badge — "normal" would otherwise colour most of the table.
 */
export function trustVariant(
  status: TrustSignal["status"],
): "destructive" | "secondary" | "outline" {
  if (status === "permanently_banned" || status === "temporary_banned") return "destructive";
  if (status === "warning") return "secondary";
  return "outline";
}
