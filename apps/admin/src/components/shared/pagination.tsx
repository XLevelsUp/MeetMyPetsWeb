"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { useId } from "react";

import { PAGE_SIZE_OPTIONS, pageItems } from "@/components/shared/pagination-items";
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
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const first = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const last = Math.min(page * pageSize, total);
  const items = pageItems(page, totalPages);
  // A size reached by URL (e.g. 30) still appears, so the picker never shows a blank value.
  const sizes = [...new Set<number>([...PAGE_SIZE_OPTIONS, pageSize])].sort((a, b) => a - b);

  return (
    <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
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

      <nav aria-label={t.label} className="flex items-center gap-1">
        <Button
          variant="outline"
          size="sm"
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
          aria-label={t.previous}
        >
          <ChevronLeft aria-hidden />
          <span className="hidden sm:inline">{t.previous}</span>
        </Button>

        {/* Phones get "Page 3 of 9" instead of the number row, which would not fit. */}
        <span className="px-2 text-sm text-muted-foreground tabular-nums sm:hidden">
          {t.page} {page} {t.of} {totalPages}
        </span>

        <ul className="hidden items-center gap-1 sm:flex">
          {items.map((item) =>
            typeof item === "number" ? (
              <li key={item}>
                <Button
                  variant={item === page ? "default" : "ghost"}
                  size="icon-sm"
                  className={cn("min-w-7 w-auto px-2 tabular-nums", item === page && "pointer-events-none")}
                  aria-label={`${t.page} ${item}`}
                  aria-current={item === page ? "page" : undefined}
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
          disabled={page >= totalPages}
          onClick={() => onPageChange(page + 1)}
          aria-label={t.next}
        >
          <span className="hidden sm:inline">{t.next}</span>
          <ChevronRight aria-hidden />
        </Button>
      </nav>
    </div>
  );
}
