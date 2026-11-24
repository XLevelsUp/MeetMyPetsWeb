import {
  Archive,
  Radio,
  Ban,
  CalendarClock,
  CheckCircle2,
  Dog,
  Globe2,
  ListChecks,
  LocateFixed,
  MapPin,
  PawPrint,
  Send,
  Trash2,
  TriangleAlert,
  UserRound,
  Users,
  type LucideIcon,
} from "lucide-react";

import { copy } from "@/config/admin";
import type { TeamAudience, TeamState } from "@/lib/team-messages-constants";
import type { TeamMessage } from "@/lib/team-messages-contract";

const text = copy.teamMessages;

// Shows the zone so a scheduled time is never ambiguous to staff in other zones.
const DATE_TIME = new Intl.DateTimeFormat("en-IN", {
  day: "numeric",
  month: "short",
  year: "numeric",
  hour: "numeric",
  minute: "2-digit",
  hour12: true,
  timeZoneName: "short",
});

// Always 12-hour with uppercase AM/PM, matching the time picker, whatever the browser's locale prefers.
const upperPeriod = (text: string) => text.replace(/\b(am|pm)\b/gi, (p) => p.toUpperCase());

export function formatDateTime(iso: string | null): string {
  if (!iso) return "—";
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? "—" : upperPeriod(DATE_TIME.format(date));
}

const DATE_ONLY = new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short", year: "numeric" });
const TIME_ONLY = new Intl.DateTimeFormat("en-IN", { hour: "numeric", minute: "2-digit", hour12: true, timeZoneName: "short" });

// Two lines so the "When" column stays narrow enough for the actions button to fit.
export function splitDateTime(iso: string | null): { date: string; time: string } | null {
  if (!iso) return null;
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? null : { date: DATE_ONLY.format(date), time: upperPeriod(TIME_ONLY.format(date)) };
}

const STATE_STYLES: Record<TeamState, { icon: LucideIcon; className: string }> = {
  scheduled: {
    icon: CalendarClock,
    className: "border-sky-300/80 bg-sky-50 text-sky-800 dark:border-sky-700/60 dark:bg-sky-950/40 dark:text-sky-300",
  },
  sent: {
    icon: CheckCircle2,
    className:
      "border-emerald-300/80 bg-emerald-50 text-emerald-800 dark:border-emerald-700/60 dark:bg-emerald-950/40 dark:text-emerald-300",
  },
  cancelled: {
    icon: Ban,
    className:
      "border-slate-300/80 bg-slate-50 text-slate-800 dark:border-slate-700/60 dark:bg-slate-950/40 dark:text-slate-300",
  },
  deleted: {
    icon: Trash2,
    className:
      "border-slate-300/80 bg-slate-50 text-slate-800 dark:border-slate-700/60 dark:bg-slate-950/40 dark:text-slate-300",
  },
  active: {
    icon: Radio,
    className:
      "border-emerald-300/80 bg-emerald-50 text-emerald-800 dark:border-emerald-700/60 dark:bg-emerald-950/40 dark:text-emerald-300",
  },
  retired: {
    icon: Archive,
    className:
      "border-slate-300/80 bg-slate-50 text-slate-700 dark:border-slate-700/60 dark:bg-slate-950/40 dark:text-slate-300",
  },
  failed: {
    icon: TriangleAlert,
    className: "border-red-300/80 bg-red-50 text-red-800 dark:border-red-700/60 dark:bg-red-950/40 dark:text-red-300",
  },
};

export function isTeamState(value: string): value is TeamState {
  return value in STATE_STYLES;
}

