"use client";

import Link from "next/link";
import {
  AlertTriangle,
  Ban,
  Clock,
  MessageSquareWarning,
  Search,
  Shield,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { ExportCsvButton } from "@/components/shared/export-csv-button";
import { FetchingOverlay } from "@/components/shared/fetching-overlay";
import { Pagination } from "@/components/shared/pagination";
import { WaitingBadge } from "@/components/shared/waiting-badge";
import { QueryErrorCard } from "@/components/shared/query-error-card";
import {
  TrustOverdueBadge,
  TrustScoreBadge,
  TrustStatusBadge,
} from "@/components/trust/trust-badges";
import { formatDate, statusLabel } from "@/components/trust/trust-format";
import { TrustReviewDialog } from "@/components/trust/trust-review-dialog";
import { TRUST_CSV_COLUMNS } from "@/components/users/csv-columns";
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
import { useUrlSyncedQuery } from "@/hooks/use-url-query";
import { canAct, type AdminRole } from "@/lib/roles";
import { TRUST_STATUSES } from "@/lib/trust-constants";
import {
  DEFAULT_TRUST_QUERY,
  trustQueueResponseSchema,
  type TrustQuery,
} from "@/lib/trust-contract";

const COLUMN_COUNT = 6;

/**
 * Trust Review Queue Table
 * - Color-coded status pills & trust score meters
 * - Smooth FetchingOverlay for filtering, searching, and paging
 * - Top KPI summary cards with 1-click filter activation
 * - Direct links to Content Reports
 * - CSV export
 */
export function TrustTable({
  role,
  initialQuery = DEFAULT_TRUST_QUERY,
}: {
  role: AdminRole;
  initialQuery?: TrustQuery;
}) {
  const [query, setQuery] = useUrlSyncedQuery(initialQuery, DEFAULT_TRUST_QUERY, {
    active: true,
  });

  const [draft, setDraft] = useState(query.q ?? "");
  const committed = useRef(query.q ?? "");

  useEffect(() => {
    if (draft === committed.current) return;
    const timer = setTimeout(() => {
      committed.current = draft;
      setQuery((prev) => ({ ...prev, q: draft || undefined, page: 1 }));
    }, 300);
    return () => clearTimeout(timer);
  }, [draft, setQuery]);

  const trust = useTrustQueue(query);
  const items = useMemo(() => trust.data?.items ?? [], [trust.data]);

  const canRestore = canAct(role, "restore");
  const isFiltered = Boolean(query.q) || query.status !== "all" || query.overdueOnly;

  // KPI calculations based on current loaded items or total
  const kpiStats = useMemo(() => {
    const overdue = items.filter((i) => i.reviewOverdue).length;
    const tempBanned = items.filter((i) => i.status === "temporary_banned").length;
    const warnings = items.filter((i) => i.status === "warning").length;
    const permBanned = items.filter((i) => i.status === "permanently_banned").length;
    return { overdue, tempBanned, warnings, permBanned };
  }, [items]);

  const handleFilterChange = useCallback(
    (next: Partial<TrustQuery>) => {
      setQuery((prev) => ({ ...prev, ...next, page: 1 }));
    },
    [setQuery],
  );

  return (
    <div className="flex flex-col gap-4">
      {/* Top KPI Cards (Clickable Quick Filters) */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {/* Overdue Card */}
        <button
          type="button"
          onClick={() => handleFilterChange({ overdueOnly: !query.overdueOnly, status: "all" })}
          className={`flex flex-col gap-1 p-3.5 rounded-xl border text-left transition-all hover:scale-[1.01] ${
            query.overdueOnly
              ? "border-rose-400 bg-rose-50/80 dark:border-rose-700 dark:bg-rose-950/40 ring-2 ring-rose-400/50"
              : "border-border/80 bg-card hover:bg-muted/40 shadow-2xs"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <AlertTriangle className="size-3.5 text-rose-600 dark:text-rose-400" />
              Overdue Reviews
            </span>
            <span className="text-base font-bold text-rose-700 dark:text-rose-400">
              {kpiStats.overdue}
            </span>
          </div>
          <span className="text-[11px] text-muted-foreground">Urgent moderation needed</span>
        </button>

        {/* Temporary Banned Card */}
        <button
          type="button"
          onClick={() =>
            handleFilterChange({
              status: query.status === "temporary_banned" ? "all" : "temporary_banned",
              overdueOnly: false,
            })
          }
          className={`flex flex-col gap-1 p-3.5 rounded-xl border text-left transition-all hover:scale-[1.01] ${
            query.status === "temporary_banned"
              ? "border-orange-400 bg-orange-50/80 dark:border-orange-700 dark:bg-orange-950/40 ring-2 ring-orange-400/50"
              : "border-border/80 bg-card hover:bg-muted/40 shadow-2xs"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <Clock className="size-3.5 text-orange-600 dark:text-orange-400" />
              Temporary Bans
            </span>
            <span className="text-base font-bold text-orange-700 dark:text-orange-400">
              {kpiStats.tempBanned}
            </span>
          </div>
          <span className="text-[11px] text-muted-foreground">7-day review queue</span>
        </button>

        {/* Warnings Card */}
        <button
          type="button"
          onClick={() =>
            handleFilterChange({
              status: query.status === "warning" ? "all" : "warning",
              overdueOnly: false,
            })
          }
          className={`flex flex-col gap-1 p-3.5 rounded-xl border text-left transition-all hover:scale-[1.01] ${
            query.status === "warning"
              ? "border-amber-400 bg-amber-50/80 dark:border-amber-700 dark:bg-amber-950/40 ring-2 ring-amber-400/50"
              : "border-border/80 bg-card hover:bg-muted/40 shadow-2xs"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <Shield className="size-3.5 text-amber-600 dark:text-amber-400" />
              Active Warnings
            </span>
            <span className="text-base font-bold text-amber-700 dark:text-amber-400">
              {kpiStats.warnings}
            </span>
          </div>
          <span className="text-[11px] text-muted-foreground">Score dropped to 100–250</span>
        </button>

        {/* Permanent Bans Card */}
        <button
          type="button"
          onClick={() =>
            handleFilterChange({
              status: query.status === "permanently_banned" ? "all" : "permanently_banned",
              overdueOnly: false,
            })
          }
          className={`flex flex-col gap-1 p-3.5 rounded-xl border text-left transition-all hover:scale-[1.01] ${
            query.status === "permanently_banned"
              ? "border-rose-400 bg-rose-50/80 dark:border-rose-700 dark:bg-rose-950/40 ring-2 ring-rose-400/50"
              : "border-border/80 bg-card hover:bg-muted/40 shadow-2xs"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <Ban className="size-3.5 text-rose-600 dark:text-rose-400" />
              Permanent Bans
            </span>
            <span className="text-base font-bold text-rose-700 dark:text-rose-400">
              {kpiStats.permBanned}
            </span>
          </div>
          <span className="text-[11px] text-muted-foreground">Locked accounts</span>
        </button>
      </div>

      {/* Toolbar: Search, Filters & CSV Export */}
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

        <div className="flex flex-wrap items-end justify-between gap-3">
          <div className="flex flex-wrap items-end gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="trust-status">{copy.trust.filters.status}</Label>
              <Select
                value={query.status}
                onValueChange={(value) =>
                  handleFilterChange({
                    status: (value ?? "all") as TrustQuery["status"],
                  })
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

            {/* Overdue quick toggle chip */}
            <Button
              variant={query.overdueOnly ? "default" : "outline"}
              size="sm"
              aria-pressed={query.overdueOnly}
              onClick={() => handleFilterChange({ overdueOnly: !query.overdueOnly })}
              className={query.overdueOnly ? "bg-rose-600 hover:bg-rose-700 text-white" : ""}
            >
              <AlertTriangle className="size-3.5 mr-1" />
              {copy.trust.filters.overdue}
            </Button>

            {isFiltered && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setDraft("");
                  committed.current = "";
                  handleFilterChange({
                    q: undefined,
                    status: "all",
                    overdueOnly: false,
                  });
                }}
              >
                {copy.trust.filters.clear}
              </Button>
            )}
          </div>

          {/* Export CSV Button */}
          <div className="shrink-0 pt-0.5">
            <ExportCsvButton
              endpoint="/api/v1/admin/trust"
              query={query}
              filenamePrefix="trust-reviews"
              parse={(json) => trustQueueResponseSchema.parse(json)}
              columns={TRUST_CSV_COLUMNS}
            />
          </div>
        </div>
      </div>

      {/* Main Table */}
      {trust.isError ? (
        <QueryErrorCard message={trust.error.message} onRetry={() => trust.refetch()} />
      ) : (
        <>
          <FetchingOverlay isFetching={trust.isFetching && !trust.isPending}>
            <div className="overflow-x-auto rounded-lg border bg-card">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{copy.trust.columns.pet}</TableHead>
                    <TableHead>{copy.trust.columns.status}</TableHead>
                    <TableHead>{copy.trust.columns.score}</TableHead>
                    <TableHead>{copy.trust.columns.reviewDue}</TableHead>
                    <TableHead>{copy.trust.columns.reports}</TableHead>
                    <TableHead className="text-right">Action</TableHead>
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
                  ) : items.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={COLUMN_COUNT}
                        className="py-10 text-center text-muted-foreground"
                      >
                        {isFiltered ? copy.trust.emptyFiltered : copy.trust.empty}
                      </TableCell>
                    </TableRow>
                  ) : (
                    items.map((entry) => (
                      <TableRow key={entry.petId} className="hover:bg-muted/40 transition-colors">
                        {/* Pet Name & Owner Link */}
                        <TableCell>
                          <span className="block text-sm font-semibold text-foreground">
                            {entry.petName ?? entry.petId}
                          </span>
                          {entry.ownerAccountId ? (
                            <Link
                              href={`/users/${entry.ownerAccountId}`}
                              className="block text-xs text-muted-foreground underline-offset-4 hover:underline hover:text-foreground"
                              title={`View owner profile (${entry.ownerEmail || entry.ownerAccountId})`}
                            >
                              {entry.ownerEmail ?? "View Owner Profile"}
                            </Link>
                          ) : null}
                        </TableCell>

                        {/* Status Badge with Color Theory */}
                        <TableCell>
                          <TrustStatusBadge status={entry.status} />
                        </TableCell>

                        {/* Trust Score Gauge */}
                        <TableCell>
                          <TrustScoreBadge score={entry.score} />
                        </TableCell>

                        {/* Review Due Date & Overdue Tag */}
                        <TableCell className="whitespace-nowrap text-sm">
                          {entry.status === "permanently_banned" ? (
                            <span className="text-muted-foreground text-xs italic">
                              {copy.trust.permanentNoReview}
                            </span>
                          ) : entry.reviewOverdue ? (
                            <div className="flex items-center gap-1.5">
                              <TrustOverdueBadge dueAt={entry.reviewDueAt} />
                              <span className="text-xs text-muted-foreground">
                                ({formatDate(entry.reviewDueAt)})
                              </span>
                            </div>
                          ) : entry.reviewDueAt ? (
                            <span className="text-muted-foreground text-xs">
                              {formatDate(entry.reviewDueAt)}
                            </span>
                          ) : (
                            /* The warning band gets no review date from the app, so
                               without this a pet could sit here unnoticed for months. */
                            <WaitingBadge since={entry.banStartedAt} />
                          )}
                        </TableCell>

                        {/* Report Count (Direct Link to Content Moderation) */}
                        <TableCell>
                          {entry.reportCount > 0 ? (
                            <Link
                              href={`/reports?q=${entry.petId}`}
                              className="inline-flex items-center gap-1 text-xs font-semibold text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 px-2 py-0.5 rounded-full border border-amber-200 dark:border-amber-800/40 hover:underline"
                              title="Click to view reported posts and profile reports"
                            >
                              <MessageSquareWarning className="size-3" />
                              <span>{entry.reportCount} {entry.reportCount === 1 ? "report" : "reports"}</span>
                            </Link>
                          ) : (
                            <span className="text-xs text-muted-foreground tabular-nums">0</span>
                          )}
                        </TableCell>

                        {/* Action Review Dialog */}
                        <TableCell className="text-right">
                          <TrustReviewDialog entry={entry} canRestore={canRestore} />
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </FetchingOverlay>

          {trust.data && (
            <Pagination
              page={trust.data.page}
              pageSize={trust.data.pageSize}
              total={trust.data.total}
              onPageChange={(page) => handleFilterChange({ page })}
            />
          )}
        </>
      )}
    </div>
  );
}
