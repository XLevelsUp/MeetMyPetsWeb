"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { useEffect, useId, useRef } from "react";

import { clampPage, lastPage, PAGE_SIZE_OPTIONS, pageItems, pageRange } from "@/components/shared/pagination-items";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { copy } from "@/config/admin";
import { cn } from "@/lib/utils";

const t = copy.common.pagination;

/** Range summary, rows-per-page picker and numbered pages, shared by every paginated admin list. */
export function Pagination({
  page,
  pageSize,
  total,
  onPageChange,
  onPageSizeChange,
}: {
  page: number;
  pageSize: number;
  total: number;
  onPageChange: (page: number) => void;
  /** Omit to hide the rows-per-page picker; callers should reset to page 1 when it changes. */
  onPageSizeChange?: (pageSize: number) => void;
}) {
  const pickerId = useId();
  const totalPages = lastPage(total, pageSize);
  const shownPage = clampPage(page, total, pageSize);
  const { first, last } = pageRange(page, total, pageSize);
  const items = pageItems(shownPage, totalPages);

  // Past the end (rows resolved away, or an old link): move to the last real page, asking once per target.
  // `page` is the server's echo and stays stale until the corrected page loads, so without the ref this would re-fire every render.
  const requested = useRef<number | null>(null);
  useEffect(() => {
    if (page === shownPage) {
      requested.current = null;
      return;
    }
    if (requested.current === shownPage) return;
    requested.current = shownPage;
    onPageChange(shownPage);
  }, [page, shownPage, onPageChange]);
  // A size reached by URL (e.g. 30) still appears, so the picker never shows a blank value.
  const sizes = [...new Set<number>([...PAGE_SIZE_OPTIONS, pageSize])].sort((a, b) => a - b);

  return (
    // Phones: summary + rows-per-page on one line, a full-width pager below; sm and up: one line.
    <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between sm:gap-x-4 sm:gap-y-2">
      <div className="flex items-center justify-between gap-x-4 gap-y-2 sm:flex-wrap sm:justify-start">
        <p className="text-sm text-muted-foreground tabular-nums">
          {t.showing} {first}–{last} {t.of} {total.toLocaleString("en-IN")}
        </p>
        {onPageSizeChange ? (
          <div className="flex items-center gap-2">
            <label htmlFor={pickerId} className="text-sm text-muted-foreground">
              {t.rowsPerPage}
            </label>
            <Select
              value={String(pageSize)}
              onValueChange={(value) => {
                const next = Number(value);
                if (Number.isFinite(next) && next !== pageSize) onPageSizeChange(next);
              }}
            >
              <SelectTrigger id={pickerId} size="sm" className="w-20">
                <SelectValue />
              </SelectTrigger>
              <SelectContent alignItemWithTrigger={false} align="start">
                {sizes.map((size) => (
                  <SelectItem key={size} value={String(size)}>
                    {size}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        ) : null}
      </div>

      <nav aria-label={t.label} className="flex w-full items-center justify-between gap-1 sm:w-auto sm:justify-start">
        <Button
          variant="outline"
          size="sm"
          disabled={shownPage <= 1}
          onClick={() => onPageChange(shownPage - 1)}
          aria-label={t.previous}
        >
          <ChevronLeft aria-hidden />
          <span className="hidden sm:inline">{t.previous}</span>
        </Button>

        {/* Phones get "Page 3 of 9" instead of the number row, which would not fit. */}
        <span className="flex-1 px-2 text-center text-sm text-muted-foreground tabular-nums sm:hidden">
          {t.page} {shownPage} {t.of} {totalPages}
        </span>

        <ul className="hidden items-center gap-1 sm:flex">
          {items.map((item) =>
            typeof item === "number" ? (
              <li key={item}>
                <Button
                  variant={item === shownPage ? "default" : "ghost"}
                  size="icon-sm"
                  className={cn("min-w-7 w-auto px-2 tabular-nums", item === shownPage && "pointer-events-none")}
                  aria-label={`${t.page} ${item}`}
                  aria-current={item === shownPage ? "page" : undefined}
                  onClick={() => onPageChange(item)}
                >
                  {item}
                </Button>
              </li>
            ) : (
              <li key={item} aria-label={t.morePages} className="px-1 text-sm text-muted-foreground">
                …
              </li>
            ),
          )}
        </ul>

        <Button
          variant="outline"
          size="sm"
          disabled={shownPage >= totalPages}
          onClick={() => onPageChange(shownPage + 1)}
          aria-label={t.next}
        >
          <span className="hidden sm:inline">{t.next}</span>
          <ChevronRight aria-hidden />
        </Button>
      </nav>
    </div>
  );
}
