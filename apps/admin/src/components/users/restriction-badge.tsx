import { Archive, Ban, CheckCircle2, Flag, PauseCircle, Trash2, type LucideIcon } from "lucide-react";

import { copy } from "@/config/admin";
import type { Restriction } from "@/lib/users-contract";

type State = "active" | "archived" | "suspended" | "banned" | "blocked" | "deleted" | "flagged";

interface StyleDef {
  icon: LucideIcon;
  className: string;
  defaultLabel: string;
}

/**
 * Colour theory:
 * - Active:    slight green (healthy, active standing)
 * - Archived:  blue (neutral, preserved)
 * - Suspended: purple/amber (temporary hold/pause, distinct from red and green)
 * - Blocked / Banned / Rejected: red (hard restriction, moderation block)
 * - Deleted:   red (destructive state)
 * - Flagged:   amber (under observation)
 */
const STYLES: Record<State, StyleDef> = {
  active: {
    icon: CheckCircle2,
    className:
      "border-emerald-300/70 bg-emerald-50 text-emerald-800 dark:border-emerald-700/60 dark:bg-emerald-950/40 dark:text-emerald-300",
    defaultLabel: "Active",
  },
  archived: {
    icon: Archive,
    className:
      "border-blue-300/70 bg-blue-50 text-blue-800 dark:border-blue-700/60 dark:bg-blue-950/40 dark:text-blue-300",
    defaultLabel: "Archived",
  },
  suspended: {
    icon: PauseCircle,
    className:
      "border-purple-300/70 bg-purple-50 text-purple-800 dark:border-purple-700/60 dark:bg-purple-950/40 dark:text-purple-300",
    defaultLabel: "Suspended",
  },
  banned: {
    icon: Ban,
    className:
      "border-red-300/70 bg-red-50 text-red-800 dark:border-red-700/60 dark:bg-red-950/40 dark:text-red-300",
    defaultLabel: "Blocked",
  },
  blocked: {
    icon: Ban,
    className:
      "border-red-300/70 bg-red-50 text-red-800 dark:border-red-700/60 dark:bg-red-950/40 dark:text-red-300",
    defaultLabel: "Blocked",
  },
  deleted: {
    icon: Trash2,
    className:
      "border-red-300/70 bg-red-50 text-red-800 dark:border-red-700/60 dark:bg-red-950/40 dark:text-red-300",
    defaultLabel: "Deleted",
  },
  flagged: {
    icon: Flag,
    className:
      "border-red-300/70 bg-red-50 text-red-800 dark:border-red-700/60 dark:bg-red-950/40 dark:text-red-300",
    defaultLabel: "Flagged",
  },
};

/**
 * The account/pet's moderation state badge.
 */
export function RestrictionBadge({
  restriction,
  status,
  deletedAt,
}: {
  restriction: Restriction | null;
  status: string | null;
  /** Pass account.deletedAt to show the Deleted badge when the account is soft-deleted. */
  deletedAt?: string | null;
}) {
  const normStatus = status?.toLowerCase().trim();

  let state: State = "active";

  if (deletedAt || normStatus === "deleted") {
    state = "deleted";
  } else if (restriction) {
    if (restriction.kind === "banned") state = "blocked";
    else if (restriction.kind === "suspended") state = "suspended";
    else if (restriction.kind === "flagged") state = "flagged";
  } else if (normStatus === "archived") {
    state = "archived";
  } else if (normStatus === "blocked" || normStatus === "banned" || normStatus === "rejected") {
    state = "blocked";
  } else if (normStatus === "suspended") {
    state = "suspended";
  } else if (normStatus === "flagged") {
    state = "flagged";
  } else {
    state = "active";
  }

  const { icon: Icon, className, defaultLabel } = STYLES[state];

  const options = copy.users.statusOptions as Record<string, string>;
  const label = options[state] ?? defaultLabel;

  return (
    <span
      title={restriction?.reason}
      className={`inline-flex h-6 items-center gap-1.5 rounded-full border px-2.5 text-xs font-medium whitespace-nowrap select-none ${className}`}
    >
      <Icon className="size-3.5 shrink-0" aria-hidden="true" />
      <span>{label}</span>
    </span>
  );
}
