"use client";

import Link from "next/link";
import { useCallback, useState } from "react";

import { AuditDetailDialog } from "@/components/audit/audit-detail-dialog";
import { AuditFilters } from "@/components/audit/audit-filters";
import { actionLabel, formatWhen } from "@/components/audit/audit-format";
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
import { useAuditLogs } from "@/hooks/use-audit";
import type { AuditQuery } from "@/lib/audit-contract";

const PAGE_SIZE = 25;
const COLUMN_COUNT = 6;

export function AuditTable({ initialTargetId }: { initialTargetId?: string }) {
  const [query, setQuery] = useState<AuditQuery>({
    page: 1,
    pageSize: PAGE_SIZE,
    // A deep link from a user's moderation history pre-filters to that target.
    q: initialTargetId,
    action: "all",
    targetType: "all",
    from: undefined,
    to: undefined,
  });

  // Stable identity so the filters' debounce effect doesn't re-run every render.
  const handleFilterChange = useCallback((next: Partial<AuditQuery>) => {
    setQuery((prev) => ({ ...prev, ...next, page: 1 }));
  }, []);

  const logs = useAuditLogs(query);
  const isFiltered =
    Boolean(query.q) || query.action !== "all" || query.targetType !== "all" || query.from || query.to;

  return (
    <div className="flex flex-col gap-4">
      <AuditFilters query={query} onChange={handleFilterChange} />

      {logs.isError ? (
        <QueryErrorCard message={logs.error.message} onRetry={() => logs.refetch()} />
      ) : (
        <>
          <div className="overflow-x-auto rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{copy.audit.columns.when}</TableHead>
                  <TableHead>{copy.audit.columns.actor}</TableHead>
                  <TableHead>{copy.audit.columns.action}</TableHead>
                  <TableHead>{copy.audit.columns.target}</TableHead>
                  <TableHead>{copy.audit.columns.reason}</TableHead>
                  <TableHead className="sr-only">{copy.audit.details}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {logs.isPending ? (
                  Array.from({ length: 8 }).map((_, index) => (
                    <TableRow key={index}>
                      {Array.from({ length: COLUMN_COUNT }).map((__, cell) => (
                        <TableCell key={cell}>
                          <Skeleton className="h-5 w-full" />
                        </TableCell>
                      ))}
                    </TableRow>
                  ))
                ) : logs.data.items.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={COLUMN_COUNT}
                      className="py-10 text-center text-muted-foreground"
                    >
                      {isFiltered ? copy.audit.emptyFiltered : copy.audit.empty}
                    </TableCell>
                  </TableRow>
                ) : (
                  logs.data.items.map((entry) => (
                    <TableRow key={entry.id}>
                      <TableCell className="whitespace-nowrap text-muted-foreground">
                        {formatWhen(entry.createdAt)}
                      </TableCell>
                      <TableCell>
                        <span className="block text-sm">{entry.actorEmail}</span>
                        <span className="block text-xs text-muted-foreground">
                          {entry.actorRole}
                        </span>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">{actionLabel(entry.action)}</Badge>
                      </TableCell>
                      <TableCell>
                        {entry.targetType === "account" ? (
                          <Link
                            href={`/users/${entry.targetId}`}
                            className="text-sm underline-offset-4 hover:underline"
                          >
                            {copy.audit.viewAccount}
                          </Link>
                        ) : (
                          <span className="text-sm text-muted-foreground">
                            {copy.audit.targetTypes.pet}
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="max-w-md">
                        <span className="line-clamp-2 text-sm">{entry.reason}</span>
                      </TableCell>
                      <TableCell className="text-right">
                        <AuditDetailDialog entry={entry} />
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {logs.data ? (
            <Pagination
              page={logs.data.page}
              pageSize={logs.data.pageSize}
              total={logs.data.total}
              onPageChange={(page) => setQuery((prev) => ({ ...prev, page }))}
            />
          ) : null}
        </>
      )}
    </div>
  );
}
