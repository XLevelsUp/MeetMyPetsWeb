"use client";

import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";

import {
  eventLabel,
  formatDelta,
  formatWhen,
  statusLabel,
  statusVariant,
} from "@/components/trust/trust-format";
import { QueryErrorCard } from "@/components/shared/query-error-card";
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
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { copy } from "@/config/admin";
import { useTrustAction, useTrustLedger } from "@/hooks/use-trust";
import { reasonSchema } from "@/lib/contract-shared";
import type { TrustQueueEntry } from "@/lib/trust-contract";

/**
 * The review surface: why this pet lost its score, and the one action that
 * ends the restriction.
 *
 * The ledger is the whole point — a moderator overriding an automated ban
 * should see the events that caused it, not just the number they produced.
 */
export function TrustReviewDialog({
  entry,
  canRestore,
}: {
  entry: TrustQueueEntry;
  /** Gates both actions — the route requires super_admin for either. */
  canRestore: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  /** Which action the confirmation step is for; null = not confirming. */
  const [confirming, setConfirming] = useState<"restore" | "ban" | null>(null);
  const ledger = useTrustLedger(open ? entry.petId : null);
  const action = useTrustAction();

  const reasonCheck = reasonSchema.safeParse(reason);
  const alreadyBanned = entry.status === "permanently_banned";

  function reset() {
    setReason("");
    setError(null);
    setConfirming(null);
  }

  async function run(kind: "restore" | "ban") {
    if (!reasonCheck.success) {
      setError(reasonCheck.error.issues[0]?.message ?? "Enter a reason.");
      return;
    }
    // Banning is destructive and not obviously reversible to a reader, so it
    // gets a second, explicit confirmation. Restore does not — it is the
    // recovery path, and adding friction to recovery is the wrong asymmetry.
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
      <Button variant="ghost" size="sm" onClick={() => setOpen(true)}>
        {copy.trust.review}
      </Button>

      <DialogContent className="max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{entry.petName ?? entry.petId}</DialogTitle>
          <DialogDescription>{copy.trust.ledger.description}</DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant={statusVariant(entry.status)}>{statusLabel(entry.status)}</Badge>
            <span className="text-sm tabular-nums text-muted-foreground">
              {copy.trust.columns.score}: {entry.score}
            </span>
            {entry.reviewOverdue ? (
              <Badge variant="destructive">{copy.trust.overdueBadge}</Badge>
            ) : null}
            {entry.ownerAccountId ? (
              <Link
                href={`/users/${entry.ownerAccountId}`}
                className="ml-auto text-xs underline-offset-4 hover:underline"
              >
                {entry.ownerEmail ?? "Open owner"}
              </Link>
            ) : null}
          </div>

          {/* The stamped date is a trigger artifact once a pet is permanently
              banned — showing it would claim a review is pending. */}
          {entry.reviewDueAt && !alreadyBanned ? (
            <p className="text-sm text-muted-foreground">
              {copy.trust.columns.reviewDue}: {formatWhen(entry.reviewDueAt)} —{" "}
              {copy.trust.clockWarning}
            </p>
          ) : null}
          {alreadyBanned ? (
            <p className="text-sm text-muted-foreground">{copy.trust.permanentNoReview}</p>
          ) : null}

          {entry.status === "warning" && entry.warningAcknowledged ? (
            <p className="rounded-md bg-muted p-3 text-xs text-muted-foreground">
              {copy.trust.acknowledgedNote}
            </p>
          ) : null}

          {entry.reportCount > 0 ? (
            <Link
              href={`/reports?q=${entry.petId}`}
              className="text-sm underline-offset-4 hover:underline"
            >
              {entry.reportCount} report{entry.reportCount === 1 ? "" : "s"} against this pet
            </Link>
          ) : null}

          <div className="flex flex-col gap-2">
            <h3 className="text-sm font-medium">{copy.trust.ledger.heading}</h3>

            {ledger.isError ? (
              <QueryErrorCard message={ledger.error.message} onRetry={() => ledger.refetch()} />
            ) : ledger.isPending ? (
              <div className="flex flex-col gap-2">
                {Array.from({ length: 4 }).map((_, index) => (
                  <Skeleton key={index} className="h-8 w-full" />
                ))}
              </div>
            ) : ledger.data.events.length === 0 ? (
              <p className="text-sm text-muted-foreground">{copy.trust.ledger.empty}</p>
            ) : (
              <ul className="flex flex-col divide-y rounded-md border">
                {ledger.data.events.map((event) => (
                  <li key={event.id} className="flex items-center gap-3 p-2 text-sm">
                    <span
                      className={
                        event.delta > 0
                          ? "w-12 shrink-0 text-right tabular-nums text-muted-foreground"
                          : "w-12 shrink-0 text-right font-medium tabular-nums text-destructive"
                      }
                    >
                      {formatDelta(event.delta)}
                    </span>
                    <span className="flex-1">
                      {eventLabel(event.reason)}
                      {event.actorPetName ? (
                        <span className="text-muted-foreground"> · {event.actorPetName}</span>
                      ) : null}
                    </span>
                    <span className="shrink-0 text-xs text-muted-foreground">
                      {formatWhen(event.createdAt)}
                    </span>
                  </li>
                ))}
              </ul>
            )}

            <p className="text-xs text-muted-foreground">{copy.trust.ledger.restoreNote}</p>
          </div>

          {canRestore ? (
            <div className="flex flex-col gap-2 border-t pt-4">
              <p className="text-sm text-muted-foreground">{copy.trust.restore.description}</p>
              {!alreadyBanned ? (
                <p className="text-sm text-muted-foreground">{copy.trust.ban.description}</p>
              ) : null}
              {/* One reason field for both: each is a decision worth recording,
                  and two boxes would invite writing it in the wrong one. */}
              <Label htmlFor={`trust-reason-${entry.petId}`}>
                {copy.trust.restore.reasonLabel}
              </Label>
              <Textarea
                id={`trust-reason-${entry.petId}`}
                rows={3}
                value={reason}
                onChange={(event) => setReason(event.target.value)}
                placeholder={copy.trust.restore.reasonPlaceholder}
              />
            </div>
          ) : null}

          {confirming === "ban" ? (
            <p role="alert" className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
              {copy.trust.ban.title} {copy.trust.ban.description}
            </p>
          ) : null}

          {error ? (
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
          ) : null}
        </div>

        <DialogFooter>
          <DialogClose render={<Button variant="outline" />}>
            {copy.trust.ledger.close}
          </DialogClose>
          {canRestore && !alreadyBanned ? (
            <Button
              variant="destructive"
              disabled={action.isPending || !reasonCheck.success}
              onClick={() => run("ban")}
            >
              {action.isPending && confirming === "ban"
                ? copy.trust.ban.submitting
                : confirming === "ban"
                  ? copy.trust.ban.confirm
                  : copy.trust.ban.action}
            </Button>
          ) : null}
          {canRestore ? (
            <Button disabled={action.isPending || !reasonCheck.success} onClick={() => run("restore")}>
              {action.isPending && confirming !== "ban"
                ? copy.trust.restore.submitting
                : copy.trust.restore.confirm}
            </Button>
          ) : null}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
