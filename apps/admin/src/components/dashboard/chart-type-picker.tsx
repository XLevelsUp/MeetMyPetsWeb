"use client";

import { ChartArea, ChartBar, ChartColumn, ChartLine, ChartPie, type LucideIcon } from "lucide-react";

import { copy } from "@/config/admin";
import type { CategoryChartType, TimeChartType } from "@/hooks/use-chart-type";
import { cn } from "@/lib/utils";

const t = copy.dashboard.chartTypes;

const OPTIONS: Record<TimeChartType | CategoryChartType, { icon: LucideIcon; label: string }> = {
  area: { icon: ChartArea, label: t.area },
  line: { icon: ChartLine, label: t.line },
  bar: { icon: ChartColumn, label: t.bar },
  horizontal: { icon: ChartBar, label: t.horizontal },
  donut: { icon: ChartPie, label: t.donut },
};

/** Icon toggle for switching one chart between its allowed types. */
export function ChartTypePicker<T extends TimeChartType | CategoryChartType>({
  value,
  options,
  onChange,
  chartName,
}: {
  value: T;
  options: readonly T[];
  onChange: (next: T) => void;
  /** Names the group for screen readers, e.g. "Chart type for New sign-ups". */
  chartName: string;
}) {
  return (
    <div
      role="radiogroup"
      aria-label={`${t.label} ${chartName}`}
      className="inline-flex items-center gap-0.5 rounded-lg bg-muted p-0.5"
    >
      {options.map((option) => {
        const { icon: Icon, label } = OPTIONS[option];
        const active = option === value;
        return (
          <button
            key={option}
            type="button"
            role="radio"
            aria-checked={active}
            aria-label={label}
            title={label}
            onClick={() => onChange(option)}
            className={cn(
              "inline-flex size-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
              active && "bg-card text-foreground shadow-sm",
            )}
          >
            <Icon className="size-4" aria-hidden />
          </button>
        );
      })}
    </div>
  );
}
