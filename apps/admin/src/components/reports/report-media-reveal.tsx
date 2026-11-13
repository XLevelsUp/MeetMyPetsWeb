"use client";

import { ImageOff, Maximize2, Play, Video } from "lucide-react";
import { useState } from "react";

import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import type { ReportMedia } from "@/lib/reports-contract";

export function ReportMediaReveal({
  media,
  alt = "Reported media",
  size = "md",
  className = "",
}: {
  media: ReportMedia | null;
  alt?: string;
  size?: "sm" | "md" | "lg";
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const [failed, setFailed] = useState(false);

  const sizeClass =
    size === "sm"
      ? "size-14"
      : size === "lg"
        ? "size-36"
        : "size-20";

  if (!media?.url || failed) {
    return (
      <div
        className={`flex ${sizeClass} shrink-0 flex-col items-center justify-center gap-1 rounded-lg border border-border/60 bg-muted/50 text-muted-foreground ${className}`}
      >
        <ImageOff className="size-4 opacity-60" aria-hidden="true" />
        <span className="text-[10px]">No file</span>
      </div>
    );
  }

  const isVideo = media.contentType === "video";

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        onMouseEnter={(e) => {
          if (isVideo) {
            const v = e.currentTarget.querySelector("video");
            if (v) v.play().catch(() => {});
          }
        }}
        onMouseLeave={(e) => {
          if (isVideo) {
            const v = e.currentTarget.querySelector("video");
            if (v) {
              v.pause();
              v.currentTime = 0;
            }
          }
        }}
        title={isVideo ? "Click to play video" : "Click to enlarge photo"}
        className={`group relative ${sizeClass} shrink-0 overflow-hidden rounded-lg border border-border/80 bg-muted transition-all hover:ring-2 hover:ring-primary/40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring ${className}`}
      >
        {isVideo ? (
          <video
            src={media.url}
            muted
            loop
            playsInline
            preload="metadata"
            className="size-full object-cover"
            onError={() => setFailed(true)}
          />
        ) : (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={media.url}
            alt={alt}
            loading="lazy"
            className="size-full object-cover transition-transform group-hover:scale-105"
            onError={() => setFailed(true)}
          />
        )}

        <span className="absolute inset-0 flex items-center justify-center bg-black/30 opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100">
          {isVideo ? (
            <Play className="size-5 fill-white text-white drop-shadow-md" aria-hidden="true" />
          ) : (
            <Maximize2 className="size-4 text-white drop-shadow-sm" aria-hidden="true" />
          )}
        </span>

        {isVideo && (
          <span className="pointer-events-none absolute bottom-1 right-1 flex items-center gap-0.5 rounded bg-black/75 px-1 py-0.5 text-[10px] font-medium text-white shadow-xs">
            <Video className="size-3" aria-hidden="true" />
            VIDEO
          </span>
        )}
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md sm:max-w-xl md:max-w-2xl overflow-hidden p-4 bg-background border shadow-2xl">
          <DialogTitle className="text-sm font-medium truncate mb-2">{alt}</DialogTitle>
          <div className="relative flex flex-col items-center justify-center overflow-hidden rounded-lg bg-black/95 p-2 border border-border/40">
            {isVideo ? (
              <video
                src={media.url}
                controls
                autoPlay
                className="max-h-[70vh] w-auto max-w-full rounded-md object-contain"
              />
            ) : (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={media.url}
                alt={alt}
                className="max-h-[70vh] w-auto max-w-full rounded-md object-contain"
              />
            )}
          </div>
          <div className="mt-2.5 flex w-full items-center justify-between text-xs text-muted-foreground px-1">
            <span className="capitalize font-medium text-foreground">{media.contentType}</span>
            <a
              href={media.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary font-medium underline-offset-4 hover:underline"
            >
              Open original ↗
            </a>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
