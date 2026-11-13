"use client";

import { Check, Clock, Minus, X } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import { DecideDialog } from "@/components/verifications/decide-dialog";
import { DocumentViewer } from "@/components/verifications/document-viewer";
import { CertificateStatusBadge, CertificateTypeBadge } from "@/components/verifications/verification-badges";
import {
  formatDate,
  formatWhen,
  expiryNote,
  waitingNote,
  statusLabel,} from "@/components/verifications/verification-format";
import { Spinner } from "@/components/shared/spinner";
import { Button } from "@/components/ui/button";
import { copy } from "@/config/admin";
import { useReviewShortcuts } from "@/hooks/use-review-shortcuts";
import { useDecideCertificate } from "@/hooks/use-verifications";
import type { RejectionReason } from "@/lib/certificate-constants";
import type { CertificateSummary } from "@/lib/verifications-contract";

/** A boxed set of related claims; `alert` tints the box when something inside is wrong. */
function ClaimGroup({
  title,
  tone,
  children,
}: {
  title?: string;
  tone?: "alert";
  children: React.ReactNode;
}) {
  return (
    <section
      className={`rounded-lg border px-3 py-2.5 ${
        tone === "alert" ? "border-rejected/30 bg-rejected-soft/40" : "bg-card"
      }`}
    >
      {title ? (
        <h4 className="mb-2 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
          {title}
        </h4>
      ) : null}
      <dl className="grid grid-cols-2 gap-x-4 gap-y-2.5">{children}</dl>
    </section>
  );
}

