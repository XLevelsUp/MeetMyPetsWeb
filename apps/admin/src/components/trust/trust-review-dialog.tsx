"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  AlertTriangle,
  ArrowDownUp,
  ArrowUpRight,
  Award,
  Ban,
  Clock,
  ExternalLink,
  Flag,
  Heart,
  MessageSquareWarning,
  RotateCcw,
  Shield,
  ShieldAlert,
  Star,
  TrendingDown,
  TrendingUp,
  UserCheck,
  Users,
} from "lucide-react";
import { toast } from "sonner";

import {
  TrustOverdueBadge,
  TrustScoreBadge,
  TrustStatusBadge,
} from "@/components/trust/trust-badges";
import {
  eventLabel,
  formatDelta,
  formatWhen,
} from "@/components/trust/trust-format";
import { QueryErrorCard } from "@/components/shared/query-error-card";
import { Spinner } from "@/components/shared/spinner";
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
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { copy } from "@/config/admin";
import { useTrustAction, useTrustLedger } from "@/hooks/use-trust";
import { reasonSchema } from "@/lib/contract-shared";
import type { TrustEvent, TrustQueueEntry } from "@/lib/trust-contract";

function getEventIcon(reason: string) {
  switch (reason) {
    case "block":
      return ShieldAlert;
    case "report":
    case "post_report":
      return Flag;
    case "like":
      return Heart;
    case "super_like":
      return Star;
    case "follow":
      return UserCheck;
    case "match":
      return Users;
    case "certificate_verified":
      return Award;
    default:
      return Shield;
  }
}

/**
 * Redesigned Trust Review Dialog
 * - Displays the first (oldest) events first by default (with toggle for newest first).
 * - High-clarity 2-column/card architecture with full color theory.
 * - Direct links to related content reports and owner profiles.
 * - Smooth action buttons with spinners.
 */
