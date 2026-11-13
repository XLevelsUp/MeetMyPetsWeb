"use client";

import { ImageOff, Maximize2 } from "lucide-react";
import { useState } from "react";

import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { copy } from "@/config/admin";
import type { AiDecisionSummary } from "@/lib/ai-moderation-contract";

const t = copy.aiReports.media;

/** Thumbnail in the row, full size on click — the moderator judges the picture, so show it. */
export function AiMediaReveal({
  media,
  alt,
}: {
  media: AiDecisionSummary["media"];
  alt: string;
}) {
  const [open, setOpen] = useState(false);
  const [failed, setFailed] = useState(false);

  if (!media.url || failed) {
    return (
      <div className="flex size-28 shrink-0 flex-col items-center justify-center gap-1 rounded-lg border bg-muted text-muted-foreground">
        <ImageOff className="size-5" aria-hidden="true" />
        <span className="text-xs">{t.noFile}</span>
      </div>
    );
  }

  const isVideo = media.contentType === "video";

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        title={t.enlarge}
        className="group relative size-28 shrink-0 overflow-hidden rounded-lg border bg-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
      >
        {isVideo ? (
          <video
            src={media.url}
            muted
            playsInline
            preload="metadata"
            className="size-full object-cover"
            onError={() => setFailed(true)}
          />
        ) : (
          // Plain <img>: unapproved media must not be optimised and cached at the edge.
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={media.url}
            alt={alt}
            loading="lazy"
            className="size-full object-cover"
            onError={() => setFailed(true)}
          />
        )}

        <span className="absolute inset-0 flex items-center justify-center bg-black/0 opacity-0 transition-all group-hover:bg-black/35 group-hover:opacity-100 group-focus-visible:bg-black/35 group-focus-visible:opacity-100">
          <Maximize2 className="size-5 text-white" aria-hidden="true" />
        </span>

        {isVideo && (
          <span className="pointer-events-none absolute right-1 bottom-1 rounded bg-black/70 px-1.5 py-0.5 text-xs font-medium text-white">
            {t.video}
          </span>
        )}
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-[min(56rem,calc(100vw-2rem))] p-2">
          <DialogTitle className="sr-only">{alt}</DialogTitle>
          {isVideo ? (
            <video
              src={media.url}
              controls
              autoPlay
              className="max-h-[80vh] w-full rounded-md bg-black object-contain"
            />
          ) : (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={media.url}
              alt={alt}
              className="max-h-[80vh] w-full rounded-md object-contain"
            />
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
