"use client";

import { AlertTriangle, ScanEye } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useIsMutating } from "@tanstack/react-query";
import { useCallback, useState } from "react";

import { AiMediaReveal } from "@/components/ai-reports/ai-media-reveal";
import { AiOwnerDialog } from "@/components/ai-reports/ai-owner-dialog";
import { AiReportFilters } from "@/components/ai-reports/ai-report-filters";
import {
  formatScore,
  formatWhen,
  mediaLabel,
  rejectionLabel,
} from "@/components/ai-reports/ai-report-format";
import { AiReviewForm } from "@/components/ai-reports/ai-review-form";
import { AiStatusBadge } from "@/components/ai-reports/ai-status-badge";
import { FetchingOverlay } from "@/components/shared/fetching-overlay";
import { Pagination } from "@/components/shared/pagination";
import { QueryErrorCard } from "@/components/shared/query-error-card";
import { SortableHead } from "@/components/shared/sortable-head";
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
import { useAiReports } from "@/hooks/use-ai-reports";
import { reasonCodeLabel, shouldShowReason } from "@/lib/ai-moderation-constants";
import {
  DEFAULT_AI_QUERY,
  type AiDecisionSummary,
  type AiDecisionsQuery,
} from "@/lib/ai-moderation-contract";
import { deriveStatus, isActionable, wasOverturned } from "@/lib/ai-moderation-status";
import { useUrlSyncedQuery } from "@/hooks/use-url-query";

const COLUMN_COUNT = 4;

const r = copy.aiReports.row;

/** "image · post_media" is database language; moderators read "Photo in a post". */
function itemLabel(mediaType: string, contentType: string): string {
  const labels = copy.aiReports.itemLabels as Record<string, string>;
  return labels[`${mediaType}:${contentType}`] ?? `${contentType} · ${mediaType}`;
}

/** The six dimensions, in spec order, so the lowest one can be named. */
/** The model's verdict, its codes and its scores — one cell, read top to bottom. */
function WhatTheAiSaid({ row }: { row: AiDecisionSummary }) {
  const found = row.reasonCodes.filter(shouldShowReason);

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center gap-1.5">
        <AiStatusBadge status={deriveStatus(row)} />
        {/* Both badges are rare, so each has to teach itself to a moderator who has not met it. */}
        {row.hardReject && (
          <Tooltip>
            <TooltipTrigger
              render={
                <span className="inline-flex cursor-help items-center gap-1.5 rounded-full border border-rejected/30 bg-rejected-soft px-2.5 py-0.5 text-xs font-medium text-rejected-fg">
                  <AlertTriangle className="size-3.5" aria-hidden="true" />
                  {r.serious}
                </span>
              }
            />
            <TooltipContent>{r.seriousHelp}</TooltipContent>
          </Tooltip>
        )}
        {row.aiGenerated && (
          <Tooltip>
            <TooltipTrigger
              render={
                <span className="inline-flex cursor-help items-center gap-1.5 rounded-full border border-waiting/30 bg-waiting-soft px-2.5 py-0.5 text-xs font-medium text-waiting-fg">
                  <ScanEye className="size-3.5" aria-hidden="true" />
                  {r.fakeImage}
                  {row.aiScore !== null && ` ${formatScore(row.aiScore)}%`}
                </span>
              }
            />
            <TooltipContent>{r.fakeImageHelp}</TooltipContent>
          </Tooltip>
        )}
      </div>

      {/* The MOD_ number is an internal reference; the sentence is what a moderator needs. */}
      {row.rejectionCode && (
        <p className="text-sm" title={row.rejectionCode}>
          {rejectionLabel(row.rejectionCode)}
        </p>
      )}

      {found.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {found.map((code) => (
            <Badge key={code} variant="outline" className="font-normal">
              {reasonCodeLabel(code)}
            </Badge>
          ))}
        </div>
      )}


    </div>
  );
}

/** What a finished row shows in place of the form. */
function ReviewOutcome({ row }: { row: AiDecisionSummary }) {
  const t = copy.aiReports.review;
  const approved = row.review.finalDecision === "APPROVED";

  return (
    <div className="flex flex-col gap-1.5">
      <p
        className={`flex items-center gap-1.5 text-sm font-semibold ${
          approved ? "text-approved-fg" : "text-rejected-fg"
        }`}
      >
        {approved ? t.outcomePublished : t.outcomeBlocked}
        {row.review.finalRejectionCode && (
          <span className="font-normal text-muted-foreground">
            · {rejectionLabel(row.review.finalRejectionCode)}
          </span>
        )}
      </p>
      <p className="text-sm text-muted-foreground">
        {wasOverturned(row) ? t.overturned : t.agreed}
      </p>
      {row.review.remarks && <p className="text-sm">{row.review.remarks}</p>}
      {/* Who reviewed it is already stated beside the badge; only the time is new here. */}
      <p className="text-sm text-muted-foreground">{formatWhen(row.review.reviewedAt)}</p>
    </div>
  );
}

/** Hours waiting, coloured: a queue going stale should look wrong. */
function waitingTone(createdAt: string, pending: boolean) {
  if (!pending) return "text-muted-foreground";
  const hours = (Date.now() - new Date(createdAt).getTime()) / 3_600_000;
  if (hours >= 24) return "text-rejected-fg font-medium";
  if (hours >= 4) return "text-waiting-fg";
  return "text-muted-foreground";
}