export function TeamStateBadge({ state }: { state: string }) {
  const known = isTeamState(state) ? state : "sent";
  const style = STATE_STYLES[known];
  const Icon = style.icon;
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium whitespace-nowrap shadow-xs ${style.className}`}
    >
      <Icon className="size-3.5 shrink-0" aria-hidden="true" />
      <span>{isTeamState(state) ? text.states[state] : state}</span>
    </span>
  );
}

const fill = (template: string, values: Record<string, string | number>) =>
  template.replace(/\{(\w+)\}/g, (_, key: string) => String(values[key] ?? ""));

export { fill };

const nouns = text.composer.nouns;

// "1 pet" / "2 pets", "1 person" / "15 people".
export function countOf(n: number, noun: keyof typeof nouns): string {
  return `${n} ${n === 1 ? nouns[noun].one : nouns[noun].other}`;
}

export function plural(n: number, forms: { one: string; other: string }): string {
  return n === 1 ? forms.one : fill(forms.other, { count: n });
}

function listOf(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((v): v is string => typeof v === "string") : [];
}

// One line describing who a message was for; welcome messages have no audience and say so.
export function describeAudience(message: TeamMessage, speciesNames: Map<string, string>): { label: string; detail: string | null } {
  const detail = text.history.audienceDetail;
  if (!message.audience) {
    const kind = message.kind as keyof typeof text.kinds;
    return { label: text.history.automatic, detail: text.kinds[kind] ?? null };
  }
  const label = text.audiences[message.audience];
  switch (message.audience) {
    case "all":
    case "no_pet":
      return { label, detail: null };
    case "species": {
      const names = (message.speciesIds ?? []).map((id) => speciesNames.get(id) ?? id.slice(0, 8));
      return { label, detail: names.length ? fill(detail.species, { names: names.join(", ") }) : null };
    }
    case "pet":
      return { label, detail: detail.pet };
    case "pets":
      return { label, detail: fill(detail.pets, { count: countOf(message.petIds?.length ?? 0, "pet") }) };
    case "people":
      return { label, detail: fill(detail.people, { count: countOf(message.accountIds?.length ?? 0, "person") }) };
    case "place": {
      const loc = message.location ?? {};
      const names = [...listOf(loc.countries), ...listOf(loc.states), ...listOf(loc.cities)];
      return { label, detail: names.length ? names.join(", ") : null };
    }
    case "nearby": {
      const loc = message.location ?? {};
      const lat = Number(loc.lat);
      const lng = Number(loc.lng);
      const km = Number(loc.radius_km ?? loc.radiusKm);
      if (![lat, lng, km].every(Number.isFinite)) return { label, detail: null };
      return { label, detail: fill(detail.nearby, { km, lat: lat.toFixed(4), lng: lng.toFixed(4) }) };
    }
  }
}

export function readPercent(message: TeamMessage): number {
  const total = message.pets + message.accounts;
  return total > 0 ? Math.round((message.readCount / total) * 100) : 0;
}

// Colour = meaning, reused on every Team-messages screen: rose widest, amber a slice of everyone,
// violet a category, sky specific pets, indigo specific people, emerald/teal geography.
export type Tone = { icon: LucideIcon; chip: string; active: string };

const TONES = {
  rose: {
    chip: "bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300",
    active: "border-rose-400 bg-rose-50 ring-1 ring-rose-400/40 dark:border-rose-500/70 dark:bg-rose-950/30",
  },
  amber: {
    chip: "bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300",
    active: "border-amber-400 bg-amber-50 ring-1 ring-amber-400/40 dark:border-amber-500/70 dark:bg-amber-950/30",
  },
  violet: {
    chip: "bg-violet-100 text-violet-700 dark:bg-violet-950/60 dark:text-violet-300",
    active: "border-violet-400 bg-violet-50 ring-1 ring-violet-400/40 dark:border-violet-500/70 dark:bg-violet-950/30",
  },
  sky: {
    chip: "bg-sky-100 text-sky-700 dark:bg-sky-950/60 dark:text-sky-300",
    active: "border-sky-400 bg-sky-50 ring-1 ring-sky-400/40 dark:border-sky-500/70 dark:bg-sky-950/30",
  },
  indigo: {
    chip: "bg-indigo-100 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300",
    active: "border-indigo-400 bg-indigo-50 ring-1 ring-indigo-400/40 dark:border-indigo-500/70 dark:bg-indigo-950/30",
  },
  emerald: {
    chip: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300",
    active: "border-emerald-400 bg-emerald-50 ring-1 ring-emerald-400/40 dark:border-emerald-500/70 dark:bg-emerald-950/30",
  },
  teal: {
    chip: "bg-teal-100 text-teal-700 dark:bg-teal-950/60 dark:text-teal-300",
    active: "border-teal-400 bg-teal-50 ring-1 ring-teal-400/40 dark:border-teal-500/70 dark:bg-teal-950/30",
  },
  slate: {
    chip: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300",
    active: "border-slate-400 bg-slate-50 dark:border-slate-500 dark:bg-slate-900/40",
  },
} as const;

export const AUDIENCE_TONES: Record<TeamAudience, Tone> = {
  all: { icon: Globe2, ...TONES.rose },
  no_pet: { icon: UserRound, ...TONES.amber },
  species: { icon: PawPrint, ...TONES.violet },
  pet: { icon: Dog, ...TONES.sky },
  pets: { icon: ListChecks, ...TONES.sky },
  people: { icon: Users, ...TONES.indigo },
  place: { icon: MapPin, ...TONES.emerald },
  nearby: { icon: LocateFixed, ...TONES.teal },
};

// Automatic welcome messages have no audience; they read as neutral system output.
export const SYSTEM_TONE: Tone = { icon: CheckCircle2, ...TONES.slate };

// Same hues as the state badges: emerald = goes out now (Sent), sky = later (Scheduled).
export const WHEN_TONES: Record<"now" | "later", Tone> = {
  now: { icon: Send, ...TONES.emerald },
  later: { icon: CalendarClock, ...TONES.sky },
};

export function ToneIcon({ tone, size = "md" }: { tone: Tone; size?: "sm" | "md" }) {
  const Icon = tone.icon;
  return (
    <span
      className={`inline-flex shrink-0 items-center justify-center rounded-md ${tone.chip} ${size === "sm" ? "size-6" : "size-8"}`}
      aria-hidden="true"
    >
      <Icon className={size === "sm" ? "size-3.5" : "size-4"} />
    </span>
  );
}
