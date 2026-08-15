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
import { Input } from "@/components/ui/input";
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
import { TAXONOMY_NAME_MAX, type TaxonomyStatus } from "@/lib/taxonomy-constants";

export type TaxonomyDraft = {
  name: string;
  description: string;
  status: TaxonomyStatus;
  speciesId?: string;
  reason: string;
};

/**
 * Create/edit form for a species or a breed.
 *
 * One dialog for both because the fields are identical apart from the species
 * selector, and two near-copies would drift. `open` is controlled by the parent
 * — Base UI's AlertDialogAction is a plain Button that does not auto-close,
 * which is what lets the dialog stay open and show a server error (a name
 * collision is the common case) instead of vanishing.
 */
export function TaxonomyDialog({
  open,
  onOpenChange,
  title,
  description,
  initial,
  speciesOptions,
  showStatus,
  isPending,
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  initial?: Partial<TaxonomyDraft>;
  /** Present only when creating a breed. */
  speciesOptions?: { id: string; name: string }[];
  showStatus: boolean;
  isPending: boolean;
  onSubmit: (draft: TaxonomyDraft) => Promise<void>;
}) {
  const text = copy.settings.form;
  const [name, setName] = useState(initial?.name ?? "");
  const [descriptionValue, setDescriptionValue] = useState(initial?.description ?? "");
  const [status, setStatus] = useState<TaxonomyStatus>(initial?.status ?? "active");
  const [speciesId, setSpeciesId] = useState(initial?.speciesId ?? speciesOptions?.[0]?.id ?? "");
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);

  const reasonCheck = reasonSchema.safeParse(reason);
  const nameValid = name.trim().length > 0 && name.trim().length <= TAXONOMY_NAME_MAX;
  const speciesValid = !speciesOptions || Boolean(speciesId);

  async function handleSubmit() {
    if (!nameValid) {
      setError("Give it a name.");
      return;
    }
    if (!reasonCheck.success) {
      setError(reasonCheck.error.issues[0]?.message ?? "Enter a reason.");
      return;
    }
    setError(null);
    try {
      await onSubmit({
        name: name.trim(),
        description: descriptionValue.trim(),
        status,
        speciesId: speciesOptions ? speciesId : undefined,
        reason: reasonCheck.data,
      });
      onOpenChange(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : text.error);
    }
  }

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>

        <div className="flex flex-col gap-4">
          {speciesOptions ? (
            <div className="flex flex-col gap-2">
              <Label htmlFor="taxonomy-species">{text.speciesLabel}</Label>
              <Select
                value={speciesId}
                onValueChange={(value) => setSpeciesId(value ?? speciesOptions[0]?.id ?? "")}
              >
                <SelectTrigger id="taxonomy-species">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {speciesOptions.map((option) => (
                    <SelectItem key={option.id} value={option.id}>
                      {option.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ) : null}

          <div className="flex flex-col gap-2">
            <Label htmlFor="taxonomy-name">{text.nameLabel}</Label>
            <Input
              id="taxonomy-name"
              value={name}
              maxLength={TAXONOMY_NAME_MAX}
              onChange={(event) => setName(event.target.value)}
              placeholder={text.namePlaceholder}
            />
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="taxonomy-description">{text.descriptionLabel}</Label>
            <Textarea
              id="taxonomy-description"
              rows={2}
              value={descriptionValue}
              onChange={(event) => setDescriptionValue(event.target.value)}
            />
          </div>

          {showStatus ? (
            <div className="flex flex-col gap-2">
              <Label htmlFor="taxonomy-status">{text.statusLabel}</Label>
              <Select
                value={status}
                onValueChange={(value) => setStatus((value ?? "active") as TaxonomyStatus)}
              >
                <SelectTrigger id="taxonomy-status">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">{copy.settings.statusLabels.active}</SelectItem>
                  <SelectItem value="inactive">{copy.settings.statusLabels.inactive}</SelectItem>
                </SelectContent>
              </Select>
              {status === "inactive" ? (
                <p className="text-xs text-muted-foreground">
                  {copy.settings.retire.description}
                </p>
              ) : null}
            </div>
          ) : null}

          <div className="flex flex-col gap-2">
            <Label htmlFor="taxonomy-reason">{text.reasonLabel}</Label>
            <Textarea
              id="taxonomy-reason"
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
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel disabled={isPending}>{text.cancel}</AlertDialogCancel>
          <AlertDialogAction
            disabled={isPending || !nameValid || !speciesValid || !reasonCheck.success}
            onClick={handleSubmit}
          >
            {isPending ? text.saving : text.save}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
