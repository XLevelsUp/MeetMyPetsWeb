import { copy } from "@/config/admin";

/** Shared formatting so the queue row and the review pane never disagree. */

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

/** Dates in the claims are `date` columns, so no time component to show. */
export function formatDate(value: string | null): string | null {
  if (!value) return null;
  return new Date(value).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

/**
 * `pet_certificates.status` and `certificate_type` have NO check constraint, so
 * an unrecognised value is genuinely possible. Falling back to the raw string
 * keeps a surprise value visible instead of rendering an empty cell.
 */
export function statusLabel(status: string): string {
  const labels = copy.verifications.statusLabels as Record<string, string>;
  return labels[status] ?? status;
}

export function typeLabel(type: string): string {
  const labels = copy.verifications.typeLabels as Record<string, string>;
  return labels[type] ?? type;
}

export function rejectionLabel(reason: string): string {
  const labels = copy.verifications.rejectionLabels as Record<string, string>;
  return labels[reason] ?? reason;
}

export function statusVariant(status: string): "default" | "secondary" | "outline" {
  if (status === "pending") return "default";
  if (status === "approved") return "secondary";
  return "outline";
}

/** True for mime types the browser can render in an <img>. */
export function isImageMime(mimeType: string | null): boolean {
  return Boolean(mimeType?.startsWith("image/"));
}

export function isPdfMime(mimeType: string | null): boolean {
  return mimeType === "application/pdf";
}

/**
 * An expiry that has already passed is the single most common legitimate
 * reason to reject, so the review pane flags it rather than making the
 * moderator compare dates by eye.
 */
export function isExpired(expiresAt: string | null): boolean {
  if (!expiresAt) return false;
  return new Date(expiresAt).getTime() < Date.now();
}