export function TrustReviewDialog({
  entry,
  canRestore,
}: {
  entry: TrustQueueEntry;
  canRestore: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [confirming, setConfirming] = useState<"restore" | "ban" | null>(null);
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");

  const ledger = useTrustLedger(open ? entry.petId : null);
  const action = useTrustAction();

  const reasonCheck = reasonSchema.safeParse(reason);
  const alreadyBanned = entry.status === "permanently_banned";

  function reset() {
    setReason("");
    setError(null);
    setConfirming(null);
    setSortOrder("asc");
  }

  // Sorted events: default "asc" (first events first, chronological story)
  const rawEvents = ledger.data?.events;
  const sortedEvents = useMemo(() => {
    if (!rawEvents) return [];
    const list = [...rawEvents];
    list.sort((a, b) => {
      const ta = new Date(a.createdAt).getTime();
      const tb = new Date(b.createdAt).getTime();
      return sortOrder === "asc" ? ta - tb : tb - ta;
    });
    return list;
  }, [rawEvents, sortOrder]);

  async function run(kind: "restore" | "ban") {
    if (!reasonCheck.success) {
      setError(reasonCheck.error.issues[0]?.message ?? "Enter a reason.");
      return;
    }

    if (kind === "ban" && confirming !== "ban") {
      setError(null);
      setConfirming("ban");
      return;
    }

    setError(null);
    try {
      await action.mutateAsync({ petId: entry.petId, action: kind, reason: reasonCheck.data });
      toast.success(kind === "ban" ? copy.trust.toast.banned : copy.trust.toast.restored);
      setOpen(false);
      reset();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : kind === "ban"
            ? copy.trust.ban.error
            : copy.trust.restore.error,
      );
      setConfirming(null);
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
      <Button
        variant="outline"
        size="sm"
        onClick={() => setOpen(true)}
        className="font-medium hover:border-primary/50 hover:bg-primary/5 transition-colors"
      >
        {copy.trust.review}
      </Button>

      <DialogContent className="max-h-[88vh] sm:max-w-xl md:max-w-2xl lg:max-w-3xl overflow-hidden p-0 flex flex-col gap-0 border shadow-2xl rounded-2xl bg-card">
        {/* Header */}
        <DialogHeader className="p-5 md:p-6 border-b bg-muted/30">
          <div className="flex flex-col gap-3">
            <div className="flex flex-wrap items-center justify-between gap-2 pr-6">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary border border-primary/20">
                  <Shield className="size-5" aria-hidden="true" />
                </div>
                <div>
                  <DialogTitle className="text-lg font-bold truncate text-foreground">
                    {entry.petName ?? entry.petId}
                  </DialogTitle>
                  <DialogDescription className="text-xs text-muted-foreground">
                    {sortOrder === "asc"
                      ? "Automatic trust history: first events first (chronological order)"
                      : "Automatic trust history: newest events first"}
                  </DialogDescription>
                </div>
              </div>
            </div>

            {/* Badges & Owner row */}
            <div className="flex flex-wrap items-center gap-2 pt-1">
              <TrustStatusBadge status={entry.status} />
              <TrustScoreBadge score={entry.score} />
              {entry.reviewOverdue && !alreadyBanned && (
                <TrustOverdueBadge dueAt={entry.reviewDueAt} />
              )}
              {entry.ownerAccountId && (
                <Link
                  href={`/users/${entry.ownerAccountId}`}
                  target="_blank"
                  className="ml-auto inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground font-medium underline-offset-4 hover:underline"
                >
                  <span>{entry.ownerEmail ?? "View Owner Profile"}</span>
                  <ArrowUpRight className="size-3" aria-hidden="true" />
                </Link>
              )}
            </div>
          </div>
        </DialogHeader>

        {/* Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-5 md:p-6 space-y-4">
          {/* Review Deadline & Reports Card */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            {/* Status / Review Deadline Info */}
            <div
              className={`rounded-xl border p-3.5 text-xs flex flex-col justify-between gap-2 shadow-2xs ${
                entry.reviewOverdue && !alreadyBanned
                  ? "border-rose-300 bg-rose-50/50 dark:border-rose-900/60 dark:bg-rose-950/20 text-rose-900 dark:text-rose-200"
                  : "border-border/80 bg-muted/30 text-foreground"
              }`}
            >
              <div className="flex items-start gap-2">
                <Clock className="size-4 shrink-0 mt-0.5 text-muted-foreground" aria-hidden="true" />
                <div className="space-y-1">
                  <span className="font-semibold block text-sm">
                    {alreadyBanned
                      ? "Permanently Banned"
                      : entry.reviewDueAt
                        ? `Review Due: ${formatWhen(entry.reviewDueAt)}`
                        : "No Review Date"}
                  </span>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    {alreadyBanned
                      ? "The pet is permanently locked out. Restoring returns the pet to 555 and clears restrictions."
                      : "A temporary ban never expires automatically. Restoring here sets trust to 555 and unbans the pet."}
                  </p>
                </div>
              </div>
            </div>

            {/* Reports Linked Card */}
            <div className="rounded-xl border border-border/80 bg-muted/30 p-3.5 text-xs flex flex-col justify-between gap-2 shadow-2xs">
              <div className="flex items-start gap-2">
                <MessageSquareWarning className="size-4 shrink-0 mt-0.5 text-amber-600 dark:text-amber-400" aria-hidden="true" />
                <div className="space-y-1">
                  <span className="font-semibold block text-sm">
                    {entry.reportCount} {entry.reportCount === 1 ? "Report" : "Reports"} Filed
                  </span>
                  <p className="text-xs text-muted-foreground">
                    Reports filed against this pet by community members that caused trust deductions.
                  </p>
                </div>
              </div>
              {entry.reportCount > 0 && (
                <Link
                  href={`/reports?q=${entry.petId}`}
                  target="_blank"
                  className="inline-flex items-center gap-1.5 self-start text-xs font-semibold text-primary underline-offset-4 hover:underline pt-1"
                >
                  <span>Inspect reports in Content Moderation</span>
                  <ExternalLink className="size-3" aria-hidden="true" />
                </Link>
              )}
            </div>
          </div>

          {/* Warning Dismissal note */}
          {entry.status === "warning" && entry.warningAcknowledged && (
            <div className="rounded-xl border border-amber-200 bg-amber-50/60 p-3 text-xs text-amber-900 dark:border-amber-900/50 dark:bg-amber-950/20 dark:text-amber-200">
              {copy.trust.acknowledgedNote}
            </div>
          )}

          {/* Trust Score History (Ledger) */}
          <div className="rounded-xl border bg-card/80 p-4 shadow-2xs space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  {copy.trust.ledger.heading}
                </h3>
                {ledger.data && (
                  <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
                    {ledger.data.events.length} events
                  </span>
                )}
              </div>

              {/* Order Toggle: first events first vs newest first */}
              <button
                type="button"
                onClick={() => setSortOrder((prev) => (prev === "asc" ? "desc" : "asc"))}
                className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground font-medium rounded-md px-2 py-1 bg-muted/60 hover:bg-muted transition-colors"
                title="Toggle timeline order"
              >
                <ArrowDownUp className="size-3.5" aria-hidden="true" />
                <span>{sortOrder === "asc" ? "First events first" : "Newest first"}</span>
              </button>
            </div>

            {ledger.isError ? (
              <QueryErrorCard message={ledger.error.message} onRetry={() => ledger.refetch()} />
            ) : ledger.isPending ? (
              <div className="space-y-2 py-2">
                {Array.from({ length: 4 }).map((_, index) => (
                  <Skeleton key={index} className="h-10 w-full rounded-lg" />
                ))}
              </div>
            ) : sortedEvents.length === 0 ? (
              <p className="text-xs text-muted-foreground py-6 text-center">
                {copy.trust.ledger.empty}
              </p>
            ) : (
              <div className="divide-y divide-border/60 rounded-lg border border-border/70 overflow-hidden bg-background">
                {sortedEvents.map((event: TrustEvent) => {
                  const EventIcon = getEventIcon(event.reason);
                  const isPositive = event.delta > 0;

                  return (
                    <div
                      key={event.id}
                      className="flex items-center gap-3 p-3 text-xs transition-colors hover:bg-muted/30"
                    >
                      {/* Delta Tag with Icon */}
                      <span
                        className={`inline-flex min-w-16 items-center justify-center gap-1 rounded-full px-2.5 py-0.5 font-bold tabular-nums text-xs shadow-2xs ${
                          isPositive
                            ? "bg-emerald-100 text-emerald-800 border border-emerald-300 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-700/60"
                            : "bg-rose-100 text-rose-800 border border-rose-300 dark:bg-rose-950/60 dark:text-rose-300 dark:border-rose-700/60"
                        }`}
                      >
                        {isPositive ? (
                          <TrendingUp className="size-3 shrink-0" aria-hidden="true" />
                        ) : (
                          <TrendingDown className="size-3 shrink-0" aria-hidden="true" />
                        )}
                        {formatDelta(event.delta)}
                      </span>

                      {/* Event description & Actor */}
                      <div className="flex-1 min-w-0 flex items-center gap-2">
                        <EventIcon className="size-3.5 shrink-0 text-muted-foreground" aria-hidden="true" />
                        <span className="font-medium text-foreground truncate">
                          {eventLabel(event.reason)}
                        </span>
                        {event.actorPetName && (
                          <span className="rounded bg-muted px-1.5 py-0.5 text-[11px] font-normal text-muted-foreground truncate">
                            · {event.actorPetName}
                          </span>
                        )}
                      </div>

                      {/* Timestamp */}
                      <span className="shrink-0 text-[11px] tabular-nums text-muted-foreground font-mono">
                        {formatWhen(event.createdAt)}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}

            <p className="text-[11px] text-muted-foreground leading-normal">
              {copy.trust.ledger.restoreNote}
            </p>
          </div>

          {/* Action Input Card (for Super Admins) */}
          {canRestore && (
            <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 space-y-3 shadow-2xs">
              <div>
                <Label htmlFor={`trust-reason-${entry.petId}`} className="text-xs font-semibold uppercase tracking-wider text-foreground">
                  {copy.trust.restore.reasonLabel}
                </Label>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Explain the findings from your review. This is permanently saved in the audit log.
                </p>
              </div>

              <Textarea
                id={`trust-reason-${entry.petId}`}
                rows={3}
                value={reason}
                onChange={(event) => setReason(event.target.value)}
                placeholder={copy.trust.restore.reasonPlaceholder}
                className="bg-background text-xs resize-none"
              />

              {confirming === "ban" && (
                <div role="alert" className="rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-xs text-destructive space-y-1">
                  <span className="font-bold flex items-center gap-1.5">
                    <AlertTriangle className="size-4" />
                    {copy.trust.ban.title}
                  </span>
                  <p>{copy.trust.ban.description}</p>
                </div>
              )}

              {error && (
                <p role="alert" className="text-xs font-medium text-destructive">
                  {error}
                </p>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <DialogFooter className="border-t bg-muted/20 px-6 py-4 mx-0 mb-0 flex items-center justify-between">
          <DialogClose render={<Button variant="outline" size="sm" />}>
            {copy.trust.ledger.close}
          </DialogClose>

          <div className="flex items-center gap-2">
            {canRestore && !alreadyBanned && (
              <Button
                variant="destructive"
                size="sm"
                disabled={action.isPending || !reasonCheck.success}
                onClick={() => run("ban")}
                className="gap-1.5"
              >
                {action.isPending && confirming === "ban" ? (
                  <Spinner className="size-3.5" />
                ) : (
                  <Ban className="size-3.5" aria-hidden="true" />
                )}
                {confirming === "ban" ? copy.trust.ban.confirm : copy.trust.ban.action}
              </Button>
            )}

            {canRestore && (
              <Button
                size="sm"
                disabled={action.isPending || !reasonCheck.success}
                onClick={() => run("restore")}
                className="gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs"
              >
                {action.isPending && confirming !== "ban" ? (
                  <Spinner className="size-3.5 text-white" />
                ) : (
                  <RotateCcw className="size-3.5" aria-hidden="true" />
                )}
                {copy.trust.restore.confirm} (+555)
              </Button>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
