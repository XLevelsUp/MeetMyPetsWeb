"use client";

import { useState } from "react";

import { rejectionLabel } from "@/components/verifications/verification-format";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { copy } from "@/config/admin";
import { REJECTION_REASONS, type RejectionReason } from "@/lib/certificate-constants";
import { reasonSchema } from "@/lib/contract-shared";

/**
 * Confirmation for a certificate decision.
 *
 * `open` is controlled by the parent (rather than a trigger inside) so the
 * keyboard shortcuts can open it — and because Base UI's AlertDialogAction is
 * a plain Button that does not auto-close, which is what lets the dialog stay
 * open to show an error instead of vanishing on failure.
 *
 * The approve copy states the +500 trust consequence outright. That is the
 * whole reason this is a confirmation and not a bare button.
 */
export function DecideDialog({
  decision,
  open,
  onOpenChange,
  onConfirm,
  isPending,
}: {
  decision: "approve" | "reject" | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (input: { reason: string; rejectionReason?: RejectionReason }) => Promise<void>;
  isPending: boolean;
}) {
  const [reason, setReason] = useState("");
  const [rejectionReason, setRejectionReason] = useState<RejectionReason>("illegible");
  const [error, setError] = useState<string | null>(null);

  const reasonCheck = reasonSchema.safeParse(reason);
  const isReject = decision === "reject";
  const text = copy.verifications.decide;

  function reset() {
    setReason("");
    setRejectionReason("illegible");
    setError(null);
  }

  async function handleConfirm() {
    if (!reasonCheck.success) {
      setError(reasonCheck.error.issues[0]?.message ?? "Enter a reason.");
      return;
    }
    setError(null);
    try {
      await onConfirm({
        reason: reasonCheck.data,
        rejectionReason: isReject ? rejectionReason : undefined,
      });
      onOpenChange(false);
      reset();
    } catch (err) {
      setError(err instanceof Error ? err.message : text.error);
    }
  }

  return (
    <AlertDialog
      open={open}
      onOpenChange={(next) => {
        onOpenChange(next);
        if (!next) reset();
      }}
    >
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{isReject ? text.rejectTitle : text.approveTitle}</AlertDialogTitle>
          <AlertDialogDescription>
            {isReject ? text.rejectDescription : text.approveDescription}
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="flex flex-col gap-4">
          {isReject ? (
            <div className="flex flex-col gap-2">
              <Label htmlFor="rejection-reason">{text.rejectionReasonLabel}</Label>
              <Select
                value={rejectionReason}
                onValueChange={(value) =>
                  setRejectionReason((value ?? "illegible") as RejectionReason)
                }
              >
                <SelectTrigger id="rejection-reason">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {REJECTION_REASONS.map((value) => (
                    <SelectItem key={value} value={value}>
                      {rejectionLabel(value)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ) : null}

          <div className="flex flex-col gap-2">
            <Label htmlFor="decide-reason">{text.reasonLabel}</Label>
            <Textarea
              id="decide-reason"
              rows={3}
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              placeholder={text.reasonPlaceholder}
            />
          </div>

          {error ? (
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
          ) : null}
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel disabled={isPending}>{text.cancel}</AlertDialogCancel>
          <AlertDialogAction
            variant={isReject ? "destructive" : "default"}
            disabled={isPending || !reasonCheck.success}
            onClick={handleConfirm}
          >
            {isPending ? text.submitting : isReject ? text.confirmReject : text.confirmApprove}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
