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
import { Textarea } from "@/components/ui/textarea";
import { copy } from "@/config/admin";
import { reasonSchema } from "@/lib/contract-shared";
import type { BlogAction } from "@/lib/blog-contract";

/**
 * Confirmation for publish / unpublish / delete. Delete also takes a reason
 * for the audit log — the one blog action that is not reversible from the UI.
 *
 * Controlled by the parent and closed only on success, so a server refusal
 * ("add some body text before publishing") stays on screen.
 */
export function BlogActionDialog({
  action,
  title,
  isPending,
  onConfirm,
  onOpenChange,
}: {
  action: BlogAction;
  title: string;
  isPending: boolean;
  onConfirm: (reason: string | undefined) => Promise<void>;
  onOpenChange: (open: boolean) => void;
}) {
  const text = copy.blogs.confirm;
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const needsReason = action === "delete";
  const reasonCheck = reasonSchema.safeParse(reason);

  async function handleConfirm() {
    if (needsReason && !reasonCheck.success) {
      setError(reasonCheck.error.issues[0]?.message ?? "Enter a reason.");
      return;
    }
    setError(null);
    try {
      await onConfirm(needsReason && reasonCheck.success ? reasonCheck.data : undefined);
      onOpenChange(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    }
  }

  return (
    <AlertDialog open onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{text[action].title}</AlertDialogTitle>
          <AlertDialogDescription>
            <span className="mb-2 block font-medium text-foreground">{title}</span>
            {text[action].description}
          </AlertDialogDescription>
        </AlertDialogHeader>

        {needsReason ? (
          <div className="flex flex-col gap-2">
            <Label htmlFor="blog-action-reason">{text.delete.reasonLabel}</Label>
            <Textarea
              id="blog-action-reason"
              rows={2}
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              placeholder={text.delete.reasonPlaceholder}
            />
          </div>
        ) : null}

        {error ? (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        ) : null}

        <AlertDialogFooter>
          <AlertDialogCancel disabled={isPending}>{text.cancel}</AlertDialogCancel>
          <AlertDialogAction
            variant={action === "delete" ? "destructive" : "default"}
            disabled={isPending || (needsReason && !reasonCheck.success)}
            onClick={handleConfirm}
          >
            {isPending ? text.working : text[action].confirm}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
