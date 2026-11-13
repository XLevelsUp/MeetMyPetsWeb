import { copy } from "@/config/admin";
import {
  AI_REJECTION_LABELS,
  AI_REJECTION_SHORT,
  type AiRejectionCode,
} from "@/lib/ai-moderation-constants";

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

/** Read as plain strings: a value from a newer model renders raw rather than as a blank cell. */
export function decisionLabel(decision: string): string {
  const labels = copy.aiReports.decisionLabels as Record<string, string>;
  return labels[decision] ?? decision;
}

export function mediaLabel(mediaType: string): string {
  const labels = copy.aiReports.mediaLabels as Record<string, string>;
  return labels[mediaType] ?? mediaType;
}

/** The full sentence, for the dialog and the rejection picker. */
export function rejectionLabel(code: string | null): string {
  if (!code) return "—";
  return AI_REJECTION_LABELS[code as AiRejectionCode] ?? code;
}

/** The short form, for a table cell that cannot take a sentence. */
export function rejectionShort(code: string | null): string {
  if (!code) return "—";
  return AI_REJECTION_SHORT[code as AiRejectionCode] ?? code;
}

/** Scores are 0-100. Below 50 is a failure, 50-79 is a doubt, 80+ is clear. */
export function scoreTone(score: number | null): "bad" | "warn" | "good" | "none" {
  if (score === null) return "none";
  if (score < 50) return "bad";
  if (score < 80) return "warn";
  return "good";
}

export function formatScore(score: number | null): string {
  return score === null ? "—" : score.toFixed(0);
}

export function formatBytes(bytes: number | null): string {
  if (bytes === null) return "—";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
