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

/** The last page that has rows; 1 when the list is empty. */
export function lastPage(total: number, pageSize: number): number {
  return Math.max(1, Math.ceil(total / Math.max(1, pageSize)));
}

/** A page past the end (rows resolved away, or an old link) is pulled back to the last real page. */
export function clampPage(page: number, total: number, pageSize: number): number {
  return Math.min(Math.max(1, page), lastPage(total, pageSize));
}

/** "Showing first–last" for a page, computed on the clamped page so it can never read "26–25". */
export function pageRange(page: number, total: number, pageSize: number): { first: number; last: number } {
  if (total <= 0) return { first: 0, last: 0 };
  const shown = clampPage(page, total, pageSize);
  return { first: (shown - 1) * pageSize + 1, last: Math.min(shown * pageSize, total) };
}
