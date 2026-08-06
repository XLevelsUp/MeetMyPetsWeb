"use client";

import { useState } from "react";

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
import { copy } from "@/config/admin";
import type { AuditEntry } from "@/lib/audit-contract";
import { actionLabel, formatWhen } from "@/components/audit/audit-format";

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-0.5">
      <dt className="text-xs uppercase tracking-wide text-muted-foreground">{label}</dt>
      <dd className="break-words text-sm">{value}</dd>
    </div>
  );
}

/**
 * Full record behind a row. The table shows the scannable summary; nothing is
 * hidden — metadata is rendered verbatim so an auditor sees exactly what was
 * written.
 */
export function AuditDetailDialog({ entry }: { entry: AuditEntry }) {
  const [open, setOpen] = useState(false);
  const hasMetadata = Object.keys(entry.metadata).length > 0;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <Button variant="ghost" size="sm" onClick={() => setOpen(true)}>
        {copy.audit.details}
      </Button>

      <DialogContent>
        <DialogHeader>
          <DialogTitle>{copy.audit.detailDialog.title}</DialogTitle>
          <DialogDescription>{copy.audit.detailDialog.description}</DialogDescription>
        </DialogHeader>

        <dl className="flex flex-col gap-4">
          <Row label={copy.audit.columns.when} value={formatWhen(entry.createdAt)} />
          <Row
            label={copy.audit.columns.actor}
            value={`${entry.actorEmail} (${entry.actorRole})`}
          />
          <Row label={copy.audit.columns.action} value={actionLabel(entry.action)} />
          <Row
            label={copy.audit.columns.target}
            value={`${entry.targetType} · ${entry.targetId}`}
          />
          <Row label={copy.audit.columns.reason} value={entry.reason} />

          <div className="flex flex-col gap-1.5">
            <dt className="text-xs uppercase tracking-wide text-muted-foreground">
              {copy.audit.detailDialog.metadata}
            </dt>
            <dd>
              {hasMetadata ? (
                <pre className="max-h-56 overflow-auto rounded-md bg-muted p-3 text-xs">
                  {JSON.stringify(entry.metadata, null, 2)}
                </pre>
              ) : (
                <span className="text-sm text-muted-foreground">
                  {copy.audit.detailDialog.noMetadata}
                </span>
              )}
            </dd>
          </div>
        </dl>

        <DialogFooter>
          <DialogClose render={<Button variant="outline" />}>
            {copy.audit.detailDialog.close}
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
