"use client";

import { Check, X } from "lucide-react";
import { useState } from "react";

import { InlineError } from "@/components/team-messages/inline-error";
import { fill } from "@/components/team-messages/team-format";
import { Input } from "@/components/ui/input";
import { copy } from "@/config/admin";
import { usePlaceOptions } from "@/hooks/use-team-messages";
import { TEAM_MAX_PLACES_PER_LIST } from "@/lib/team-messages-constants";
import type { PlaceOption } from "@/lib/team-messages-contract";

export type PlaceSelection = { countries: string[]; states: string[]; cities: string[] };
type Level = keyof PlaceSelection;

const LEVELS: readonly Level[] = ["countries", "states", "cities"];
const p = copy.teamMessages.composer.place;

// A tick list per level, from the names people actually typed, so "India" and "INDA" can both be chosen.
export function PlacePicker({ value, onChange }: { value: PlaceSelection; onChange: (next: PlaceSelection) => void }) {
  const places = usePlaceOptions();

  function toggle(level: Level, name: string) {
    const list = value[level];
    const next = list.includes(name) ? list.filter((n) => n !== name) : [...list, name];
    if (next.length > TEAM_MAX_PLACES_PER_LIST) return;
    onChange({ ...value, [level]: next });
  }

  const chosen = LEVELS.flatMap((level) => value[level].map((name) => ({ level, name })));

  return (
    <div className="flex min-w-0 flex-col gap-3">
      <p className="text-xs text-muted-foreground">{p.intro}</p>
      {chosen.length > 0 ? (
        <div className="flex flex-wrap gap-1.5">
          {chosen.map(({ level, name }) => (
            <span
              key={`${level}-${name}`}
              className="inline-flex max-w-full items-center gap-1 rounded-full border bg-muted/50 py-0.5 pr-1 pl-2.5 text-xs"
            >
              <span className="truncate">{name}</span>
              <button
                type="button"
                className="rounded-full p-0.5 hover:bg-muted"
                aria-label={fill(copy.teamMessages.composer.remove, { name })}
                onClick={() => toggle(level, name)}
              >
                <X className="size-3" aria-hidden="true" />
              </button>
            </span>
          ))}
        </div>
      ) : null}

      {places.isError ? (
        <InlineError message={places.error.message} onRetry={() => void places.refetch()} />
      ) : (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          {LEVELS.map((level) => (
            <PlaceList
              key={level}
              level={level}
              options={places.data?.[level]}
              selected={value[level]}
              onToggle={(name) => toggle(level, name)}
            />
          ))}
        </div>
      )}
      <p className="text-xs text-muted-foreground">
        {p.limit} {p.noLocation}
      </p>
    </div>
  );
}

function PlaceList({
  level,
  options,
  selected,
  onToggle,
}: {
  level: Level;
  options: PlaceOption[] | undefined;
  selected: string[];
  onToggle: (name: string) => void;
}) {
  const [filter, setFilter] = useState("");
  const label = p.levels[level];
  const needle = filter.trim().toLowerCase();
  const shown = (options ?? []).filter((o) => !needle || o.value.toLowerCase().includes(needle));
  const full = selected.length >= TEAM_MAX_PLACES_PER_LIST;

  return (
    <div className="flex min-w-0 flex-col gap-2">
      <span className="text-sm font-medium">{label}</span>
      <Input
        value={filter}
        onChange={(event) => setFilter(event.target.value)}
        placeholder={fill(p.filter, { level: label.toLowerCase() })}
        aria-label={fill(p.filter, { level: label.toLowerCase() })}
      />
      <div className="max-h-56 overflow-y-auto rounded-md border">
        {!options ? (
          <p className="p-3 text-sm text-muted-foreground">{p.loading}</p>
        ) : shown.length === 0 ? (
          <p className="p-3 text-sm text-muted-foreground">{p.none}</p>
        ) : (
          <ul className="divide-y">
            {shown.map((option) => {
              const on = selected.includes(option.value);
              return (
                <li key={option.value}>
                  <button
                    type="button"
                    aria-pressed={on}
                    disabled={!on && full}
                    onClick={() => onToggle(option.value)}
                    className="flex w-full min-w-0 items-center gap-2.5 px-3 py-1.5 text-left text-sm hover:bg-muted/60 disabled:opacity-50"
                  >
                    <span
                      className={`flex size-4 shrink-0 items-center justify-center rounded-sm border ${on ? "border-primary bg-primary text-primary-foreground" : ""}`}
                    >
                      {on ? <Check className="size-3" aria-hidden="true" /> : null}
                    </span>
                    <span className="min-w-0 flex-1 truncate">{option.value}</span>
                    <span className="text-xs text-muted-foreground tabular-nums" title={p.peopleTitle}>
                      {fill(p.people, { count: option.people })}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
