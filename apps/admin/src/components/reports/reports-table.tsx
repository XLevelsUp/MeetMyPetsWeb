"use client";

import Link from "next/link";
import { useCallback } from "react";
import { CheckCircle2, Eye, MoreHorizontal } from "lucide-react";
import { toast } from "sonner";

import { ReportDetailDialog } from "@/components/reports/report-detail-dialog";
import { ReportFilters } from "@/components/reports/report-filters";
import { ReportMediaReveal } from "@/components/reports/report-media-reveal";
import {
  ReportReasonBadge,
  ReportScopeBadge,
  ReportStatusBadge,
  ReportTrustBadge,
} from "@/components/reports/report-badges";
import { formatWhen, revertMessage } from "@/components/reports/report-format";
import { ExportCsvButton } from "@/components/shared/export-csv-button";
import { FetchingOverlay } from "@/components/shared/fetching-overlay";
import { Pagination } from "@/components/shared/pagination";
import { WaitingBadge } from "@/components/shared/waiting-badge";
import { QueryErrorCard } from "@/components/shared/query-error-card";
import { SortableHead } from "@/components/shared/sortable-head";
import { REPORT_CSV_COLUMNS } from "@/components/users/csv-columns";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
import { useUrlSyncedQuery } from "@/hooks/use-url-query";
import { useReports, useResolveReport } from "@/hooks/use-reports";
import {
  DEFAULT_REPORTS_QUERY,
  reportsResponseSchema,
  type ReportsQuery,
} from "@/lib/reports-contract";

const COLUMN_COUNT = 8;

