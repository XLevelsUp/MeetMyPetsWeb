"use client";

import { Button } from "@/components/ui/button";
import { copy } from "@/config/admin";

/**
 * "There is nothing" and "your filters matched nothing" are different problems
 * and want different sentences — the first is a fact about the data, the second
 * is something the reader can undo. So the filtered variant also offers the
 * way out, rather than leaving them to find the control that caused it.
 */
export function EmptyState({
  hasFilters,
  onClear,
}: {
  hasFilters: boolean;
  onClear: () => void;
}) {
  if (!hasFilters) return <p className="text-muted-foreground">{copy.users.empty}</p>;

  return (
    <div className="flex flex-col items-center gap-2">
      <p className="text-muted-foreground">{copy.users.emptyFiltered}</p>
      <Button variant="outline" size="sm" onClick={onClear}>
        {copy.users.clearFilters}
      </Button>
    </div>
  );
}
