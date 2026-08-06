"use client";

import { useState } from "react";

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
import { Button } from "@/components/ui/button";
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
import { reasonSchema } from "@/lib/contract-shared";
import { SUSPEND_DURATIONS_HOURS } from "@/lib/users-contract";

type ModerationAction = keyof typeof copy.users.actions;

/**
 * The house destructive-action pattern: confirmation + a mandatory reason that
 * becomes the audit record. Base UI's AlertDialogAction is a plain Button (it
 * does not auto-close), so `open` is controlled here — that is also what lets
 * the dialog stay open and show the error when the request fails.
 */
export function ActionDialog({
  action,
  disabled,
  onConfirm,
  isPending,
  triggerVariant = "outline",
  triggerSize = "sm",
}: {
  action: ModerationAction;
  disabled?: boolean;
  /** Rejects on failure so the dialog can surface the message inline. */
  onConfirm: (input: { reason: string; durationHours?: number }) => Promise<void>;
  isPending: boolean;
  triggerVariant?: "outline" | "destructive" | "secondary";
  triggerSize?: "sm" | "default";
}) {
  const text = copy.users.actions[action];
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [durationHours, setDurationHours] = useState<number>(SUSPEND_DURATIONS_HOURS[2]);
  const [error, setError] = useState<string | null>(null);

  const reasonCheck = reasonSchema.safeParse(reason);

  function reset() {
    setReason("");
    setDurationHours(SUSPEND_DURATIONS_HOURS[2]);
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
        durationHours: action === "suspend" ? durationHours : undefined,
      });
      setOpen(false);
      reset();
    } catch (err) {
      setError(err instanceof Error ? err.message : "That didn't work.");
    }
  }

  return (
    <AlertDialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) reset();
      }}
    >
      <Button
        variant={triggerVariant}
        size={triggerSize}
        disabled={disabled}
        onClick={() => setOpen(true)}
      >
        {text.label}
      </Button>

      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{text.title}</AlertDialogTitle>
          <AlertDialogDescription>{text.description}</AlertDialogDescription>
        </AlertDialogHeader>

        <div className="flex flex-col gap-4">
          {action === "suspend" ? (
            <div className="flex flex-col gap-2">
              <Label htmlFor="duration">{copy.users.dialog.durationLabel}</Label>
              <Select
                value={String(durationHours)}
                onValueChange={(value) =>
                  setDurationHours(value ? Number(value) : SUSPEND_DURATIONS_HOURS[2])
                }
              >
                <SelectTrigger id="duration">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SUSPEND_DURATIONS_HOURS.map((hours) => (
                    <SelectItem key={hours} value={String(hours)}>
                      {copy.users.dialog.durations[String(hours) as "24" | "72" | "168" | "720"]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ) : null}

          <div className="flex flex-col gap-2">
            <Label htmlFor="reason">{copy.users.dialog.reasonLabel}</Label>
            <Textarea
              id="reason"
              rows={3}
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              placeholder={copy.users.dialog.reasonPlaceholder}
            />
          </div>

          {error ? (
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
          ) : null}
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel disabled={isPending}>{copy.users.dialog.cancel}</AlertDialogCancel>
          <AlertDialogAction
            variant={action === "restore" || action === "unflag" ? "default" : "destructive"}
            disabled={isPending || !reasonCheck.success}
            onClick={handleConfirm}
          >
            {isPending ? copy.users.dialog.submitting : text.confirm}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
