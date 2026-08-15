import { copy } from "@/config/admin";
import type { TrustStatus } from "@/lib/trust-constants";

/** Shared formatting so the queue row and the ledger never disagree. */

export function formatWhen(value: string | null): string {
  if (!value) return copy.trust.noReviewDate;
  return new Date(value).toLocaleString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function formatDate(value: string | null): string {
  if (!value) return copy.trust.noReviewDate;
  return new Date(value).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function statusLabel(status: string): string {
  const labels = copy.trust.statusLabels as Record<string, string>;
  return labels[status] ?? status;
}

/**
 * The ledger stores a raw reason string. An unrecognised one renders as-is
 * rather than disappearing — a newer backend reason should still show up in
 * the history a reviewer is judging on.
 */
export function eventLabel(reason: string): string {
  const labels = copy.trust.eventLabels as Record<string, string>;
  return labels[reason] ?? reason;
}

export function statusVariant(status: TrustStatus): "destructive" | "secondary" | "outline" {
  if (status === "permanently_banned" || status === "temporary_banned") return "destructive";
  if (status === "warning") return "secondary";
  return "outline";
}

/** Positive deltas read as gains, negative as losses — the sign carries meaning. */
export function formatDelta(delta: number): string {
  return delta > 0 ? `+${delta}` : String(delta);
}
