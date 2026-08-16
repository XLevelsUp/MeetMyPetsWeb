import { Badge } from "@/components/ui/badge";
import { copy } from "@/config/admin";
import type { Restriction } from "@/lib/users-contract";

/**
 * Shows the account/pet's moderation state. Falls back to the backend's own
 * lifecycle status ("active"/"archived") when we hold no restriction — the two
 * vocabularies are deliberately separate (see lib/users.ts).
 */
export function RestrictionBadge({
  restriction,
  status,
}: {
  restriction: Restriction | null;
  status: string | null;
}) {
  if (restriction) {
    const variant = restriction.kind === "banned" ? "destructive" : "secondary";
    const label = copy.users.statusOptions[restriction.kind];
    return (
      <Badge variant={variant} title={restriction.reason}>
        {label}
      </Badge>
    );
  }

  if (status === "archived") {
    return <Badge variant="outline">{copy.users.statusOptions.archived}</Badge>;
  }
  return <Badge variant="outline">{copy.users.statusOptions.active}</Badge>;
}
