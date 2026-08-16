"use client";

import Link from "next/link";
import { useState } from "react";

import { DecideDialog } from "@/components/verifications/decide-dialog";
import { DocumentViewer } from "@/components/verifications/document-viewer";
import {
  formatDate,
  formatWhen,
  isExpired,
  statusLabel,
  statusVariant,
  typeLabel,
} from "@/components/verifications/verification-format";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { copy } from "@/config/admin";
import { useReviewShortcuts } from "@/hooks/use-review-shortcuts";
import { useDecideCertificate } from "@/hooks/use-verifications";
import type { RejectionReason } from "@/lib/certificate-constants";
import type { CertificateSummary } from "@/lib/verifications-contract";

function Claim({ label, value, flag }: { label: string; value: string | null; flag?: string }) {
  return (
    <div className="flex flex-col gap-0.5">
      <dt className="text-xs uppercase tracking-wide text-muted-foreground">{label}</dt>
      <dd className="break-words text-sm">
        {value?.trim() ? (
          <>
            {value}
            {flag ? (
              <span className="ml-2 text-xs font-medium text-destructive">{flag}</span>
            ) : null}
          </>
        ) : (
          // Never render an empty cell: a blank field must read as "the owner
          // left this out", not as something the reviewer already checked.
          <span className="text-muted-foreground">{copy.verifications.review.notProvided}</span>
        )}
      </dd>
    </div>
  );
}

/**
 * The review surface: the owner's claims on the left, their document on the
 * right, and the two decisions.
 *
 * This is a transcription check, not an OCR diff — there is no extracted text
 * or confidence score in this system (see lib/verifications.ts). The copy says
 * so, so nobody mistakes the left pane for something a machine already read.
 */
export function ReviewPane({
  certificate,
  onDecided,
}: {
  certificate: CertificateSummary | null;
  onDecided: () => void;
}) {
  const [dialog, setDialog] = useState<"approve" | "reject" | null>(null);
  const decide = useDecideCertificate();
  const review = copy.verifications.review;

  const canDecide = Boolean(certificate) && certificate?.status === "pending";

  useReviewShortcuts({
    onApprove: () => setDialog("approve"),
    onReject: () => setDialog("reject"),
    enabled: canDecide && dialog === null,
  });

  if (!certificate) {
    return (
      <div className="flex min-h-64 items-center justify-center rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
        {review.selectPrompt}
      </div>
    );
  }

  async function handleConfirm(input: { reason: string; rejectionReason?: RejectionReason }) {
    if (!certificate || !dialog) return;
    await decide.mutateAsync({
      id: certificate.id,
      decision: dialog,
      reason: input.reason,
      rejectionReason: input.rejectionReason,
    });
    onDecided();
  }

  const { claims } = certificate;
  const expiredFlag = isExpired(claims.expiresAt) ? "Expired" : undefined;

  return (
    <div className="flex flex-col gap-4 rounded-lg border p-4">
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant={statusVariant(certificate.status)}>
          {statusLabel(certificate.status)}
        </Badge>
        <Badge variant="secondary">{typeLabel(certificate.certificateType)}</Badge>
        <span className="text-sm">
          {certificate.petName ?? certificate.petId}
        </span>
        {certificate.ownerAccountId ? (
          <Link
            href={`/users/${certificate.ownerAccountId}`}
            className="text-xs text-muted-foreground underline-offset-4 hover:underline"
          >
            {certificate.ownerEmail ?? "Open owner"}
          </Link>
        ) : null}
        <span className="ml-auto text-xs text-muted-foreground">
          {formatWhen(certificate.createdAt)}
        </span>
      </div>

      {/* Stacks on small screens; the side-by-side comparison only makes sense
          once there is room for both halves. */}
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="flex flex-col gap-4">
          <div>
            <h3 className="text-sm font-medium">{review.claimsHeading}</h3>
            <p className="mt-0.5 text-xs text-muted-foreground">{review.claimsHint}</p>
          </div>

          <dl className="grid gap-3 sm:grid-cols-2">
            <Claim label="Title" value={claims.title} />
            <Claim label="Certificate no." value={claims.certificateNumber} />
            <Claim label="Issued by" value={claims.issuedBy} />
            <Claim label="Issued on" value={formatDate(claims.issuedAt)} />
            <Claim label="Expires" value={formatDate(claims.expiresAt)} flag={expiredFlag} />
            <Claim label="Next due" value={formatDate(claims.nextDueAt)} />
            <Claim label="Veterinarian" value={claims.veterinarian} />
            <Claim label="Clinic" value={claims.clinicName} />
          </dl>

          {claims.notes?.trim() ? (
            <Claim label="Owner's notes" value={claims.notes} />
          ) : null}

          <div className="rounded-md bg-muted p-3">
            <h3 className="text-xs font-medium uppercase tracking-wide">
              {review.levelHeading}
            </h3>
            {certificate.level ? (
              <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                <Badge variant="outline">
                  {certificate.level.levelCode ?? "—"}
                  {certificate.level.level !== null ? ` (L${certificate.level.level})` : ""}
                </Badge>
                {certificate.level.vaccinationVerified ? (
                  <Badge variant="outline">Vaccination</Badge>
                ) : null}
                {certificate.level.healthVerified ? <Badge variant="outline">Health</Badge> : null}
                {certificate.level.ownershipVerified ? (
                  <Badge variant="outline">Ownership</Badge>
                ) : null}
              </div>
            ) : (
              <p className="mt-1 text-sm text-muted-foreground">{review.noLevel}</p>
            )}
            <p className="mt-1.5 text-xs text-muted-foreground">{review.levelHint}</p>
          </div>

          {certificate.status !== "pending" ? (
            <div className="rounded-md border p-3 text-sm">
              <span className="text-muted-foreground">
                {statusLabel(certificate.status)} · {formatWhen(certificate.reviewedAt)}
              </span>
              {certificate.remarks ? (
                <p className="mt-1 break-words">{certificate.remarks}</p>
              ) : null}
            </div>
          ) : null}
        </div>

        <div className="flex min-h-96 flex-col gap-2">
          <h3 className="text-sm font-medium">{review.documentHeading}</h3>
          {/* Keyed so moving to the next certificate remounts the viewer at a
              neutral zoom rather than inheriting the previous scan's. */}
          <DocumentViewer
            key={certificate.id}
            certificateId={certificate.id}
            hasDocument={certificate.hasDocument}
            mimeType={certificate.mimeType}
          />
        </div>
      </div>

      {canDecide ? (
        <div className="flex flex-wrap items-center gap-2 border-t pt-4">
          <Button
            variant="default"
            disabled={decide.isPending}
            onClick={() => setDialog("approve")}
          >
            {copy.verifications.decide.approve}
          </Button>
          <Button
            variant="destructive"
            disabled={decide.isPending}
            onClick={() => setDialog("reject")}
          >
            {copy.verifications.decide.reject}
          </Button>
          <span className="text-xs text-muted-foreground">{review.shortcutHint}</span>
        </div>
      ) : null}

      <DecideDialog
        decision={dialog}
        open={dialog !== null}
        onOpenChange={(open) => setDialog(open ? dialog : null)}
        onConfirm={handleConfirm}
        isPending={decide.isPending}
      />
    </div>
  );
}
