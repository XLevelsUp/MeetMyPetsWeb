import { countOf, fill, plural } from "@/components/team-messages/team-format";
import { copy } from "@/config/admin";
import type { AudienceCounts } from "@/lib/team-messages-contract";

const c = copy.teamMessages.composer;

// `compact` (the pinned panel) hides the sentence on phones; the figures say the same and it stays for screen readers.
export function ReachSummary({ counts, compact = false }: { counts: AudienceCounts; compact?: boolean }) {
  const r = c.reach;
  const nobody = counts.pets + counts.accountsWithoutPets === 0;
  if (nobody) return <p className="text-sm font-medium text-destructive">{r.nobody}</p>;
  return (
    <div className="flex flex-col gap-2 text-sm">
      {/* Figures reuse the audience hues: sky = pets, indigo = people. The sentence stays for screen readers. */}
      <div className="flex flex-wrap gap-2" aria-hidden="true">
        <span className="inline-flex items-baseline gap-1 rounded-md bg-sky-100 px-2 py-1 text-sky-800 dark:bg-sky-950/60 dark:text-sky-200">
          <span className="text-lg leading-none font-semibold tabular-nums">{counts.pets}</span>
          <span className="text-xs">{counts.pets === 1 ? c.nouns.pet.one : c.nouns.pet.other}</span>
        </span>
        <span className="inline-flex items-baseline gap-1 rounded-md bg-indigo-100 px-2 py-1 text-indigo-800 dark:bg-indigo-950/60 dark:text-indigo-200">
          <span className="text-lg leading-none font-semibold tabular-nums">{counts.accountsWithoutPets}</span>
          <span className="text-xs">{counts.accountsWithoutPets === 1 ? c.nouns.person.one : c.nouns.person.other}</span>
        </span>
      </div>
      <p className={`text-xs text-muted-foreground ${compact ? "sr-only lg:not-sr-only" : ""}`}>
        {fill(r.reaches, { pets: countOf(counts.pets, "pet"), accounts: countOf(counts.accountsWithoutPets, "person") })}
      </p>
      {counts.skippedPets > 0 ? (
        <p className="text-xs text-amber-700 dark:text-amber-400">{plural(counts.skippedPets, r.skippedPets)}</p>
      ) : null}
      {counts.skippedPeople > 0 ? (
        <p className="text-xs text-amber-700 dark:text-amber-400">{plural(counts.skippedPeople, r.skippedPeople)}</p>
      ) : null}
    </div>
  );
}
