"use client";

import { CalendarRange, ChevronDown } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { copy } from "@/config/admin";
import {
  RANGE_PRESETS,
  resolveRange,
  toIsoDate,
  type RangePreset,
} from "@/lib/analytics-constants";
import type { AnalyticsRangeQuery } from "@/lib/api-contract";

/**
 * The dashboard's one filter row.
 *
 * Sits ABOVE everything it scopes and drives the metric cards and both charts
 * from a single piece of state — never per-chart, never inside a chart card, so
 * every number on the page describes the same window.
 *
 * Presets are rows rather than a calendar: nobody wants to fight a date grid
 * for "last 30 days". The custom range lives behind a separator in the footer,
 * which is where the reader who actually needs it will look.
 */
export function RangeFilter({
  range,
  onChange,
  /** Earliest real data, from the timeseries response. Bounds the date inputs. */
  dataStartsAt,
}: {
  range: AnalyticsRangeQuery;
  onChange: (next: AnalyticsRangeQuery) => void;
  dataStartsAt?: string | null;
}) {
  const [open, setOpen] = useState(false);
  const today = toIsoDate(new Date());
  const resolved = resolveRange(range.preset, range.from, range.to);

  const label =
    range.preset === "custom"
      ? `${resolved.from} → ${resolved.to}`
      : copy.dashboard.range.presets[range.preset];

  return (
    <div className="flex flex-wrap items-center gap-3">
      <span className="text-sm text-muted-foreground">{copy.dashboard.range.label}</span>

      <DropdownMenu open={open} onOpenChange={setOpen}>
        <DropdownMenuTrigger
          render={
            <Button variant="outline" size="sm" className="gap-2">
              <CalendarRange aria-hidden className="size-4" />
              {label}
              <ChevronDown aria-hidden className="size-4 text-muted-foreground" />
            </Button>
          }
        />
        <DropdownMenuContent align="start" className="w-64">
          <DropdownMenuRadioGroup
            value={range.preset}
            onValueChange={(value) => {
              const preset = (value ?? "30d") as RangePreset;
              if (preset === "custom") {
                // Seed the custom inputs from whatever is on screen, so the
                // reader edits a real range instead of two empty fields.
                onChange({ preset, from: resolved.from, to: resolved.to });
                return;
              }
              onChange({ preset, from: undefined, to: undefined });
              setOpen(false);
            }}
          >
            {RANGE_PRESETS.filter((p) => p !== "custom").map((preset) => (
              <DropdownMenuRadioItem key={preset} value={preset}>
                {copy.dashboard.range.presets[preset]}
              </DropdownMenuRadioItem>
            ))}

            <DropdownMenuSeparator />

            <DropdownMenuRadioItem value="custom">
              {copy.dashboard.range.presets.custom}
            </DropdownMenuRadioItem>
          </DropdownMenuRadioGroup>

          {range.preset === "custom" ? (
            <div className="flex flex-col gap-2 px-1.5 pt-2">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="range-from">{copy.dashboard.range.from}</Label>
                <Input
                  id="range-from"
                  type="date"
                  value={range.from ?? resolved.from}
                  // Pinned to the first real row: there is nothing to see before
                  // it, and offering the date implies there is.
                  min={dataStartsAt ?? undefined}
                  max={range.to ?? today}
                  onChange={(event) => onChange({ ...range, from: event.target.value || undefined })}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="range-to">{copy.dashboard.range.to}</Label>
                <Input
                  id="range-to"
                  type="date"
                  value={range.to ?? resolved.to}
                  min={range.from ?? dataStartsAt ?? undefined}
                  max={today}
                  onChange={(event) => onChange({ ...range, to: event.target.value || undefined })}
                />
              </div>
            </div>
          ) : null}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
