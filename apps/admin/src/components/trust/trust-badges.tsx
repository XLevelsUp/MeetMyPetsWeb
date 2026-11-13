"use client";

import {
  AlertTriangle,
  Ban,
  Clock,
  Shield,
  ShieldAlert,
  ShieldCheck,
} from "lucide-react";

import { calculateDaysOverdue, statusLabel } from "@/components/trust/trust-format";
import type { TrustStatus } from "@/lib/trust-constants";

/**
 * Trust Status Pill Badge
 * - Warning: Warm Amber (Score 100-250)
 * - Temporary Ban: Coral/Orange (Score 1-99)
 * - Permanent Ban: Deep Crimson (Score <= 0)
 * - Normal: Emerald Green (Score > 250)
 */
export function TrustStatusBadge({
  status,
  className = "",
}: {
  status: TrustStatus | string;
  className?: string;
}) {
  switch (status) {
    case "warning":
      return (
        <span
          className={`inline-flex items-center gap-1.5 rounded-full border border-amber-300 bg-amber-50 px-2.5 py-0.5 text-xs font-semibold text-amber-800 shadow-2xs dark:border-amber-700/60 dark:bg-amber-950/40 dark:text-amber-300 ${className}`}
        >
          <AlertTriangle className="size-3.5 shrink-0 text-amber-600 dark:text-amber-400" aria-hidden="true" />
          {statusLabel(status)}
        </span>
      );
    case "temporary_banned":
      return (
        <span
          className={`inline-flex items-center gap-1.5 rounded-full border border-orange-300 bg-orange-50 px-2.5 py-0.5 text-xs font-semibold text-orange-800 shadow-2xs dark:border-orange-700/60 dark:bg-orange-950/40 dark:text-orange-300 ${className}`}
        >
          <Clock className="size-3.5 shrink-0 text-orange-600 dark:text-orange-400" aria-hidden="true" />
          {statusLabel(status)}
        </span>
      );
    case "permanently_banned":
      return (
        <span
          className={`inline-flex items-center gap-1.5 rounded-full border border-rose-300 bg-rose-50 px-2.5 py-0.5 text-xs font-semibold text-rose-800 shadow-2xs dark:border-rose-700/60 dark:bg-rose-950/40 dark:text-rose-300 ${className}`}
        >
          <Ban className="size-3.5 shrink-0 text-rose-600 dark:text-rose-400" aria-hidden="true" />
          {statusLabel(status)}
        </span>
      );
    case "normal":
    default:
      return (
        <span
          className={`inline-flex items-center gap-1.5 rounded-full border border-emerald-300 bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-800 shadow-2xs dark:border-emerald-700/60 dark:bg-emerald-950/40 dark:text-emerald-300 ${className}`}
        >
          <ShieldCheck className="size-3.5 shrink-0 text-emerald-600 dark:text-emerald-400" aria-hidden="true" />
          {statusLabel(status)}
        </span>
      );
  }
}

/**
 * Trust Score Meter Badge
 * Visual indicator with Shield icon color-coded based on the platform trust thresholds.
 */
export function TrustScoreBadge({
  score,
  className = "",
}: {
  score: number;
  className?: string;
}) {
  let colorStyles = "border-emerald-200 bg-emerald-50/70 text-emerald-800 dark:border-emerald-800/40 dark:bg-emerald-950/30 dark:text-emerald-300";
  let ShieldIcon = ShieldCheck;

  if (score <= 0) {
    colorStyles = "border-rose-300 bg-rose-50 text-rose-800 dark:border-rose-800/60 dark:bg-rose-950/40 dark:text-rose-300";
    ShieldIcon = ShieldAlert;
  } else if (score < 100) {
    colorStyles = "border-orange-300 bg-orange-50 text-orange-800 dark:border-orange-800/60 dark:bg-orange-950/40 dark:text-orange-300";
    ShieldIcon = ShieldAlert;
  } else if (score <= 250) {
    colorStyles = "border-amber-300 bg-amber-50 text-amber-800 dark:border-amber-800/60 dark:bg-amber-950/40 dark:text-amber-300";
    ShieldIcon = Shield;
  }

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs font-semibold tabular-nums shadow-2xs ${colorStyles} ${className}`}
      title={`Trust score: ${score}`}
    >
      <ShieldIcon className="size-3.5 shrink-0" aria-hidden="true" />
      <span>{score}</span>
    </span>
  );
}

/**
 * Overdue Review Alert Badge
 */
export function TrustOverdueBadge({
  dueAt,
  className = "",
}: {
  dueAt: string | null;
  className?: string;
}) {
  if (!dueAt) return null;
  const days = calculateDaysOverdue(dueAt);

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border border-rose-300 bg-rose-100 px-2.5 py-0.5 text-xs font-semibold text-rose-900 shadow-2xs dark:border-rose-700 dark:bg-rose-950/80 dark:text-rose-200 ${className}`}
    >
      <AlertTriangle className="size-3 shrink-0 text-rose-600 dark:text-rose-400" aria-hidden="true" />
      Overdue by {days}d
    </span>
  );
}
