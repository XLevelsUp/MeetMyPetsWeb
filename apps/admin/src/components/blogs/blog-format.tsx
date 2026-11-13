import { Archive, CheckCircle2, Clock, type LucideIcon } from "lucide-react";

import { copy } from "@/config/admin";
import type { BlogStatus } from "@/lib/blog-contract";

const DATE = new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short", year: "numeric" });

export function formatDate(iso: string): string {
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? "—" : DATE.format(date);
}

const BLOG_STATUS_STYLES: Record<BlogStatus, { icon: LucideIcon; className: string }> = {
  published: {
    icon: CheckCircle2,
    className:
      "border-emerald-300/80 bg-emerald-50 text-emerald-800 dark:border-emerald-700/60 dark:bg-emerald-950/40 dark:text-emerald-300",
  },
  draft: {
    icon: Clock,
    className:
      "border-amber-300/80 bg-amber-50 text-amber-800 dark:border-amber-700/60 dark:bg-amber-950/40 dark:text-amber-300",
  },
  unpublished: {
    icon: Archive,
    className:
      "border-slate-300/80 bg-slate-50 text-slate-800 dark:border-slate-700/60 dark:bg-slate-950/40 dark:text-slate-300",
  },
};

/** Published is emerald, draft is amber, unpublished is slate — unified color theory. */
export function BlogStatusBadge({ status }: { status: BlogStatus }) {
  const style = BLOG_STATUS_STYLES[status];
  const Icon = style.icon;

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium whitespace-nowrap shadow-xs ${style.className}`}
    >
      <Icon className="size-3.5 shrink-0" aria-hidden="true" />
      <span>{copy.blogs.statusLabels[status]}</span>
    </span>
  );
}
