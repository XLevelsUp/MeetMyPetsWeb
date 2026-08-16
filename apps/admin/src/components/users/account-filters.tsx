"use client";

import { FilterSelect } from "@/components/users/filter-select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { copy } from "@/config/admin";
import { TRISTATE, type AccountsQuery, type Tristate } from "@/lib/users-contract";

/**
 * Account-specific filters, rendered inside `ListToolbar`.
 *
 * What is here was decided by the data, not by what the columns happen to be:
 * `email_verified` splits 38/41, "has a phone number" splits 24/41 and "has
 * pets" splits 24/41, so each of the three actually divides the population.
 * A `phone_verified` filter is deliberately absent — the column is false for
 * every account, so it would always return nothing.
 *
 * Dates are native `<input type="date">`, as in audit-filters.tsx: one fewer
 * dependency, and keyboard and screen-reader support come for free.
 */
const TRISTATE_OPTIONS: readonly { value: Tristate; label: string }[] = TRISTATE.map((value) => ({
  value,
  label:
    value === "all" ? copy.users.filters.any : value === "yes" ? copy.users.filters.yes : copy.users.filters.no,
}));

export function AccountFilters({
  query,
  onChange,
}: {
  query: AccountsQuery;
  onChange: (next: Partial<AccountsQuery>) => void;
}) {
  return (
    <>
      <FilterSelect
        id="users-email-verified"
        label={copy.users.filters.emailVerified}
        value={query.emailVerified}
        options={TRISTATE_OPTIONS}
        onChange={(emailVerified) => onChange({ emailVerified })}
        className="w-28"
      />
      <FilterSelect
        id="users-has-phone"
        label={copy.users.filters.hasPhone}
        value={query.hasPhone}
        options={TRISTATE_OPTIONS}
        onChange={(hasPhone) => onChange({ hasPhone })}
        className="w-28"
      />
      <FilterSelect
        id="users-has-pets"
        label={copy.users.filters.hasPets}
        value={query.hasPets}
        options={TRISTATE_OPTIONS}
        onChange={(hasPets) => onChange({ hasPets })}
        className="w-28"
      />

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="users-joined-from">{copy.users.filters.joinedFrom}</Label>
        <Input
          id="users-joined-from"
          type="date"
          className="w-40"
          value={query.joinedFrom ?? ""}
          onChange={(event) => onChange({ joinedFrom: event.target.value || undefined })}
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="users-joined-to">{copy.users.filters.joinedTo}</Label>
        <Input
          id="users-joined-to"
          type="date"
          className="w-40"
          value={query.joinedTo ?? ""}
          onChange={(event) => onChange({ joinedTo: event.target.value || undefined })}
        />
      </div>
    </>
  );
}
