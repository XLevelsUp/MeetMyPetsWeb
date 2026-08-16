"use client";

import { ArrowDown, ArrowUp, ChevronsUpDown } from "lucide-react";

import { TableHead } from "@/components/ui/table";
import { cn } from "@/lib/utils";

/**
 * A column header that sorts.
 *
 * `aria-sort` on the `<th>` is the part that matters and the reason this is a
 * component rather than an icon dropped next to a label: a screen-reader user
 * has no other way to know which column the table is ordered by, or in which
 * direction. A decorative caret alone is not an acceptable substitute.
 *
 * The whole header is one button, so the click target is the full cell rather
 * than a caret smaller than the 44px minimum.
 */

export type SortDirection = "asc" | "desc";

export function SortableHead<TColumn extends string>({
  column,
  label,
  activeColumn,
  direction,
  /** Direction applied when this column is picked from cold. */
  defaultDirection = "asc",
  /** `end` for numeric columns, so the header sits over its right-aligned values. */
  align = "start",
  onSort,
  className,
}: {
  column: TColumn;
  label: string;
  activeColumn: TColumn;
  direction: SortDirection;
  defaultDirection?: SortDirection;
  align?: "start" | "end";
  onSort: (column: TColumn, direction: SortDirection) => void;
  className?: string;
}) {
  const isActive = activeColumn === column;
  const next: SortDirection = isActive
    ? direction === "asc"
      ? "desc"
      : "asc"
    : defaultDirection;

  const Icon = !isActive ? ChevronsUpDown : direction === "asc" ? ArrowUp : ArrowDown;

  return (
    <TableHead
      aria-sort={isActive ? (direction === "asc" ? "ascending" : "descending") : "none"}
      className={cn("p-0", className)}
    >
      <button
        type="button"
        onClick={() => onSort(column, next)}
        className={cn(
          "flex w-full items-center gap-1.5 px-2 py-2.5 font-medium transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
          align === "end" ? "justify-end" : "justify-start text-left",
        )}
      >
        {label}
        <Icon
          aria-hidden="true"
          className={cn("size-3.5 shrink-0", isActive ? "text-foreground" : "text-muted-foreground/60")}
        />
      </button>
    </TableHead>
  );
}
