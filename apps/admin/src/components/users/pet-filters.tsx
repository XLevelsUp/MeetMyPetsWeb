"use client";

import { FilterSelect } from "@/components/users/filter-select";
import { copy } from "@/config/admin";
import { useSpeciesOptions } from "@/hooks/use-users";
import type { PetsQuery } from "@/lib/users-contract";

/**
 * Pet-specific filters, rendered inside `ListToolbar`.
 *
 * Species options come from the reference endpoint rather than from the pets on
 * screen, so a species with no pets yet still appears — otherwise the filter
 * could only ever narrow to what is already visible. The list is thin today
 * (2 species in use of 6 defined) and grows with the taxonomy screen.
 *
 * The trust band filter reads on the raw score server-side; "Needs review" is
 * everything the trust ladder does not call normal.
 */
const TRUST_OPTIONS: readonly { value: PetsQuery["trust"]; label: string }[] = [
  { value: "all", label: copy.users.filters.trustAll },
  { value: "at_risk", label: copy.users.filters.trustAtRisk },
  { value: "normal", label: copy.users.filters.trustNormal },
];

export function PetFilters({
  query,
  onChange,
}: {
  query: PetsQuery;
  onChange: (next: Partial<PetsQuery>) => void;
}) {
  const species = useSpeciesOptions();

  // A failed or pending fetch leaves "All species" as the only option rather
  // than an empty dropdown — the filter degrades to a no-op, not to a dead end.
  const speciesOptions = [
    { value: "all", label: copy.users.filters.allSpecies },
    ...(species.data?.items ?? []).map((item) => ({ value: item.id, label: item.name })),
  ];

  return (
    <>
      <FilterSelect
        id="pets-species"
        label={copy.users.filters.species}
        value={query.speciesId}
        options={speciesOptions}
        onChange={(speciesId) => onChange({ speciesId })}
        className="w-44"
      />
      <FilterSelect
        id="pets-trust"
        label={copy.users.filters.trust}
        value={query.trust}
        options={TRUST_OPTIONS}
        onChange={(trust) => onChange({ trust })}
        className="w-40"
      />
    </>
  );
}
