"use client";

import type { LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils";

export type QuickFilterTone = "neutral" | "approved" | "waiting" | "rejected" | "paused" | "muted" | "tempBan";

export type QuickFilter = {
  key: string;
  label: string;
  icon?: LucideIcon;
  tone: QuickFilterTone;
  active: boolean;
  onSelect: () => void;
};

// Resting and selected looks per tone; the panel's semantic tokens keep dark mode in step.
const TONES: Record<QuickFilterTone, { rest: string; on: string }> = {
  neutral: { rest: "border-border bg-muted/40 text-muted-foreground hover:bg-muted", on: "border-primary bg-primary text-primary-foreground" },
  approved: { rest: "border-approved/25 bg-approved-soft/60 text-approved-fg hover:bg-approved-soft", on: "border-approved bg-approved text-white dark:text-background" },
  waiting: { rest: "border-waiting/30 bg-waiting-soft/60 text-waiting-fg hover:bg-waiting-soft", on: "border-waiting bg-waiting text-white dark:text-background" },
  rejected: { rest: "border-rejected/30 bg-rejected-soft/60 text-rejected-fg hover:bg-rejected-soft", on: "border-rejected bg-rejected text-white dark:text-background" },
  paused: { rest: "border-purple-200/70 bg-purple-50/70 text-purple-800 hover:bg-purple-100 dark:border-purple-800/40 dark:bg-purple-950/30 dark:text-purple-300", on: "border-purple-600 bg-purple-600 text-white" },
  // Orange, matching the Trust page's temporary-ban badge, so it never reads as the same as a permanent ban.
  tempBan: { rest: "border-orange-200/70 bg-orange-50/70 text-orange-800 hover:bg-orange-100 dark:border-orange-800/40 dark:bg-orange-950/30 dark:text-orange-300", on: "border-orange-600 bg-orange-600 text-white" },
  muted: { rest: "border-border bg-muted/40 text-muted-foreground hover:bg-muted", on: "border-foreground/60 bg-foreground/80 text-background" },
};

/** One row of one-click filter chips, shared by the Users and Pets tabs so both look and behave the same. */
export function QuickFilters({ label, filters }: { label: string; filters: QuickFilter[] }) {
  return (
    <div role="group" aria-label={label} className="flex flex-wrap items-center gap-2 text-xs">
      <span className="font-medium text-muted-foreground">{label}:</span>
      {filters.map(({ key, label: text, icon: Icon, tone, active, onSelect }) => (
        <button
          key={key}
          type="button"
          aria-pressed={active}
          onClick={onSelect}
          className={cn(
            "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 font-medium transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
            active ? TONES[tone].on : TONES[tone].rest,
          )}
        >
          {Icon ? <Icon className="size-3.5 shrink-0" aria-hidden="true" /> : null}
          {text}
        </button>
      ))}
    </div>
  );
}