/** One strand of the pet's verification. Tick and colour both carry the state. */
function LevelPill({ label, done }: { label: string; done: boolean | null }) {
  return (
    <span
      className={`inline-flex min-h-6 items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-medium ${
        done
          ? "border-approved/25 bg-approved-soft text-approved-fg"
          : "border-border text-muted-foreground"
      }`}
    >
      {done ? (
        <Check className="size-3" aria-hidden="true" />
      ) : (
        <Minus className="size-3" aria-hidden="true" />
      )}
      {label}
    </span>
  );
}

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
  const expiredFlag = expiryNote(claims.expiresAt) ?? undefined;
  const waiting = certificate.status === "pending" ? waitingNote(certificate.createdAt) : null;

  return (
    <div className="flex flex-col gap-4 overflow-hidden rounded-lg border">
      {/* Two rows, not one: badges and the pet never compete with the waiting
          time for space, so nothing is clipped at a narrow column width. */}
      <div className="flex flex-col gap-2.5 border-b bg-muted/40 px-4 py-3">
        <div className="flex flex-wrap items-center gap-2">
          <CertificateStatusBadge status={certificate.status} />
          <CertificateTypeBadge type={certificate.certificateType} />
          {/* Green under 3 days, amber under a week, red beyond: a date alone never shows neglect. */}
          {waiting ? (
            <span
              className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-medium ${
                waiting.days >= 7
                  ? "border-rejected/30 bg-rejected-soft text-rejected-fg"
                  : waiting.days >= 3
                    ? "border-waiting/30 bg-waiting-soft text-waiting-fg"
                    : "border-approved/25 bg-approved-soft text-approved-fg"
              }`}
            >
              <Clock className="size-3.5" aria-hidden="true" />
              {waiting.text}
            </span>
          ) : null}
          <span className="ml-auto text-xs whitespace-nowrap text-muted-foreground">
            {formatWhen(certificate.createdAt)}
          </span>
        </div>

        <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
          <span className="font-medium">{certificate.petName ?? certificate.petId}</span>
          {certificate.ownerAccountId ? (
            <Link
              href={`/users/${certificate.ownerAccountId}`}
              className="truncate text-sm text-muted-foreground underline-offset-4 hover:underline"
            >
              {certificate.ownerEmail ?? "Open owner"}
            </Link>
          ) : null}
        </div>
      </div>

      {/* The scan gets the wider column: the claims are short labelled fields,
          while a certificate is unreadable at half width. */}
      <div className="grid gap-5 px-4 lg:grid-cols-[minmax(0,22rem)_minmax(0,1fr)]">
        <div className="flex flex-col gap-3">
          <div>
            <h3 className="text-sm font-medium">{review.claimsHeading}</h3>
            <p className="mt-0.5 text-xs text-muted-foreground">{review.claimsHint}</p>
          </div>

          {/* One box, not three: the groups cost more height than they saved in scanning. */}
          <ClaimGroup tone={expiredFlag ? "alert" : undefined}>
            <Claim label="Title" value={claims.title} />
            <Claim label="Certificate no." value={claims.certificateNumber} />
            <Claim label="Issued on" value={formatDate(claims.issuedAt)} />
            <Claim label="Expires" value={formatDate(claims.expiresAt)} flag={expiredFlag} />
            <Claim label="Next due" value={formatDate(claims.nextDueAt)} />
            <Claim label="Issued by" value={claims.issuedBy} />
            <Claim label="Veterinarian" value={claims.veterinarian} />
            <Claim label="Clinic" value={claims.clinicName} />
          </ClaimGroup>


          {claims.notes?.trim() ? (
            <Claim label="Owner's notes" value={claims.notes} />
          ) : null}

          <div className="rounded-lg border bg-muted/40 px-3.5 py-3">
            <h4 className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
              {review.levelHeading}
            </h4>
            {certificate.level ? (
              /* Green for what is verified, grey for what is not: three green
                 pills and a grey one say more than four identical outlines. */
              <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                <span className="inline-flex min-h-6 items-center rounded-full border border-trust/30 bg-trust-soft px-2.5 py-0.5 text-xs font-semibold text-trust-fg">
                  {certificate.level.levelCode ?? "—"}
                  {certificate.level.level !== null ? ` (L${certificate.level.level})` : ""}
                </span>
                <LevelPill label="Vaccination" done={certificate.level.vaccinationVerified} />
                <LevelPill label="Health" done={certificate.level.healthVerified} />
                <LevelPill label="Ownership" done={certificate.level.ownershipVerified} />
              </div>
            ) : (
              <p className="mt-1 text-sm text-muted-foreground">{review.noLevel}</p>
            )}
            <p className="mt-1.5 text-xs text-muted-foreground">{review.levelHint}</p>
          </div>

          {certificate.status !== "pending" ? (
            <div className="rounded-lg border px-3.5 py-3 text-sm">
              <span className="text-muted-foreground">
                {statusLabel(certificate.status)} · {formatWhen(certificate.reviewedAt)}
              </span>
              {certificate.remarks ? (
                <p className="mt-1 break-words">{certificate.remarks}</p>
              ) : null}
            </div>
          ) : null}
        </div>

        <div className="flex flex-col gap-2">
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

      {/* Sticky: the scan is tall, and a decision bar that scrolls away means
          hunting for it after every certificate. */}
      {canDecide ? (
        <div className="sticky bottom-0 flex flex-wrap items-center gap-2 rounded-b-lg border-t bg-card/95 px-4 py-3 backdrop-blur">
          <Button
            disabled={decide.isPending}
            onClick={() => setDialog("approve")}
            nativeButton
            className="gap-1.5 bg-approved text-white hover:bg-approved/90"
          >
            {decide.isPending ? <Spinner className="text-white" /> : <Check className="size-4" aria-hidden="true" />}
            {copy.verifications.decide.approve}
          </Button>
          <Button
            disabled={decide.isPending}
            onClick={() => setDialog("reject")}
            nativeButton
            className="gap-1.5 bg-rejected text-white hover:bg-rejected/90"
          >
            {decide.isPending ? <Spinner className="text-white" /> : <X className="size-4" aria-hidden="true" />}
            {copy.verifications.decide.reject}
          </Button>
          <span className="ml-auto text-xs text-muted-foreground">{review.shortcutHint}</span>
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