/** One queue row. Owns the struck-through chips so they survive re-renders of the form. */
function AiReportRow({ row }: { row: AiDecisionSummary }) {
  const [ownerOpen, setOwnerOpen] = useState(false);
  const actionable = isActionable(row);


  return (
    <TableRow
      className={`align-top ${
        row.hardReject ? "border-l-2 border-l-rejected" : ""
      }`}
    >
      <TableCell className="py-4">
        <AiMediaReveal media={row.media} alt={`${mediaLabel(row.media.type)} awaiting review`} />
      </TableCell>

      <TableCell className="py-4">
        <p className="text-sm font-medium">{itemLabel(row.media.type, row.media.contentType)}</p>
        <p className={`mt-1 text-sm ${waitingTone(row.createdAt, actionable)}`}>
          {formatWhen(row.createdAt)}
        </p>
        {/* Opens a dialog, not a page: leaving the queue loses a half-filled note. */}
        <button
          type="button"
          onClick={() => setOwnerOpen(true)}
          title={r.viewProfile}
          className="mt-2 block max-w-full truncate text-left text-sm text-muted-foreground underline underline-offset-4 hover:text-brand-ink"
        >
          {row.subject.ownerEmail ?? `${row.subject.accountId.slice(0, 8)}…`}
        </button>
      </TableCell>

      <TableCell className="py-4">
        <WhatTheAiSaid row={row} />
      </TableCell>

      <TableCell className="py-4">
        {actionable ? (
          <AiReviewForm decision={row} />
        ) : (
          <ReviewOutcome row={row} />
        )}
        <AiOwnerDialog
          accountId={row.subject.accountId}
          email={row.subject.ownerEmail}
          open={ownerOpen}
          onOpenChange={setOwnerOpen}
        />
      </TableCell>
    </TableRow>
  );
}

export function AiReportsTable({ initialQuery }: { initialQuery: AiDecisionsQuery }) {
  // URL-synced, so a sorted or filtered queue is linkable and survives a reload.
  const [query, setQuery] = useUrlSyncedQuery(initialQuery, DEFAULT_AI_QUERY, { active: true });

  // Stable identity so the filters' debounce effect doesn't re-run every render.
  const handleFilterChange = useCallback(
    (next: Partial<AiDecisionsQuery>) => {
      setQuery((prev) => ({ ...prev, ...next, page: 1 }));
    },
    [setQuery],
  );

  /** Re-sorting returns to page 1 — page 3 of a new ordering is meaningless. */
  const handleSort = useCallback(
    (sort: AiDecisionsQuery["sort"], dir: AiDecisionsQuery["dir"]) => {
      setQuery((prev) => ({ ...prev, sort, dir, page: 1 }));
    },
    [setQuery],
  );

  const decisions = useAiReports(query);
  // A save invalidates the queue; that refetch must not veil the whole table.
  const isMutating = useIsMutating({ mutationKey: ["ai-reports"] }) > 0;
  const isFiltered =
    Boolean(query.q) ||
    query.review !== "needs_review" ||
    query.decision !== "all" ||
    query.media !== "all" ||
    query.content !== "all";

  return (
    <div className="flex flex-col gap-4">
      <AiReportFilters query={query} onChange={handleFilterChange} />

      {decisions.isError ? (
        <QueryErrorCard message={decisions.error.message} onRetry={() => decisions.refetch()} />
      ) : (
        <>
          {/* Keeps the old page visible while a filter or page change loads. */}
          {/* Only a filter or page change veils the table. A submit refetches too,
              but that row is already removed optimistically and its own button spins. */}
          <FetchingOverlay isFetching={decisions.isFetching && !decisions.isPending && !isMutating}>
          <div className="overflow-x-auto rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[8.5rem]">{copy.aiReports.columns.media}</TableHead>
                  <SortableHead
                    column="created_at"
                    label={copy.aiReports.columns.item}
                    activeColumn={query.sort}
                    direction={query.dir}
                    defaultDirection="desc"
                    onSort={handleSort}
                  />
                  <TableHead className="min-w-[18rem]">{copy.aiReports.columns.aiSaid}</TableHead>
                  <TableHead className="min-w-[22rem]">{copy.aiReports.columns.answer}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {decisions.isPending ? (
                  Array.from({ length: 5 }).map((_, index) => (
                    <TableRow key={index}>
                      {Array.from({ length: COLUMN_COUNT }).map((__, cell) => (
                        <TableCell key={cell} className="py-4">
                          <Skeleton className="h-20 w-full" />
                        </TableCell>
                      ))}
                    </TableRow>
                  ))
                ) : decisions.data.items.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={COLUMN_COUNT}
                      className="py-10 text-center text-muted-foreground"
                    >
                      {isFiltered ? copy.aiReports.emptyFiltered : copy.aiReports.empty}
                    </TableCell>
                  </TableRow>
                ) : (
                  decisions.data.items.map((row) => (
                    <AiReportRow key={row.id} row={row} />
                  ))
                )}
              </TableBody>
            </Table>
          </div>
          </FetchingOverlay>

          {decisions.data ? (
            <Pagination
              page={decisions.data.page}
              pageSize={decisions.data.pageSize}
              total={decisions.data.total}
              onPageChange={(page) => setQuery((prev) => ({ ...prev, page }))}
            />
          ) : null}
        </>
      )}
    </div>
  );
}
