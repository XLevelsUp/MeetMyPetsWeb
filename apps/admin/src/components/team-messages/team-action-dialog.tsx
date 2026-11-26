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
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/shared/spinner";
import { TimePicker } from "@/components/shared/time-picker";
import { Textarea } from "@/components/ui/textarea";
import { fill } from "@/components/team-messages/team-format";
import { LinkifiedText } from "@/components/team-messages/linkified-text";
import { LinkTextarea } from "@/components/team-messages/link-textarea";
import { copy } from "@/config/admin";
import { reasonSchema } from "@/lib/contract-shared";
import { TEAM_BODY_MAX } from "@/lib/team-messages-constants";
import type { TeamMessage } from "@/lib/team-messages-contract";
import { checkSchedule, localInputToIso, localZoneName, toLocalInput } from "@/lib/team-schedule";

export type TeamDialogAction = "edit" | "delete";

const text = copy.teamMessages.actions;
const schedule = copy.teamMessages.composer.schedule;

// Closed by the parent only on success, so a server refusal stays readable in the dialog.
export function TeamActionDialog({
  message,
  action,
  isPending,
  onConfirm,
  onOpenChange,
}: {
  message: TeamMessage;
  action: TeamDialogAction;
  isPending: boolean;
  onConfirm: (input: { body?: string; sendAt?: string; reason: string }) => Promise<void>;
  onOpenChange: (open: boolean) => void;
}) {
  const [body, setBody] = useState(message.body);
  const [at, setAt] = useState(() => toLocalInput(message.sendAt));
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);

  const isEdit = action === "edit";
  // Only a scheduled message can move; once sent, the time is history.
  const canMove = isEdit && message.state === "scheduled";
  const timeChanged = canMove && at !== toLocalInput(message.sendAt);
  const timeProblem = timeChanged ? checkSchedule(at) : null;
  const isCancel = !isEdit && message.state !== "sent";
  const copyFor = isEdit ? text.edit : isCancel ? text.cancel : text.delete;
  const description = isEdit
    ? message.state === "sent"
      ? text.edit.sentDescription
      : text.edit.scheduledDescription
    : isCancel
      ? text.cancel.description
      : text.delete.description;

  const reasonCheck = reasonSchema.safeParse(reason);
  const bodyChanged = body !== message.body;
  const bodyValid = body.trim().length > 0 && body.length <= TEAM_BODY_MAX;
  const canConfirm =
    reasonCheck.success && (!isEdit || ((bodyChanged || timeChanged) && bodyValid && timeProblem === null));

  async function handleConfirm() {
    if (isEdit && !bodyChanged && !timeChanged) return setError(text.edit.noChange);
    if (!reasonCheck.success) return setError(reasonCheck.error.issues[0]?.message ?? null);
    setError(null);
    try {
      await onConfirm({
        body: isEdit && bodyChanged ? body : undefined,
        sendAt: timeChanged ? (localInputToIso(at) ?? undefined) : undefined,
        reason: reasonCheck.data,
      });
      onOpenChange(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : copy.teamMessages.errors.unknown);
    }
  }

  return (
    <AlertDialog open onOpenChange={onOpenChange}>
      <AlertDialogContent className="sm:max-w-lg">
        <AlertDialogHeader>
          <AlertDialogTitle>{copyFor.title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>

        {isEdit ? (
          <div className="flex flex-col gap-2">
            <Label htmlFor="team-edit-body">{text.bodyLabel}</Label>
            <LinkTextarea
              id="team-edit-body"
              rows={6}
              value={body}
              maxLength={TEAM_BODY_MAX}
              onChange={(event) => setBody(event.target.value)}
            />
            <span
              className={`self-end text-xs tabular-nums ${body.length > TEAM_BODY_MAX ? "text-destructive" : "text-muted-foreground"}`}
            >
              {fill(text.counter, { count: body.length, max: TEAM_BODY_MAX })}
            </span>
          </div>
        ) : null}

        {canMove ? (
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="team-edit-at">{text.edit.timeLabel}</Label>
            <TimePicker
              id="team-edit-at"
              value={at}
              onChange={setAt}
              minDate={toLocalInput(new Date().toISOString()).slice(0, 10)}
              invalid={timeProblem !== null}
            />
            <p className="text-xs text-muted-foreground">{fill(schedule.zone, { zone: localZoneName() })}</p>
            {timeProblem ? <p className="text-xs text-destructive">{schedule[timeProblem]}</p> : null}
          </div>
        ) : null}

        {!isEdit ? (
          <blockquote className="max-h-40 overflow-y-auto rounded-md border bg-muted/40 p-3 text-sm whitespace-pre-wrap">
            <LinkifiedText text={message.body} />
          </blockquote>
        ) : null}

        <div className="flex flex-col gap-2">
          <Label htmlFor="team-action-reason">{text.reasonLabel}</Label>
          <Textarea
            id="team-action-reason"
            rows={2}
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

        <AlertDialogFooter>
          <AlertDialogCancel disabled={isPending}>{text.back}</AlertDialogCancel>
          <AlertDialogAction
            variant={isEdit ? "default" : "destructive"}
            disabled={isPending || !canConfirm}
            onClick={handleConfirm}
          >
            {isPending ? <Spinner size="sm" className="mr-1.5" /> : null}
            {isPending ? text.working : copyFor.confirm}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
