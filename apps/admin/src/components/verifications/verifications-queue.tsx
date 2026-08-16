"use client";

import { FileWarning } from "lucide-react";
import { useCallback, useMemo, useState } from "react";

import { Pagination } from "@/components/shared/pagination";
import { QueryErrorCard } from "@/components/shared/query-error-card";
import { ReviewPane } from "@/components/verifications/review-pane";
import { VerificationFilters } from "@/components/verifications/verification-filters";
import {
  formatWhen,
  statusLabel,
  statusVariant,
  typeLabel,
} from "@/components/verifications/verification-format";
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
import { useCertificates } from "@/hooks/use-verifications";
import { DEFAULT_PAGE_SIZE } from "@/lib/contract-shared";
import type { CertificatesQuery } from "@/lib/verifications-contract";

const COLUMN_COUNT = 5;

export function VerificationsQueue({
  initialStatus,
}: {
  initialStatus?: CertificatesQuery["status"];
}) {
  const [query, setQuery] = useState<CertificatesQuery>({
    page: 1,
    pageSize: DEFAULT_PAGE_SIZE,
    q: undefined,
    status: initialStatus ?? "pending",
    certificateType: "all",
  });
  /** Only an explicit click. The effective selection is derived below. */
  const [pickedId, setPickedId] = useState<string | null>(null);

  const handleFilterChange = useCallback((next: Partial<CertificatesQuery>) => {
    setQuery((prev) => ({ ...prev, ...next, page: 1 }));
  }, []);

  const certificates = useCertificates(query);
  const items = useMemo(() => certificates.data?.items ?? [], [certificates.data]);

  /**
   * Selection is DERIVED, not synchronised in an effect: the head of the queue
   * whenever the picked item isn't in the current list.
   *
   * That one expression covers first paint (land on work, not an empty pane),
   * filter changes, and — the useful one — the moment a decided certificate
   * drops out of the refetched `pending` list, which advances to the next item
   * with no extra machinery and no cascading render.
   */
  const selected = items.find((item) => item.id === pickedId) ?? items[0] ?? null;

  /**
   * After a decision, step forward explicitly. This matters in the `all` view,
   * where the decided row stays in the list and the derivation above would
   * otherwise keep it selected.
   */
  const handleDecided = useCallback(() => {
    const index = items.findIndex((item) => item.id === selected?.id);
    const next = index >= 0 ? items[index + 1] ?? null : null;
    setPickedId(next?.id ?? null);
  }, [items, selected]);

  const isFiltered =
    Boolean(query.q) || query.status !== "pending" || query.certificateType !== "all";

  return (
    <div className="flex flex-col gap-4">
      <VerificationFilters query={query} onChange={handleFilterChange} />

      {certificates.isError ? (
        <QueryErrorCard
          message={certificates.error.message}
          onRetry={() => certificates.refetch()}
        />
      ) : (
        <>
          <div className="overflow-x-auto rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{copy.verifications.columns.submitted}</TableHead>
                  <TableHead>{copy.verifications.columns.pet}</TableHead>
                  <TableHead>{copy.verifications.columns.type}</TableHead>
                  <TableHead>{copy.verifications.columns.document}</TableHead>
                  <TableHead>{copy.verifications.columns.status}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {certificates.isPending ? (
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
                      {isFiltered ? copy.verifications.emptyFiltered : copy.verifications.empty}
                    </TableCell>
                  </TableRow>
                ) : (
                  items.map((item) => (
                    <TableRow
                      key={item.id}
                      onClick={() => setPickedId(item.id)}
                      aria-selected={item.id === selected?.id}
                      tabIndex={0}
                      onKeyDown={(event) => {
                        if (event.key === "Enter" || event.key === " ") {
                          event.preventDefault();
                          setPickedId(item.id);
                        }
                      }}
                      className={
                        item.id === selected?.id
                          ? "cursor-pointer bg-muted"
                          : "cursor-pointer hover:bg-muted/50"
                      }
                    >
                      <TableCell className="whitespace-nowrap text-muted-foreground">
                        {formatWhen(item.createdAt)}
                      </TableCell>
                      <TableCell>
                        <span className="block text-sm">{item.petName ?? item.petId}</span>
                        {item.ownerEmail ? (
                          <span className="block text-xs text-muted-foreground">
                            {item.ownerEmail}
                          </span>
                        ) : null}
                      </TableCell>
                      <TableCell className="text-sm">
                        {typeLabel(item.certificateType)}
                      </TableCell>
                      <TableCell>
                        {item.hasDocument ? (
                          <span className="text-xs text-muted-foreground">
                            {item.mimeType ?? "file"}
                          </span>
                        ) : (
                          // A certificate with no document cannot be judged;
                          // flag it in the list rather than at review time.
                          <span className="flex items-center gap-1 text-xs text-destructive">
                            <FileWarning className="size-3.5" aria-hidden="true" />
                            None
                          </span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant={statusVariant(item.status)}>
                          {statusLabel(item.status)}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {certificates.data ? (
            <Pagination
              page={certificates.data.page}
              pageSize={certificates.data.pageSize}
              total={certificates.data.total}
              onPageChange={(page) => setQuery((prev) => ({ ...prev, page }))}
            />
          ) : null}

          <ReviewPane certificate={selected} onDecided={handleDecided} />
        </>
      )}
    </div>
  );
}
