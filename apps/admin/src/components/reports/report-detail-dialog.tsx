"use client";

import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";
import { AlertCircle, ShieldCheck } from "lucide-react";

import {
  ReportReasonBadge,
  ReportScopeBadge,
  ReportStatusBadge,
  ReportTrustBadge,
} from "@/components/reports/report-badges";
import {
  formatWhen,
  revertMessage,
  revertTone,
} from "@/components/reports/report-format";
import { ReportMediaReveal } from "@/components/reports/report-media-reveal";
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
import { cn } from "@/lib/utils";

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
      const result = await resolve.mutateAsync({
        id: report.id,
        resolution,
        reason: reasonCheck.data,
      });
      if (result.revert) {
        const message = revertMessage(result.revert, "did");
        if (result.revert.outcome === "reverted") toast.success(message);
        else toast.warning(message);
      }
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

      <DialogContent className="sm:max-w-xl md:max-w-2xl max-h-[85vh] overflow-hidden flex flex-col p-0 gap-0 border shadow-2xl">
        {/* Header */}
        <DialogHeader className="p-5 pb-4 border-b bg-muted/20 pr-12">
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <DialogTitle className="text-lg font-semibold tracking-tight">
                {copy.reports.detailDialog.title}
              </DialogTitle>
              <span className="text-xs text-muted-foreground mr-2">
                {formatWhen(report.createdAt)}
              </span>
            </div>
            <DialogDescription className="text-xs text-muted-foreground">
              {copy.reports.detailDialog.description}
            </DialogDescription>
            <div className="flex flex-wrap items-center gap-2 pt-1">
              <ReportStatusBadge status={report.status} />
              <ReportReasonBadge reason={report.reason} />
              <ReportScopeBadge scope={report.scope} />
            </div>
          </div>
        </DialogHeader>

        {/* Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-5 md:p-6 space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Left Column: Reported Content & Notes */}
            <div className="space-y-4">
              <div>
                <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
                  Reported Content & Media
                </h3>
                <div className="flex flex-col gap-3 rounded-xl border bg-card/60 p-3.5 shadow-2xs">
                  <div className="flex gap-3.5 items-start">
                    <ReportMediaReveal
                      media={report.media}
                      alt={report.reportedPetName ?? "Reported content"}
                      size="md"
                    />
                    <div className="flex-1 min-w-0 space-y-1.5">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-sm truncate text-foreground">
                          {report.reportedPetName ?? report.reportedPetId}
                        </span>
                      </div>
                      {report.post ? (
                        <div className="space-y-1 text-xs">
                          <div className="flex items-center justify-between">
                            <span className="text-[11px] font-mono text-muted-foreground">
                              Post ID: {report.post.id.slice(0, 8)}...
                            </span>
                            {report.post.deletedAt ? (
                              <span className="text-[10px] text-destructive bg-destructive/10 px-1.5 py-0.5 rounded font-medium">
                                Deleted
                              </span>
                            ) : (
                              <span className="text-[10px] text-emerald-700 bg-emerald-50 dark:text-emerald-400 dark:bg-emerald-950/40 px-1.5 py-0.5 rounded font-medium">
                                Active
                              </span>
                            )}
                          </div>
                          {report.post.caption?.trim() ? (
                            <p className="line-clamp-3 italic bg-muted/40 p-2 rounded text-foreground/90 text-xs">
                              &ldquo;{report.post.caption}&rdquo;
                            </p>
                          ) : (
                            <p className="italic text-muted-foreground text-[11px]">No caption provided</p>
                          )}
                          {report.post.createdAt && (
                            <span className="text-[10px] text-muted-foreground block">
                              Posted: {formatWhen(report.post.createdAt)}
                            </span>
                          )}
                        </div>
                      ) : (
                        <p className="text-xs text-muted-foreground">Pet Profile Reported</p>
                      )}
                    </div>
                  </div>

                  {report.media?.contentType === "video" && report.media.url && (
                    <div className="overflow-hidden rounded-lg border border-border/80 bg-black/95">
                      <video
                        src={report.media.url}
                        controls
                        playsInline
                        preload="metadata"
                        className="max-h-56 w-full object-contain"
                      />
                    </div>
                  )}
                </div>
              </div>

              {/* Reporter Note */}
              <div>
                <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2 flex items-center gap-1.5">
                  <AlertCircle className="size-3.5 text-amber-600" />
                  {copy.reports.detailDialog.reporterNote}
                </h3>
                <div className="rounded-xl border border-amber-200/80 bg-amber-50/40 p-3.5 text-xs dark:border-amber-900/50 dark:bg-amber-950/20">
                  {report.details?.trim() ? (
                    <p className="whitespace-pre-wrap text-foreground/90 font-normal leading-relaxed">
                      {report.details}
                    </p>
                  ) : (
                    <p className="italic text-muted-foreground">
                      {copy.reports.detailDialog.noReporterNote}
                    </p>
                  )}
                  <div className="mt-2.5 pt-2 border-t border-amber-200/50 dark:border-amber-900/40 text-[11px] text-muted-foreground flex items-center justify-between">
                    <span>
                      Filed by: <strong className="text-foreground">{report.reporterPetName ?? report.reporterPetId}</strong>
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column: Account Standing & Trust Engine */}
            <div className="space-y-4">
              <div>
                <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
                  Account Standing
                </h3>
                <div className="rounded-xl border bg-card/60 p-3.5 space-y-2.5 shadow-2xs text-xs">
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Reported Pet</span>
                    <span className="font-semibold text-foreground">
                      {report.reportedPetName ?? report.reportedPetId}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Owner Account</span>
                    {report.reportedOwnerAccountId ? (
                      <Link
                        href={`/users/${report.reportedOwnerAccountId}`}
                        className="text-primary hover:underline font-medium truncate max-w-[190px]"
                        title={report.reportedOwnerEmail ?? report.reportedOwnerAccountId}
                      >
                        {report.reportedOwnerEmail ?? copy.reports.detailDialog.openAccount}
                      </Link>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Total Reports Against Pet</span>
                    <span className="inline-flex items-center gap-1.5 font-semibold text-foreground">
                      {report.reportsAgainstPet}
                      {report.reportsAgainstPet > 1 && (
                        <span className="text-[10px] bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300 px-2 py-0.5 rounded-full font-medium">
                          Repeat Offender
                        </span>
                      )}
                    </span>
                  </div>
                  <div className="pt-2 border-t flex justify-between items-center">
                    <span className="text-muted-foreground">Trust Standing</span>
                    <ReportTrustBadge trust={report.trust} />
                  </div>
                </div>
              </div>

              {/* Trust Reversal Impact */}
              <div>
                <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2 flex items-center gap-1.5">
                  <ShieldCheck className="size-3.5 text-emerald-600" />
                  Dismissal Consequence
                </h3>
                <div
                  className={cn(
                    "rounded-xl border p-3.5 text-xs leading-relaxed",
                    revertTone(report.revert) === "warn"
                      ? "border-destructive/40 bg-destructive/5 text-foreground"
                      : "border-border/80 bg-muted/30 text-muted-foreground",
                  )}
                >
                  <span className="font-semibold text-foreground">
                    {copy.reports.revert.heading}:{" "}
                  </span>
                  <span>{revertMessage(report.revert)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Resolution Reason Form (if pending) */}
          {!isResolved && (
            <div className="space-y-2 rounded-xl border bg-muted/20 p-4">
              <Label
                htmlFor={`resolve-reason-${report.id}`}
                className="text-xs font-semibold uppercase tracking-wider text-muted-foreground"
              >
                {copy.reports.resolve.reasonLabel}
              </Label>
              <Textarea
                id={`resolve-reason-${report.id}`}
                rows={2}
                value={reason}
                onChange={(event) => setReason(event.target.value)}
                placeholder={copy.reports.resolve.reasonPlaceholder}
                className="bg-background resize-none text-sm"
              />
              <p className="text-[11px] text-muted-foreground">
                {copy.reports.resolve.confirmDescription}
              </p>
            </div>
          )}

          {error && (
            <p role="alert" className="text-xs text-destructive font-medium">
              {error}
            </p>
          )}
        </div>

        {/* Footer */}
        <DialogFooter className="mx-0 mb-0 rounded-none border-t bg-muted/40 px-6 py-4 flex flex-row items-center justify-between sm:justify-between w-full">
          <DialogClose
            render={
              <Button variant="outline" size="sm" className="px-4 font-medium border-border/80 hover:bg-muted">
                Cancel
              </Button>
            }
          />

          {!isResolved && (
            <div className="flex items-center gap-2">
              {REPORT_RESOLUTIONS.map((resolution) => {
                const isActioned = resolution === "actioned";
                const isDismissed = resolution === "dismissed";
                return (
                  <Button
                    key={resolution}
                    size="sm"
                    variant={isActioned ? "destructive" : isDismissed ? "outline" : "secondary"}
                    className={
                      isDismissed
                        ? "border-emerald-600 bg-emerald-600 text-white hover:bg-emerald-700"
                        : undefined
                    }
                    disabled={resolve.isPending || !reasonCheck.success}
                    onClick={() => handleResolve(resolution)}
                  >
                    {resolve.isPending
                      ? copy.reports.resolve.submitting
                      : copy.reports.resolve[resolution]}
                  </Button>
                );
              })}
            </div>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
