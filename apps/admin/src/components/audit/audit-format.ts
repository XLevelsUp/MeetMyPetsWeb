import { copy } from "@/config/admin";
import type { AuditAction } from "@/lib/audit-actions";

/** Shared formatting so the table row and the detail dialog never disagree. */

export function formatWhen(value: string): string {
  return new Date(value).toLocaleString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/**
 * The stored `action` is a plain string, so a row written by a newer build
 * than this one still renders — it falls back to the raw value rather than
 * showing a blank cell.
 */
export function actionLabel(action: string): string {
  const labels = copy.audit.actionLabels as Record<string, string>;
  return labels[action as AuditAction] ?? action;
}
