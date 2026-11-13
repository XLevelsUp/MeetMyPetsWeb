import {
  AlertTriangle,
  CheckCircle2,
  CircleDollarSign,
  Clock,
  Eye,
  EyeOff,
  FileText,
  HelpCircle,
  Megaphone,
  Shield,
  ShieldAlert,
  ShieldCheck,
  User,
  UserMinus,
  UserX,
  type LucideIcon,
} from "lucide-react";

import {
  reasonLabel,
  scopeLabel,
  statusLabel,
  trustLabel,
} from "@/components/reports/report-format";
import type { TrustSignal } from "@/lib/reports-contract";

interface BadgeStyle {
  icon: LucideIcon;
  className: string;
}

/**
 * Report Status Color Theory:
 * - Pending:   Amber / Orange (needs review, in open queue)
 * - Actioned:  Crimson Red (enforcement applied, violation confirmed)
 * - Dismissed: Emerald Green (cleared / illegitimate complaint, points restored)
 * - Reviewed:  Slate Blue (reviewed by moderator, no action required)
 */
const STATUS_STYLES: Record<string, BadgeStyle> = {
  pending: {
    icon: Clock,
    className:
      "border-amber-300/80 bg-amber-50 text-amber-800 dark:border-amber-700/60 dark:bg-amber-950/40 dark:text-amber-300",
  },
  actioned: {
    icon: ShieldAlert,
    className:
      "border-red-300/80 bg-red-50 text-red-800 dark:border-red-700/60 dark:bg-red-950/40 dark:text-red-300",
  },
  dismissed: {
    icon: CheckCircle2,
    className:
      "border-emerald-300/80 bg-emerald-50 text-emerald-800 dark:border-emerald-700/60 dark:bg-emerald-950/40 dark:text-emerald-300",
  },
  reviewed: {
    icon: Eye,
    className:
      "border-sky-300/80 bg-sky-50 text-sky-800 dark:border-sky-700/60 dark:bg-sky-950/40 dark:text-sky-300",
  },
};

const DEFAULT_STATUS_STYLE: BadgeStyle = {
  icon: Clock,
  className: "border-muted bg-muted/60 text-muted-foreground",
};