export function ReportsTable({ initialQuery }: { initialQuery: ReportsQuery }) {
  // URL-synced, so a sorted or filtered queue is linkable and survives a
  // reload. The queue still opens on the work: `status` defaults to pending.
  const [query, setQuery] = useUrlSyncedQuery(initialQuery, DEFAULT_REPORTS_QUERY, {
    active: true,
  });

  // Stable identity so the filters' debounce effect doesn't re-run every render.
  const handleFilterChange = useCallback(
    (next: Partial<ReportsQuery>) => {
      setQuery((prev) => ({ ...prev, ...next, page: 1 }));
    },
    [setQuery],
  );

  /** Re-sorting returns to page 1 — page 3 of a new ordering is meaningless. */
  const handleSort = useCallback(
    (sort: ReportsQuery["sort"], dir: ReportsQuery["dir"]) => {
      setQuery((prev) => ({ ...prev, sort, dir, page: 1 }));
    },
    [setQuery],
  );

  const reports = useReports(query);
  const resolve = useResolveReport();

  const handleQuickResolve = useCallback(
    async (reportId: string, resolution: "dismissed" | "reviewed") => {
      try {
        const res = await resolve.mutateAsync({
          id: reportId,
          resolution,
          reason:
            resolution === "dismissed"
              ? "Quick dismissed by moderator"
              : "Quick reviewed by moderator",
        });
        if (res.revert) {
          toast.success(revertMessage(res.revert, "did"));
        } else {
          toast.success(`Report ${resolution}.`);
        }
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Failed to resolve report.");
      }
    },
    [resolve],
  );

  const isFiltered =
    Boolean(query.q) ||
    query.status !== "pending" ||
    query.reason !== "all" ||
    query.scope !== "all" ||
    query.repeatOnly ||
    query.mediaType !== "all";

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <ReportFilters query={query} onChange={handleFilterChange} />
        <div className="shrink-0 pt-0.5">
          <ExportCsvButton
            endpoint="/api/v1/admin/reports"
            query={query}
            filenamePrefix="content-reports"
            parse={(json) => reportsResponseSchema.parse(json)}
            columns={REPORT_CSV_COLUMNS}
          />
        </div>
      </div>

      {reports.isError ? (
        <QueryErrorCard message={reports.error.message} onRetry={() => reports.refetch()} />
      ) : (
        <>
          <FetchingOverlay isFetching={reports.isFetching && !reports.isPending}>
          <div className="overflow-x-auto rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-16">Media</TableHead>
                  <SortableHead
                    column="created_at"
                    label="Filed Date"
                    activeColumn={query.sort}
                    direction={query.dir}
                    defaultDirection="desc"
                    onSort={handleSort}
                  />
                  <TableHead>{copy.reports.columns.reported}</TableHead>
                  <SortableHead
                    column="reason"
                    label={copy.reports.columns.reason}
                    activeColumn={query.sort}
                    direction={query.dir}
                    onSort={handleSort}
                  />
                  {/* context_entity_type is 'post' or NULL, so a sort here
                      would barely move and read as broken. The scope FILTER
                      above already separates them. */}
                  <TableHead>{copy.reports.columns.scope}</TableHead>
                  <SortableHead
                    column="trust"
                    label={copy.reports.columns.trust}
                    activeColumn={query.sort}
                    direction={query.dir}
                    // Lowest first: the pets closest to a ban are the triage.
                    defaultDirection="asc"
                    onSort={handleSort}
                  />
                  <SortableHead
                    column="status"
                    label={copy.reports.columns.status}
                    activeColumn={query.sort}
                    direction={query.dir}
                    onSort={handleSort}
                  />
                  <TableHead className="sr-only">{copy.reports.details}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {reports.isPending ? (
                  Array.from({ length: 8 }).map((_, index) => (
                    <TableRow key={index}>
                      {Array.from({ length: COLUMN_COUNT }).map((__, cell) => (
                        <TableCell key={cell}>
                          <Skeleton className="h-5 w-full" />
                        </TableCell>
                      ))}
                    </TableRow>
                  ))
                ) : reports.data.items.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={COLUMN_COUNT}
                      className="py-10 text-center text-muted-foreground"
                    >
                      {isFiltered ? copy.reports.emptyFiltered : copy.reports.empty}
                    </TableCell>
                  </TableRow>
                ) : (
                  reports.data.items.map((report) => (
                    <TableRow key={report.id}>
                      <TableCell className="w-16 p-2 align-middle">
                        <ReportMediaReveal
                          media={report.media}
                          alt={report.reportedPetName ?? "Reported content"}
                          size="sm"
                        />
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-sm text-muted-foreground">
                        {/* Inline: a stacked badge doubled every row's height. */}
                        <div className="flex items-center gap-1.5">
                          {formatWhen(report.createdAt)}
                          {/* Only while unresolved: a closed report's age is history, not work. */}
                          {report.status === "pending" ? (
                            <WaitingBadge since={report.createdAt} />
                          ) : null}
                        </div>
                      </TableCell>
                      <TableCell>
                        {/* Falls back to the id rather than a dash: a moderator
                            can still act on a report whose pet row is gone. */}
                        <span className="block text-sm font-medium">
                          {report.reportedPetName ?? report.reportedPetId}
                        </span>
                        {report.reportedOwnerAccountId ? (
                          <Link
                            href={`/users/${report.reportedOwnerAccountId}`}
                            className="block text-xs text-muted-foreground underline-offset-4 hover:underline hover:text-foreground"
                          >
                            {report.reportedOwnerEmail ?? copy.reports.detailDialog.openAccount}
                          </Link>
                        ) : null}
                      </TableCell>
                      <TableCell>
                        <ReportReasonBadge reason={report.reason} />
                        {report.reportsAgainstPet > 1 ? (
                          <span className="mt-0.5 block text-xs text-muted-foreground">
                            {report.reportsAgainstPet} total
                          </span>
                        ) : null}
                      </TableCell>
                      <TableCell>
                        <ReportScopeBadge scope={report.scope} />
                      </TableCell>
                      <TableCell>
                        <ReportTrustBadge trust={report.trust} />
                      </TableCell>
                      <TableCell>
                        <ReportStatusBadge status={report.status} />
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <ReportDetailDialog report={report} />
                          {report.status === "pending" ? (
                            <DropdownMenu>
                              <DropdownMenuTrigger
                                render={
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-8 w-8 p-0"
                                    aria-label="Quick actions"
                                  />
                                }
                              >
                                <MoreHorizontal className="size-4" aria-hidden="true" />
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="w-48">
                                <DropdownMenuItem
                                  onClick={() => handleQuickResolve(report.id, "dismissed")}
                                  className="text-emerald-700 dark:text-emerald-400 focus:text-emerald-800"
                                >
                                  <CheckCircle2 className="size-4 text-emerald-600" />
                                  Dismiss & refund trust
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() => handleQuickResolve(report.id, "reviewed")}
                                >
                                  <Eye className="size-4 text-sky-600" />
                                  Mark reviewed
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          ) : null}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
          </FetchingOverlay>

          {reports.data ? (
            <Pagination
              page={reports.data.page}
              pageSize={reports.data.pageSize}
              total={reports.data.total}
              onPageChange={(page) => setQuery((prev) => ({ ...prev, page }))}
            />
          ) : null}
        </>
      )}
    </div>
  );
}
