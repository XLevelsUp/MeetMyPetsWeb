"use client";

import { Button } from "@/components/ui/button";
import { copy } from "@/config/admin";

/**
 * Range summary + prev/next, shared by every paginated admin list.
 *
 * Hand-rolled rather than the shadcn pagination block, which renders one link
 * per page number. These lists page through a callback: some of them mirror the
 * page into the URL (see `useUrlSyncedQuery`) and some do not, and neither
 * wants a rendered link per page across an unbounded total.
 */
export function Pagination({
  page,
  pageSize,
  total,
  onPageChange,
}: {
  page: number;
  pageSize: number;
  total: number;
  onPageChange: (page: number) => void;
}) {
  const first = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const last = Math.min(page * pageSize, total);
  const hasNext = page * pageSize < total;

  return (
    <div className="flex items-center justify-between gap-4">
      <p className="text-sm text-muted-foreground">
        {copy.common.pagination.showing} {first}–{last} of {total}
      </p>
      <div className="flex gap-2">
        <Button
          variant="outline"
          size="sm"
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
        >
          {copy.common.pagination.previous}
        </Button>
        <Button
          variant="outline"
          size="sm"
          disabled={!hasNext}
          onClick={() => onPageChange(page + 1)}
        >
          {copy.common.pagination.next}
        </Button>
      </div>
    </div>
  );
}