export function ReportStatusBadge({
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
 * Report Reason Color Theory (differentiates strictly from Status):
 * - Harassment:            Purple (interpersonal violations)
 * - Inappropriate content: Rose / Deep Red (content obscenity / explicit)
 * - Animal welfare:        Teal (safety / cruelty checks)
 * - Fake profile:          Indigo (identity falsification)
 * - Scam:                  Amber (fraud / deceptive practices)
 * - Spam:                  Orange (automated / unsolicited volume)
 * - Other:                 Slate (miscellaneous)
 */
const REASON_STYLES: Record<string, BadgeStyle> = {
  harassment: {
    icon: UserX,
    className:
      "border-purple-300/80 bg-purple-50 text-purple-800 dark:border-purple-700/60 dark:bg-purple-950/40 dark:text-purple-300",
  },
  inappropriate_content: {
    icon: EyeOff,
    className:
      "border-rose-300/80 bg-rose-50 text-rose-800 dark:border-rose-700/60 dark:bg-rose-950/40 dark:text-rose-300",
  },
  animal_welfare: {
    icon: Shield,
    className:
      "border-teal-300/80 bg-teal-50 text-teal-800 dark:border-teal-700/60 dark:bg-teal-950/40 dark:text-teal-300",
  },
  fake_profile: {
    icon: UserMinus,
    className:
      "border-indigo-300/80 bg-indigo-50 text-indigo-800 dark:border-indigo-700/60 dark:bg-indigo-950/40 dark:text-indigo-300",
  },
  scam: {
    icon: CircleDollarSign,
    className:
      "border-fuchsia-300/80 bg-fuchsia-50 text-fuchsia-800 dark:border-fuchsia-700/60 dark:bg-fuchsia-950/40 dark:text-fuchsia-300",
  },
  spam: {
    icon: Megaphone,
    className:
      "border-orange-300/80 bg-orange-50 text-orange-800 dark:border-orange-700/60 dark:bg-orange-950/40 dark:text-orange-300",
  },
  other: {
    icon: HelpCircle,
    className:
      "border-slate-300/80 bg-slate-50 text-slate-800 dark:border-slate-700/60 dark:bg-slate-950/40 dark:text-slate-300",
  },
};

const DEFAULT_REASON_STYLE: BadgeStyle = {
  icon: HelpCircle,
  className:
    "border-slate-300/80 bg-slate-50 text-slate-800 dark:border-slate-700/60 dark:bg-slate-950/40 dark:text-slate-300",
};

export function ReportReasonBadge({
  reason,
  className = "",
}: {
  reason: string;
  className?: string;
}) {
  const style = REASON_STYLES[reason] ?? DEFAULT_REASON_STYLE;
  const Icon = style.icon;

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium whitespace-nowrap shadow-xs ${style.className} ${className}`}
    >
      <Icon className="size-3.5 shrink-0" aria-hidden="true" />
      <span>{reasonLabel(reason)}</span>
    </span>
  );
}

/**
 * Report Scope Badges:
 * - Profile: Sky Blue with User icon
 * - Post:    Violet with FileText icon
 */
const SCOPE_STYLES: Record<string, BadgeStyle> = {
  profile: {
    icon: User,
    className:
      "border-sky-300/80 bg-sky-50 text-sky-800 dark:border-sky-700/60 dark:bg-sky-950/40 dark:text-sky-300",
  },
  post: {
    icon: FileText,
    className:
      "border-violet-300/80 bg-violet-50 text-violet-800 dark:border-violet-700/60 dark:bg-violet-950/40 dark:text-violet-300",
  },
};

const DEFAULT_SCOPE_STYLE: BadgeStyle = {
  icon: FileText,
  className: "border-muted bg-muted/60 text-muted-foreground",
};

export function ReportScopeBadge({
  scope,
  className = "",
}: {
  scope: string;
  className?: string;
}) {
  const style = SCOPE_STYLES[scope] ?? DEFAULT_SCOPE_STYLE;
  const Icon = style.icon;

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-xs font-medium whitespace-nowrap shadow-xs ${style.className} ${className}`}
    >
      <Icon className="size-3.5 shrink-0" aria-hidden="true" />
      <span>{scopeLabel(scope)}</span>
    </span>
  );
}

/**
 * Report Trust Signal Badge:
 * - Banned (perm/temp): Crimson Red with ShieldAlert
 * - Warning:            Amber with AlertTriangle
 * - Normal:             Emerald with ShieldCheck
 */
export function ReportTrustBadge({
  trust,
  className = "",
}: {
  trust: TrustSignal;
  className?: string;
}) {
  const status = trust.status;

  if (status === "permanently_banned" || status === "temporary_banned") {
    return (
      <span
        className={`inline-flex items-center gap-1.5 rounded-full border border-red-300/80 bg-red-50 px-2.5 py-0.5 text-xs font-medium text-red-800 shadow-xs dark:border-red-700/60 dark:bg-red-950/40 dark:text-red-300 ${className}`}
      >
        <ShieldAlert className="size-3.5 shrink-0" aria-hidden="true" />
        <span>{trust.score ?? trustLabel(status)}</span>
      </span>
    );
  }

  if (status === "warning") {
    return (
      <span
        className={`inline-flex items-center gap-1.5 rounded-full border border-amber-300/80 bg-amber-50 px-2.5 py-0.5 text-xs font-medium text-amber-800 shadow-xs dark:border-amber-700/60 dark:bg-amber-950/40 dark:text-amber-300 ${className}`}
      >
        <AlertTriangle className="size-3.5 shrink-0" aria-hidden="true" />
        <span>{trust.score ?? trustLabel(status)}</span>
      </span>
    );
  }

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border border-emerald-300/80 bg-emerald-50 px-2.5 py-0.5 text-xs font-medium text-emerald-800 shadow-xs dark:border-emerald-700/60 dark:bg-emerald-950/40 dark:text-emerald-300 ${className}`}
    >
      <ShieldCheck className="size-3.5 shrink-0" aria-hidden="true" />
      <span>{trust.score ?? trustLabel(status)}</span>
    </span>
  );
}

