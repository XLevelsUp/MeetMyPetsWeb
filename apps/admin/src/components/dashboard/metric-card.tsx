import { Minus, TrendingDown, TrendingUp, type LucideIcon } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { copy } from "@/config/admin";
import { cn } from "@/lib/utils";
import type { MetricValue } from "@/lib/api-contract";

/**
 * One headline number + a period-over-period delta.
 *
 * The VALUE is all-time (total users ever); the DELTA measures the selected
 * range against the equally-long window before it, which is why the comparison
 * label is passed in rather than hardcoded — it used to read "vs last week"
 * regardless of what the reader had selected.
 *
 * `changePct: null` renders an em dash (pre-launch database, empty prior window).
 */
export function MetricCard({
  label,
  metric,
  icon: Icon,
  comparison,
}: {
  label: string;
  metric: MetricValue;
  icon: LucideIcon;
  comparison: string;
}) {
  const { current, changePct } = metric;
  const direction = changePct === null ? "flat" : changePct > 0 ? "up" : changePct < 0 ? "down" : "flat";
  const DeltaIcon = direction === "up" ? TrendingUp : direction === "down" ? TrendingDown : Minus;

  return (
    <Card className="py-4">
      <CardContent className="flex flex-col gap-1.5 px-4">
        <div className="flex items-center justify-between gap-2">
          <span className="truncate text-sm text-muted-foreground">{label}</span>
          <Icon aria-hidden className="size-4 shrink-0 text-muted-foreground" />
        </div>
        <span className="font-heading text-2xl font-semibold tabular-nums">
          {current.toLocaleString("en-IN")}
        </span>
        <span
          className={cn(
            "flex items-center gap-1 text-xs tabular-nums",
            direction === "up" && "text-verified",
            direction === "down" && "text-destructive",
            direction === "flat" && "text-muted-foreground",
          )}
        >
          <DeltaIcon aria-hidden className="size-3.5" />
          {changePct === null ? copy.dashboard.noData : `${changePct > 0 ? "+" : ""}${changePct}%`}
          <span className="truncate text-muted-foreground">{comparison}</span>
        </span>
      </CardContent>
    </Card>
  );
}
