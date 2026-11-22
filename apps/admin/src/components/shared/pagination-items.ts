export const PAGE_SIZE_OPTIONS = [10, 25, 50, 100] as const;

export type PageItem = number | "gap-start" | "gap-end";

/** Page buttons to show: first, last, the current page and `siblings` either side, with gaps as "…". */
export function pageItems(page: number, totalPages: number, siblings = 1): PageItem[] {
  if (totalPages <= 0) return [];
  const current = Math.min(Math.max(1, page), totalPages);
  // first + last + current + 2×siblings + 2 gaps: below that, every page fits without a gap.
  if (totalPages <= 5 + 2 * siblings) return Array.from({ length: totalPages }, (_, i) => i + 1);

  const start = Math.max(2, current - siblings);
  const end = Math.min(totalPages - 1, current + siblings);
  const items: PageItem[] = [1];

  // A gap of exactly one page shows that page instead of "…", which would hide nothing.
  if (start > 3) items.push("gap-start");
  else if (start === 3) items.push(2);

  for (let p = start; p <= end; p++) items.push(p);

  if (end < totalPages - 2) items.push("gap-end");
  else if (end === totalPages - 2) items.push(totalPages - 1);

  items.push(totalPages);
  return items;
}
