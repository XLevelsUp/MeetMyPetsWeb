"use client";

import Link from "next/link";
import { Search, TriangleAlert } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { Pagination } from "@/components/shared/pagination";
import { QueryErrorCard } from "@/components/shared/query-error-card";
import { TrustReviewDialog } from "@/components/trust/trust-review-dialog";
import { formatDate, statusLabel, statusVariant } from "@/components/trust/trust-format";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { copy } from "@/config/admin";
import { useTrustQueue } from "@/hooks/use-trust";
import { DEFAULT_PAGE_SIZE } from "@/lib/contract-shared";
import type { AdminRole } from "@/lib/roles";
import { USER_ACTION_ROLES } from "@/lib/roles";
import { TRUST_STATUSES } from "@/lib/trust-constants";
import type { TrustQuery } from "@/lib/trust-contract";

const COLUMN_COUNT = 6;

/** `role` comes from the DAL-verified session in the page, never the client. */
export function TrustTable({ role }: { role: AdminRole }) {
  const [query, setQuery] = useState<TrustQuery>({
    page: 1,
    pageSize: DEFAULT_PAGE_SIZE,
    q: undefined,
    status: "all",
    overdueOnly: false,
  });
  const [draft, setDraft] = useState("");
  const committed = useRef("");

  useEffect(() => {
    if (draft === committed.current) return;
    const timer = setTimeout(() => {
      committed.current = draft;
      setQuery((prev) => ({ ...prev, q: draft || undefined, page: 1 }));
    }, 300);
    return () => clearTimeout(timer);
  }, [draft]);

  const trust = useTrustQueue(query);
  // The route enforces this independently; hiding it here just avoids offering
  // a button that would 403.
  const canRestore = USER_ACTION_ROLES.restore.includes(role);
  const isFiltered = Boolean(query.q) || query.status !== "all" || query.overdueOnly;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-3">
        <div className="relative">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden="true"
          />
          <Input
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            placeholder={copy.trust.searchPlaceholder}
            aria-label={copy.trust.searchPlaceholder}
            className="pl-9"
          />
        </div>

        <div className="flex flex-wrap items-end gap-3">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="trust-status">{copy.trust.filters.status}</Label>
            <Select
              value={query.status}
              onValueChange={(value) =>
                setQuery((prev) => ({
                  ...prev,
                  status: (value ?? "all") as TrustQuery["status"],
                  page: 1,
                }))
              }
            >
              <SelectTrigger id="trust-status" className="w-52">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{copy.trust.filters.all}</SelectItem>
                {TRUST_STATUSES.filter((s) => s !== "normal").map((status) => (
                  <SelectItem key={status} value={status}>
                    {statusLabel(status)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Button
            variant={query.overdueOnly ? "default" : "outline"}
            size="sm"
            aria-pressed={query.overdueOnly}
            onClick={() =>
              setQuery((prev) => ({ ...prev, overdueOnly: !prev.overdueOnly, page: 1 }))
            }
          >
            {copy.trust.filters.overdue}
          </Button>

          {isFiltered ? (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setDraft("");
                committed.current = "";
                setQuery((prev) => ({
                  ...prev,
                  q: undefined,
                  status: "all",
                  overdueOnly: false,
                  page: 1,
                }));
              }}
            >
              {copy.trust.filters.clear}
            </Button>
          ) : null}
        </div>
      </div>

      {trust.isError ? (
        <QueryErrorCard message={trust.error.message} onRetry={() => trust.refetch()} />
      ) : (
        <>
          <div className="overflow-x-auto rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{copy.trust.columns.pet}</TableHead>
                  <TableHead>{copy.trust.columns.status}</TableHead>
                  <TableHead>{copy.trust.columns.score}</TableHead>
                  <TableHead>{copy.trust.columns.reviewDue}</TableHead>
                  <TableHead>{copy.trust.columns.reports}</TableHead>
                  <TableHead className="sr-only">{copy.trust.review}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {trust.isPending ? (
                  Array.from({ length: 6 }).map((_, index) => (
                    <TableRow key={index}>
                      {Array.from({ length: COLUMN_COUNT }).map((__, cell) => (
                        <TableCell key={cell}>
                          <Skeleton className="h-5 w-full" />
                        </TableCell>
                      ))}
                    </TableRow>
                  ))
                ) : trust.data.items.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={COLUMN_COUNT}
                      className="py-10 text-center text-muted-foreground"
                    >
                      {isFiltered ? copy.trust.emptyFiltered : copy.trust.empty}
                    </TableCell>
                  </TableRow>
                ) : (
                  trust.data.items.map((entry) => (
                    <TableRow key={entry.petId}>
                      <TableCell>
                        <span className="block text-sm">{entry.petName ?? entry.petId}</span>
                        {entry.ownerAccountId ? (
                          <Link
                            href={`/users/${entry.ownerAccountId}`}
                            className="block text-xs text-muted-foreground underline-offset-4 hover:underline"
                          >
                            {entry.ownerEmail ?? "Open owner"}
                          </Link>
                        ) : null}
                      </TableCell>
                      <TableCell>
                        <Badge variant={statusVariant(entry.status)}>
                          {statusLabel(entry.status)}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm tabular-nums text-muted-foreground">
                        {entry.score}
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-sm">
                        {entry.reviewOverdue ? (
                          <span className="flex items-center gap-1 font-medium text-destructive">
                            <TriangleAlert className="size-3.5" aria-hidden="true" />
                            {formatDate(entry.reviewDueAt)}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">
                            {formatDate(entry.reviewDueAt)}
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {entry.reportCount}
                      </TableCell>
                      <TableCell className="text-right">
                        <TrustReviewDialog entry={entry} canRestore={canRestore} />
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {trust.data ? (
            <Pagination
              page={trust.data.page}
              pageSize={trust.data.pageSize}
              total={trust.data.total}
              onPageChange={(page) => setQuery((prev) => ({ ...prev, page }))}
            />
          ) : null}
        </>
      )}
    </div>
  );
}
