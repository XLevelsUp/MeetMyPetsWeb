"use client";

import { Archive, Circle, PawPrint } from "lucide-react";

import { copy } from "@/config/admin";

// Same meanings as the rest of the panel: emerald = live, slate = kept but not in use, sky = pets, violet = category.

const fill = (template: string, values: Record<string, string | number>) =>
  template.replace(/\{(\w+)\}/g, (_, key: string) => String(values[key] ?? ""));

export function TaxonomyStatusBadge({ status }: { status: string }) {
  const active = status === "active";
  const labels = copy.settings.statusLabels as Record<string, string>;
  const Icon = active ? Circle : Archive;
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium whitespace-nowrap shadow-xs ${
        active
          ? "border-emerald-300/80 bg-emerald-50 text-emerald-800 dark:border-emerald-700/60 dark:bg-emerald-950/40 dark:text-emerald-300"
          : "border-slate-300/80 bg-slate-50 text-slate-700 dark:border-slate-700/60 dark:bg-slate-950/40 dark:text-slate-300"
      }`}
    >
      <Icon className={active ? "size-2.5 fill-current" : "size-3.5"} aria-hidden="true" />
      {labels[status] ?? status}
    </span>
  );
}

// Sky when pets use it (in use, can't be retired); grey at zero (safe to retire). The title says which.
export function PetCountChip({ count }: { count: number }) {
  const inUse = count > 0;
  return (
    <span
      title={inUse ? fill(copy.settings.petsInUse, { count }) : copy.settings.noPets}
      className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-medium tabular-nums ${
        inUse
          ? "bg-sky-100 text-sky-800 dark:bg-sky-950/60 dark:text-sky-200"
          : "bg-muted text-muted-foreground"
      }`}
    >
      <PawPrint className="size-3" aria-hidden="true" />
      {count}
    </span>
  );
}

export function BreedCountChip({ count }: { count: number }) {
  return (
    <span
      title={fill(copy.settings.breedsCount, { count })}
      className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium tabular-nums ${
        count > 0
          ? "bg-violet-100 text-violet-800 dark:bg-violet-950/60 dark:text-violet-200"
          : "bg-muted text-muted-foreground"
      }`}
    >
      {count}
    </span>
  );
}
