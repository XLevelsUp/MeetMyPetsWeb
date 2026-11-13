import { CheckCircle2, Clock, UserCheck, UserX, XCircle, type LucideIcon } from "lucide-react";

import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { copy } from "@/config/admin";
import type { AiStatus } from "@/lib/ai-moderation-status";

/** Colour, icon and word together — colour alone never carries the meaning (WCAG 1.4.1). */
const STYLES: Record<AiStatus, { icon: LucideIcon; className: string }> = {
  // All three are amber: whatever the AI leans towards, the row is still work.
  // Green or red here would read as "already decided".
  waiting_ai_approved: {
    icon: Clock,
    className: "border-waiting/30 bg-waiting-soft text-waiting-fg",
  },
  waiting_ai_rejected: {
    icon: Clock,
    className: "border-waiting/30 bg-waiting-soft text-waiting-fg",
  },
  waiting_ai_unsure: {
    icon: Clock,
    className: "border-waiting/30 bg-waiting-soft text-waiting-fg",
  },
  published: {
    icon: CheckCircle2,
    className: "border-approved/30 bg-approved-soft text-approved-fg",
  },
  blocked: {
    icon: XCircle,
    className: "border-rejected/30 bg-rejected-soft text-rejected-fg",
  },
  published_by_human: {
    icon: UserCheck,
    className: "border-approved/30 bg-approved-soft text-approved-fg",
  },
  blocked_by_human: {
    icon: UserX,
    className: "border-rejected/30 bg-rejected-soft text-rejected-fg",
  },
};

export function AiStatusBadge({ status, className = "" }: { status: AiStatus; className?: string }) {
  const { icon: Icon, className: tone } = STYLES[status];
  const labels = copy.aiReports.statusLabels as Record<AiStatus, string>;
  const help = copy.aiReports.statusHelp as Record<AiStatus, string>;

  // Five statuses derived from three columns; hovering is cheaper than guessing.
  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <span
            className={`inline-flex min-h-6 cursor-help items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium whitespace-nowrap ${tone} ${className}`}
          >
            <Icon className="size-3.5 shrink-0" aria-hidden="true" />
            {labels[status]}
          </span>
        }
      />
      <TooltipContent>{help[status]}</TooltipContent>
    </Tooltip>
  );
}
