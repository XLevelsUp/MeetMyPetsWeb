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
  return labels[action as AuditAction] ?? teamActionLabel(action) ?? action;
}

// Team message actions are written by the backend, so newer verbs can appear before this build lists them.
export function isTeamAction(action: string): boolean {
  return /^(team_message|welcome|team_welcome)\./.test(action);
}

function teamActionLabel(action: string): string | null {
  if (!isTeamAction(action)) return null;
  const [subject, verb] = action.split(".");
  const words = copy.audit.teamActionWords;
  const s = (words.subjects as Record<string, string>)[subject];
  const v = (words.verbs as Record<string, string>)[verb ?? ""];
  return s && v ? `${s} ${v}` : null;
}

// Removing stays red and stopping stays amber, so the existing key keeps its meaning; reaching users is sky.
function teamActionTone(action: string): AuditTone {
  const verb = action.split(".")[1] ?? "";
  if (verb === "delete") return "restrict";
  if (verb === "cancel" || verb === "stop") return "caution";
  if (verb === "edit" || verb === "update") return "content";
  return "message";
}

export type AuditTone = "restrict" | "restore" | "caution" | "content" | "message" | "neutral";

// Every action must pick a colour: typed against AuditAction, so a new action fails to compile until it does.
const ACTION_TONES: Record<AuditAction, AuditTone> = {
  "account.suspend": "restrict",
  "account.ban": "restrict",
  "account.restore": "restore",
  "pet.flag": "restrict",
  "pet.unflag": "restore",
  "report.review": "neutral",
  "report.action": "restrict",
  "report.dismiss": "restore",
  "certificate.approve": "restore",
  "certificate.reject": "restrict",
  "species.create": "content",
  "species.update": "content",
  "breed.create": "content",
  "breed.update": "content",
  "trust.restore": "restore",
  "trust.ban": "restrict",
  "blog.create": "content",
  "blog.update": "content",
  "blog.publish": "restore",
  "blog.unpublish": "caution",
  "blog.delete": "restrict",
  "blog_category.create": "content",
  "ai_decision.approve": "restore",
  "ai_decision.reject": "restrict",
  "team_message.send": "message",
  "team_message.schedule": "message",
};

/** Colour group for an action; an unknown action from a newer build reads as neutral (Team ones by their verb). */
export function actionTone(action: string): AuditTone {
  return ACTION_TONES[action as AuditAction] ?? (isTeamAction(action) ? teamActionTone(action) : "neutral");
}

/** Badge classes per group, on the panel's semantic tokens so dark mode follows. */
export const TONE_CLASSES: Record<AuditTone, string> = {
  restrict: "border-rejected/30 bg-rejected-soft text-rejected-fg",
  restore: "border-approved/25 bg-approved-soft text-approved-fg",
  caution: "border-waiting/30 bg-waiting-soft text-waiting-fg",
  content: "border-trust/25 bg-trust-soft text-trust-fg",
  // Sky, the hue Team messages already use for reaching users (Scheduled badge, pets, "later").
  message: "border-sky-300/70 bg-sky-50 text-sky-800 dark:border-sky-700/60 dark:bg-sky-950/40 dark:text-sky-300",
  neutral: "border-border bg-muted text-muted-foreground",
};

/** The small dot used in the legend and the action filter. */
export const TONE_DOT: Record<AuditTone, string> = {
  restrict: "bg-rejected",
  restore: "bg-approved",
  caution: "bg-waiting",
  content: "bg-trust",
  message: "bg-sky-500",
  neutral: "bg-muted-foreground",
};

export const TONE_ORDER: readonly AuditTone[] = ["restrict", "restore", "caution", "content", "message", "neutral"];

/** Readable target type ("Certificate"), falling back to the raw value for one this build does not know. */
export function targetTypeLabel(targetType: string): string {
  const labels = copy.audit.targetTypes as Record<string, string>;
  return labels[targetType] ?? targetType;
}
