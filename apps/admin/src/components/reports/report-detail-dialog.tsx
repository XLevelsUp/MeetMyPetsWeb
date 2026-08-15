"use client";

import Link from "next/link";
import { useState, type ReactNode } from "react";

import {
  formatWhen,
  reasonLabel,
  scopeLabel,
  statusLabel,
  trustLabel,
  trustVariant,
} from "@/components/reports/report-format";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { copy } from "@/config/admin";
import { useResolveReport } from "@/hooks/use-reports";
import { reasonSchema } from "@/lib/contract-shared";
import { REPORT_RESOLUTIONS, type ReportResolution } from "@/lib/report-constants";
import type { ReportSummary } from "@/lib/reports-contract";

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5">
      <dt className="text-xs uppercase tracking-wide text-muted-foreground">{label}</dt>
      <dd className="break-words text-sm">{children}</dd>
    </div>
  );
}

/**
 * The review surface: everything a moderator needs to judge one report, plus
 * the three resolutions.
 *
 * Resolution requires a reason for the same reason every other destructive
 * action does — it becomes the audit row. Note what this dialog deliberately
 * does NOT do: it never flags the pet or restricts the owner. Those are
 * separate, individually-audited actions on /users with their own (narrower)
 * role checks, and conflating them here would let one click do two things a
 * reviewer later can't tell apart.
 */
export function ReportDetailDialog({ report }: { report: ReportSummary }) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const resolve = useResolveReport();

  const reasonCheck = reasonSchema.safeParse(reason);
  const isResolved = report.status !== "pending";

  function reset() {
    setReason("");
    setError(null);
  }

  async function handleResolve(resolution: ReportResolution) {
    if (!reasonCheck.success) {
      setError(reasonCheck.error.issues[0]?.message ?? "Enter a reason.");
      return;
    }
    setError(null);
    try {
      await resolve.mutateAsync({ id: report.id, resolution, reason: reasonCheck.data });
      setOpen(false);
      reset();
    } catch (err) {
      setError(err instanceof Error ? err.message : copy.reports.resolve.error);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) reset();
      }}
    >
      <Button variant="ghost" size="sm" onClick={() => setOpen(true)}>
        {copy.reports.details}
      </Button>

      <DialogContent className="max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{copy.reports.detailDialog.title}</DialogTitle>
          <DialogDescription>{copy.reports.detailDialog.description}</DialogDescription>
        </DialogHeader>

        <dl className="flex flex-col gap-4">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline">{statusLabel(report.status)}</Badge>
            <Badge variant="secondary">{reasonLabel(report.reason)}</Badge>
            <Badge variant="outline">{scopeLabel(report.scope)}</Badge>
            <span className="text-xs text-muted-foreground">{formatWhen(report.createdAt)}</span>
          </div>

          <Row label={copy.reports.detailDialog.reporterNote}>
            {report.details?.trim() ? (
              <span className="whitespace-pre-wrap">{report.details}</span>
            ) : (
              <span className="text-muted-foreground">
                {copy.reports.detailDialog.noReporterNote}
              </span>
            )}
          </Row>

          <Row label={copy.reports.detailDialog.reportedPet}>
            {report.reportedPetName ?? report.reportedPetId}
          </Row>

          <Row label={copy.reports.detailDialog.owner}>
            {report.reportedOwnerAccountId ? (
              <Link
                href={`/users/${report.reportedOwnerAccountId}`}
                className="underline-offset-4 hover:underline"
              >
                {report.reportedOwnerEmail ?? copy.reports.detailDialog.openAccount}
              </Link>
            ) : (
              <span className="text-muted-foreground">—</span>
            )}
          </Row>

          <Row label={copy.reports.detailDialog.reporterPet}>
            {report.reporterPetName ?? report.reporterPetId}
          </Row>

          {report.post ? (
            <Row label={copy.reports.detailDialog.post}>
              {report.post.caption?.trim() ? (
                <span className="whitespace-pre-wrap">{report.post.caption}</span>
              ) : (
                <span className="text-muted-foreground">
                  {copy.reports.detailDialog.noCaption}
                </span>
              )}
              {report.post.deletedAt ? (
                <span className="mt-1 block text-xs text-muted-foreground">
                  {copy.reports.detailDialog.postDeleted}
                </span>
              ) : null}
            </Row>
          ) : null}

          <Row label={copy.reports.columns.trust}>
            <span className="flex flex-wrap items-center gap-2">
              <Badge variant={trustVariant(report.trust.status)}>
                {trustLabel(report.trust.status)}
              </Badge>
              {report.trust.score !== null ? (
                <span className="text-muted-foreground">{report.trust.score}</span>
              ) : null}
            </span>
            <span className="mt-1 block text-xs text-muted-foreground">
              {copy.reports.trustHint}
            </span>
          </Row>

          <Row label={copy.reports.detailDialog.history}>{report.reportsAgainstPet}</Row>
        </dl>

        {isResolved ? null : (
          <div className="mt-2 flex flex-col gap-2">
            <Label htmlFor={`resolve-reason-${report.id}`}>
              {copy.reports.resolve.reasonLabel}
            </Label>
            <Textarea
              id={`resolve-reason-${report.id}`}
              rows={3}
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              placeholder={copy.reports.resolve.reasonPlaceholder}
            />
            <p className="text-xs text-muted-foreground">
              {copy.reports.resolve.confirmDescription}
            </p>
          </div>
        )}

        {error ? (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        ) : null}

        <DialogFooter>
          <DialogClose render={<Button variant="outline" />}>
            {copy.reports.detailDialog.close}
          </DialogClose>
          {isResolved
            ? null
            : REPORT_RESOLUTIONS.map((resolution) => (
                <Button
                  key={resolution}
                  variant={resolution === "actioned" ? "destructive" : "secondary"}
                  disabled={resolve.isPending || !reasonCheck.success}
                  onClick={() => handleResolve(resolution)}
                >
                  {resolve.isPending
                    ? copy.reports.resolve.submitting
                    : copy.reports.resolve[resolution]}
                </Button>
              ))}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
