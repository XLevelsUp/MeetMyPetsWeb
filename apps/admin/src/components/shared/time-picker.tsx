"use client";

import { X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { copy } from "@/config/admin";
import { from12Hour, to12Hour } from "@/lib/team-schedule";

const t = copy.common.time;
const HOURS = Array.from({ length: 12 }, (_, i) => i + 1);
const MINUTE_STEPS = Array.from({ length: 12 }, (_, i) => i * 5);

// Native selects styled like Input; the browser's datetime-local follows the OS clock setting and can show 24-hour time.
const SELECT =
  "h-9 rounded-md border border-input bg-transparent px-2 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:opacity-50 aria-invalid:border-destructive dark:bg-input/30";

// Value stays "YYYY-MM-DDTHH:mm" (local) or "" when empty; only the display is 12-hour.
export function TimePicker({
  id,
  value,
  onChange,
  minDate,
  invalid = false,
  describedBy,
  clearable = false,
}: {
  id: string;
  value: string;
  onChange: (next: string) => void;
  minDate?: string;
  invalid?: boolean;
  describedBy?: string;
  clearable?: boolean;
}) {
  const parts = to12Hour(value);
  const hasDate = parts.date !== "";
  // An existing time like 10:32 must still be selectable even though the list steps by 5.
  const minutes = MINUTE_STEPS.includes(parts.minute)
    ? MINUTE_STEPS
    : [...MINUTE_STEPS, parts.minute].sort((a, b) => a - b);

  const set = (patch: Partial<typeof parts>) => onChange(from12Hour({ ...parts, ...patch }));

  return (
    <div className="flex flex-wrap items-center gap-2" role="group" aria-describedby={describedBy}>
      <Input
        id={id}
        type="date"
        aria-label={t.date}
        value={parts.date}
        min={minDate}
        aria-invalid={invalid}
        onChange={(event) => set({ date: event.target.value })}
        className="w-auto"
      />
      {/* Kept together so "7 : 30 PM" never splits across lines on a phone. */}
      <span className="flex items-center gap-2">
        <select
          aria-label={t.hour}
          value={parts.hour}
          disabled={!hasDate}
          aria-invalid={invalid}
          onChange={(event) => set({ hour: Number(event.target.value) })}
          className={SELECT}
        >
          {HOURS.map((h) => (
            <option key={h} value={h}>
              {h}
            </option>
          ))}
        </select>
        <span aria-hidden="true">:</span>
        <select
          aria-label={t.minute}
          value={parts.minute}
          disabled={!hasDate}
          aria-invalid={invalid}
          onChange={(event) => set({ minute: Number(event.target.value) })}
          className={SELECT}
        >
          {minutes.map((m) => (
            <option key={m} value={m}>
              {String(m).padStart(2, "0")}
            </option>
          ))}
        </select>
        <select
          aria-label={t.period}
          value={parts.period}
          disabled={!hasDate}
          aria-invalid={invalid}
          onChange={(event) => set({ period: event.target.value as "am" | "pm" })}
          className={SELECT}
        >
          <option value="am">{t.am}</option>
          <option value="pm">{t.pm}</option>
        </select>
        {clearable && hasDate ? (
          <Button type="button" variant="ghost" size="sm" onClick={() => onChange("")}>
            <X className="mr-1 size-3.5" aria-hidden="true" />
            {t.clear}
          </Button>
        ) : null}
      </span>
    </div>
  );
}
