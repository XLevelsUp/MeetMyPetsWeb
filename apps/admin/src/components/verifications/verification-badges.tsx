import {
  Award,
  CheckCircle2,
  Clock,
  HeartPulse,
  Syringe,
  XCircle,
  FileText,
  type LucideIcon,
} from "lucide-react";

import { statusLabel, typeLabel } from "@/components/verifications/verification-format";

interface BadgeStyle {
  icon: LucideIcon;
  className: string;
}

/**
 * Status Color Theory:
 * - Approved: Emerald Green (verified standing, trust approved)
 * - Pending:  Amber / Orange (needs review, in review queue)
 * - Rejected: Crimson Red (denied, moderation rejection)
 */
const STATUS_STYLES: Record<string, BadgeStyle> = {
  approved: {
    icon: CheckCircle2,
    className:
      "border-emerald-300/80 bg-emerald-50 text-emerald-800 dark:border-emerald-700/60 dark:bg-emerald-950/40 dark:text-emerald-300",
  },
  pending: {
    icon: Clock,
    className:
      "border-amber-300/80 bg-amber-50 text-amber-800 dark:border-amber-700/60 dark:bg-amber-950/40 dark:text-amber-300",
  },
  rejected: {
    icon: XCircle,
    className:
      "border-red-300/80 bg-red-50 text-red-800 dark:border-red-700/60 dark:bg-red-950/40 dark:text-red-300",
  },
};

const DEFAULT_STATUS_STYLE: BadgeStyle = {
  icon: Clock,
  className:
    "border-muted bg-muted/60 text-muted-foreground",
};

export function CertificateStatusBadge({
  status,
  className = "",
}: {
  status: string;
  className?: string;
}) {
  const style = STATUS_STYLES[status] ?? DEFAULT_STATUS_STYLE;
  const Icon = style.icon;

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium whitespace-nowrap shadow-xs ${style.className} ${className}`}
    >
      <Icon className="size-3.5 shrink-0" aria-hidden="true" />
      <span>{statusLabel(status)}</span>
    </span>
  );
}

/**
 * Document Type Color Theory (differentiates strictly from Status colors):
 * - Health:      Blue (medical wellness, clear user preference)
 * - Vaccination: Purple (clinical immunisation, preventative medicine)
 * - License:     Teal (official accreditation, municipal badge)
 */
const TYPE_STYLES: Record<string, BadgeStyle> = {
  health: {
    icon: HeartPulse,
    className:
      "border-blue-300/80 bg-blue-50 text-blue-800 dark:border-blue-700/60 dark:bg-blue-950/40 dark:text-blue-300",
  },
  vaccination: {
    icon: Syringe,
    className:
      "border-purple-300/80 bg-purple-50 text-purple-800 dark:border-purple-700/60 dark:bg-purple-950/40 dark:text-purple-300",
  },
  license: {
    icon: Award,
    className:
      "border-teal-300/80 bg-teal-50 text-teal-800 dark:border-teal-700/60 dark:bg-teal-950/40 dark:text-teal-300",
  },
};

const DEFAULT_TYPE_STYLE: BadgeStyle = {
  icon: FileText,
  className:
    "border-slate-300/80 bg-slate-50 text-slate-800 dark:border-slate-700/60 dark:bg-slate-950/40 dark:text-slate-300",
};

export function CertificateTypeBadge({
  type,
  className = "",
}: {
  type: string;
  className?: string;
}) {
  const style = TYPE_STYLES[type] ?? DEFAULT_TYPE_STYLE;
  const Icon = style.icon;

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium whitespace-nowrap shadow-xs ${style.className} ${className}`}
    >
      <Icon className="size-3.5 shrink-0" aria-hidden="true" />
      <span>{typeLabel(type)}</span>
    </span>
  );
}

