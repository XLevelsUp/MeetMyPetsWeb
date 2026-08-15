"use client";

import Link from "next/link";
import { useCallback, useState } from "react";

import { ReportDetailDialog } from "@/components/reports/report-detail-dialog";
import { ReportFilters } from "@/components/reports/report-filters";
import {
  formatWhen,
  reasonLabel,
  scopeLabel,
  statusLabel,
  statusVariant,
  trustLabel,
  trustVariant,
} from "@/components/reports/report-format";
import { Pagination } from "@/components/shared/pagination";
import { QueryErrorCard } from "@/components/shared/query-error-card";
import { Badge } from "@/components/ui/badge";
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
import { useReports } from "@/hooks/use-reports";
import { DEFAULT_PAGE_SIZE } from "@/lib/contract-shared";
import type { ReportsQuery } from "@/lib/reports-contract";

const COLUMN_COUNT = 7;

export function ReportsTable({ initialStatus }: { initialStatus?: ReportsQuery["status"] }) {
  const [query, setQuery] = useState<ReportsQuery>({
    page: 1,
    pageSize: DEFAULT_PAGE_SIZE,
    q: undefined,
    // The queue opens on the work: pending unless a deep link says otherwise.
    status: initialStatus ?? "pending",
    reason: "all",
    scope: "all",
  });

  // Stable identity so the filters' debounce effect doesn't re-run every render.
  const handleFilterChange = useCallback((next: Partial<ReportsQuery>) => {
    setQuery((prev) => ({ ...prev, ...next, page: 1 }));
  }, []);

  const reports = useReports(query);
  const isFiltered =
    Boolean(query.q) ||
    query.status !== "pending" ||
    query.reason !== "all" ||
    query.scope !== "all";

  return (
    <div className="flex flex-col gap-4">
      <ReportFilters query={query} onChange={handleFilterChange} />

      {reports.isError ? (
        <QueryErrorCard message={reports.error.message} onRetry={() => reports.refetch()} />
      ) : (
        <>
          <div className="overflow-x-auto rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{copy.reports.columns.when}</TableHead>
                  <TableHead>{copy.reports.columns.reported}</TableHead>
                  <TableHead>{copy.reports.columns.reason}</TableHead>
                  <TableHead>{copy.reports.columns.scope}</TableHead>
                  <TableHead>{copy.reports.columns.trust}</TableHead>
                  <TableHead>{copy.reports.columns.status}</TableHead>
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
                      <TableCell className="whitespace-nowrap text-muted-foreground">
                        {formatWhen(report.createdAt)}
                      </TableCell>
                      <TableCell>
                        {/* Falls back to the id rather than a dash: a moderator
                            can still act on a report whose pet row is gone. */}
                        <span className="block text-sm">
                          {report.reportedPetName ?? report.reportedPetId}
                        </span>
                        {report.reportedOwnerAccountId ? (
                          <Link
                            href={`/users/${report.reportedOwnerAccountId}`}
                            className="block text-xs text-muted-foreground underline-offset-4 hover:underline"
                          >
                            {report.reportedOwnerEmail ?? copy.reports.detailDialog.openAccount}
                          </Link>
                        ) : null}
                      </TableCell>
                      <TableCell>
                        <span className="text-sm">{reasonLabel(report.reason)}</span>
                        {report.reportsAgainstPet > 1 ? (
                          <span className="block text-xs text-muted-foreground">
                            {report.reportsAgainstPet} total
                          </span>
                        ) : null}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {scopeLabel(report.scope)}
                      </TableCell>
                      <TableCell>
                        <Badge variant={trustVariant(report.trust.status)}>
                          {report.trust.score ?? trustLabel(report.trust.status)}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={statusVariant(report.status)}>
                          {statusLabel(report.status)}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <ReportDetailDialog report={report} />
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

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
