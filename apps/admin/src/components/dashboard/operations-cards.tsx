"use client";

import { BellRing, Clock, type LucideIcon } from "lucide-react";
import Link from "next/link";

import { Card, CardContent } from "@/components/ui/card";
import { copy } from "@/config/admin";
import type { Operations } from "@/lib/api-contract";

const t = copy.dashboard.operations;

/** Hours waiting, coloured: green under a day, amber under three, red beyond. */
function ageTone(hours: number | null) {
  if (hours === null) return "text-muted-foreground";
  if (hours >= 72) return "text-rejected-fg";
  if (hours >= 24) return "text-waiting-fg";
  return "text-approved-fg";
}

/** How much of the base we can reach: under a quarter is a problem worth seeing. */
function reachTone(pct: number) {
  if (pct < 25) return "text-rejected-fg";
  if (pct < 60) return "text-waiting-fg";
  return "text-approved-fg";
}

function formatAge(hours: number | null): string {
  if (hours === null) return "—";
  if (hours < 24) return `${hours}h`;
  return `${Math.round(hours / 24)}d`;
}

/** A card that is a link when it has somewhere useful to send you. */
function OpsCard({
  icon: Icon,
  label,
  href,
  children,
}: {
  icon: LucideIcon;
  label: string;
  href?: string;
  children: React.ReactNode;
}) {
  const body = (
    <Card className="h-full py-3 transition-shadow hover:ring-foreground/20">
      <CardContent className="flex flex-1 flex-col gap-1 px-3.5">
        <div className="flex items-start justify-between gap-2">
          <span className="text-sm leading-snug text-muted-foreground">{label}</span>
          <Icon aria-hidden className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
        </div>
        {children}
      </CardContent>
    </Card>
  );

  return href ? (
    <Link
      href={href}
      className="h-full rounded-xl focus-visible:outline-2 focus-visible:outline-ring"
    >
      {body}
    </Link>
  ) : (
    body
  );
}

/**
 * Two standing facts the metric cards cannot carry.
 *
 * None has a period delta: they describe the world now, not a count over the
 * selected window. The queue card links straight to the queue it describes —
 * seeing "30 waiting" and then hunting for the page is a wasted click.
 */
export function OperationsCards({ ops }: { ops: Operations }) {
  const waiting = ops.aiQueue + ops.openReports;
  const reachPct =
    ops.totalAccounts === 0 ? 0 : Math.round((ops.reachableAccounts / ops.totalAccounts) * 100);

  return (
    <>
      <OpsCard icon={Clock} label={t.waiting} href="/ai-reports">
        <span className="font-heading text-2xl font-semibold tabular-nums">{waiting}</span>
        <span className="text-xs text-muted-foreground">
          {ops.aiQueue} {t.fromAi} · {ops.openReports} {t.fromUsers}
        </span>
        <span
          className={`mt-auto pt-1 text-xs font-medium tabular-nums ${ageTone(ops.oldestWaitingHours)}`}
        >
          {waiting === 0 ? t.allClear : `${t.oldest} ${formatAge(ops.oldestWaitingHours)}`}
        </span>
      </OpsCard>

      <OpsCard icon={BellRing} label={t.reach}>
        <span
          className={`font-heading text-2xl font-semibold tabular-nums ${reachTone(reachPct)}`}
        >
          {reachPct}%
        </span>
        <span className="text-xs text-muted-foreground">
          {ops.reachableAccounts} {t.of} {ops.totalAccounts} {t.accounts}
        </span>
        {/* A bar makes 5% land in a way the number alone does not. */}
        <div
          className="mt-auto h-1.5 overflow-hidden rounded-full bg-muted"
          role="meter"
          aria-valuenow={reachPct}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={t.reach}
        >
          <div
            className={`h-full rounded-full ${
              reachPct < 25 ? "bg-rejected" : reachPct < 60 ? "bg-waiting" : "bg-approved"
            }`}
            style={{ width: `${Math.max(reachPct, 2)}%` }}
          />
        </div>
      </OpsCard>

    </>
  );
}
