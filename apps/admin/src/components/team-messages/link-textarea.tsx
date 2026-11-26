"use client";

import { ExternalLink } from "lucide-react";
import { Fragment, useRef } from "react";

import { Textarea } from "@/components/ui/textarea";
import { copy } from "@/config/admin";
import { splitLinks } from "@/lib/linkify";
import { cn } from "@/lib/utils";

// Textareas can't hold links, so a layer behind the transparent text draws them; keep layout in step with ui/textarea.tsx.
const LAYER = "rounded-lg border border-transparent px-2.5 py-2 text-base break-words whitespace-pre-wrap md:text-sm";

export function LinkTextarea({
  value,
  className,
  ref,
  onScroll,
  ...props
}: Omit<React.ComponentProps<"textarea">, "value"> & { value: string }) {
  const layer = useRef<HTMLDivElement>(null);
  const pieces = splitLinks(value);
  const links = pieces.filter((p) => p.type === "link");

  return (
    <div className="flex flex-col gap-1.5">
      <div className="relative rounded-lg bg-transparent dark:bg-input/30">
        <div ref={layer} aria-hidden="true" className={cn(LAYER, "pointer-events-none absolute inset-0 overflow-hidden")}>
          {pieces.map((piece, i) =>
            piece.type === "link" ? (
              <span key={i} className="text-sky-700 underline underline-offset-2 dark:text-sky-300">
                {piece.value}
              </span>
            ) : (
              <Fragment key={i}>{piece.value}</Fragment>
            ),
          )}
          {/* Keeps a trailing new line the same height as in the textarea. */}
          {"​"}
        </div>
        <Textarea
          {...props}
          ref={ref}
          value={value}
          onScroll={(event) => {
            if (layer.current) layer.current.scrollTop = event.currentTarget.scrollTop;
            onScroll?.(event);
          }}
          className={cn(
            "relative bg-transparent text-transparent caret-foreground selection:bg-sky-200/60 dark:bg-transparent dark:selection:bg-sky-800/60",
            className,
          )}
        />
      </div>
      {links.length > 0 ? (
        <div className="flex flex-col gap-1 text-xs text-muted-foreground">
          <span>{copy.teamMessages.linksFound}</span>
          <ul className="flex flex-wrap gap-1.5">
            {links.map((link, i) =>
              link.type === "link" ? (
                <li key={`${link.href}-${i}`} className="min-w-0 max-w-full">
                  <a
                    href={link.href}
                    target="_blank"
                    rel="noopener noreferrer nofollow"
                    className="inline-flex max-w-full items-center gap-1 rounded-full border border-sky-200 bg-sky-50 px-2 py-0.5 text-sky-800 hover:bg-sky-100 dark:border-sky-800 dark:bg-sky-950/40 dark:text-sky-200"
                  >
                    <ExternalLink className="size-3 shrink-0" aria-hidden="true" />
                    <span className="truncate">{link.value}</span>
                  </a>
                </li>
              ) : null,
            )}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
