"use client";

import { ExternalLink, RotateCcw, ZoomIn, ZoomOut } from "lucide-react";
import { useCallback, useRef, useState } from "react";

import { isImageMime, isPdfMime } from "@/components/verifications/verification-format";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { copy } from "@/config/admin";
import { useCertificateDocument } from "@/hooks/use-verifications";

/**
 * The right half of the review split — the actual uploaded evidence.
 *
 * Zoom and pan are hand-rolled CSS transforms rather than a dependency: the
 * whole interaction is a scale factor and an offset, and the repo has no
 * viewer library (nor a use for one elsewhere). Precedent:
 * components/shared/pagination.tsx.
 *
 * The URL is minted on demand and expires; every failure mode here is a real
 * state with a way out, because a moderator staring at a blank pane cannot
 * tell "still loading" from "this document is gone".
 *
 * The caller mounts this with `key={certificate.id}`, so moving to the next
 * item remounts it at a neutral zoom. Inheriting the previous scan's zoom
 * would silently hide part of the next one.
 */

const MIN_SCALE = 0.5;
const MAX_SCALE = 5;
const SCALE_STEP = 0.25;

export function DocumentViewer({
  certificateId,
  hasDocument,
  mimeType,
}: {
  certificateId: string;
  hasDocument: boolean;
  mimeType: string | null;
}) {
  const doc = useCertificateDocument(certificateId, hasDocument);
  const [scale, setScale] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  // `isDragging` is state, not just the ref, because the cursor style is read
  // during render — a ref would be stale and eslint rightly flags it.
  const [isDragging, setIsDragging] = useState(false);
  const dragStart = useRef<{ x: number; y: number; ox: number; oy: number } | null>(null);

  const reset = useCallback(() => {
    setScale(1);
    setOffset({ x: 0, y: 0 });
  }, []);

  const clamp = (value: number) => Math.min(MAX_SCALE, Math.max(MIN_SCALE, value));

  function handleWheel(event: React.WheelEvent) {
    if (!event.ctrlKey && !event.metaKey) return;
    // Only intercept deliberate zoom gestures, so ordinary scrolling still
    // moves the page rather than trapping the wheel inside the pane.
    event.preventDefault();
    setScale((prev) => clamp(prev - event.deltaY * 0.002));
  }

  function handlePointerDown(event: React.PointerEvent) {
    if (event.button !== 0) return;
    dragStart.current = { x: event.clientX, y: event.clientY, ox: offset.x, oy: offset.y };
    setIsDragging(true);
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function handlePointerMove(event: React.PointerEvent) {
    const start = dragStart.current;
    if (!start) return;
    setOffset({
      x: start.ox + (event.clientX - start.x),
      y: start.oy + (event.clientY - start.y),
    });
  }

  function handlePointerUp(event: React.PointerEvent) {
    dragStart.current = null;
    setIsDragging(false);
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  }

  if (!hasDocument) {
    return (
      <div className="flex h-full min-h-64 items-center justify-center rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
        {copy.verifications.review.noDocument}
      </div>
    );
  }

  if (doc.isPending) {
    return (
      <div className="flex h-full min-h-64 flex-col gap-2 rounded-lg border p-3">
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-full min-h-48 w-full" />
        <span className="sr-only">{copy.verifications.review.loading}</span>
      </div>
    );
  }

  if (doc.isError) {
    return (
      <div className="flex h-full min-h-64 flex-col items-center justify-center gap-3 rounded-lg border p-6 text-center">
        <p className="text-sm text-muted-foreground">
          {copy.verifications.review.documentError}
        </p>
        <p className="text-xs text-muted-foreground">{doc.error.message}</p>
        <Button variant="outline" size="sm" onClick={() => doc.refetch()}>
          {copy.verifications.review.reload}
        </Button>
      </div>
    );
  }

  const { url } = doc.data;
  const image = isImageMime(mimeType);
  const pdf = isPdfMime(mimeType);

  return (
    <div className="flex h-full flex-col gap-2">
      <div className="flex flex-wrap items-center gap-1">
        {image ? (
          <>
            <Button
              variant="outline"
              size="sm"
              aria-label={copy.verifications.review.zoomOut}
              onClick={() => setScale((p) => clamp(p - SCALE_STEP))}
            >
              <ZoomOut className="size-4" aria-hidden="true" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              aria-label={copy.verifications.review.zoomIn}
              onClick={() => setScale((p) => clamp(p + SCALE_STEP))}
            >
              <ZoomIn className="size-4" aria-hidden="true" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              aria-label={copy.verifications.review.resetView}
              onClick={reset}
            >
              <RotateCcw className="size-4" aria-hidden="true" />
            </Button>
            <span className="ml-1 text-xs tabular-nums text-muted-foreground">
              {Math.round(scale * 100)}%
            </span>
          </>
        ) : null}

        {/* Always available: the inline viewer can fail for reasons we do not
            control (odd mime, browser PDF policy), and a reviewer must still
            be able to see the document they are judging. */}
        <Button variant="ghost" size="sm" className="ml-auto" render={<a href={url} target="_blank" rel="noreferrer" />}>
          <ExternalLink className="mr-1 size-4" aria-hidden="true" />
          {copy.verifications.review.openInNewTab}
        </Button>
      </div>

      <div
        className="relative h-full min-h-64 flex-1 overflow-hidden rounded-lg border bg-muted"
        onWheel={image ? handleWheel : undefined}
      >
        {image ? (
          /* next/image is deliberately not used: it cannot optimize a
             short-lived signed URL from a private bucket, and a reviewer
             judging a document needs the untouched original rather than a
             re-encoded thumbnail. */
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={url}
            alt="Certificate document under review"
            draggable={false}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerUp}
            style={{
              transform: `translate(${offset.x}px, ${offset.y}px) scale(${scale})`,
              transformOrigin: "center center",
              cursor: isDragging ? "grabbing" : "grab",
            }}
            className="mx-auto block max-h-full w-auto select-none transition-transform duration-75"
          />
        ) : pdf ? (
          <object data={url} type="application/pdf" className="h-full min-h-96 w-full">
            <div className="flex h-full flex-col items-center justify-center gap-3 p-6 text-center">
              <p className="text-sm text-muted-foreground">
                {copy.verifications.review.pdfFallback}
              </p>
              <Button variant="outline" size="sm" render={<a href={url} target="_blank" rel="noreferrer" />}>
                {copy.verifications.review.openInNewTab}
              </Button>
            </div>
          </object>
        ) : (
          <div className="flex h-full flex-col items-center justify-center gap-3 p-6 text-center">
            <p className="text-sm text-muted-foreground">
              {copy.verifications.review.pdfFallback}
            </p>
            <Button variant="outline" size="sm" render={<a href={url} target="_blank" rel="noreferrer" />}>
              {copy.verifications.review.openInNewTab}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
