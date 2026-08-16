"use client";

import { useReducedMotion } from "motion/react";
import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

type MarqueeRowProps = {
  children: ReactNode;
  className?: string;
  /** Seconds for one full pass. Higher is slower. */
  speed?: number;
  reverse?: boolean;
};

/**
 * Continuous horizontal marquee, driven by a CSS keyframe rather than JS so it
 * runs off the main thread and costs nothing per frame.
 *
 * The track is duplicated to make the loop seamless; the copy is aria-hidden so
 * screen readers announce each profile once. Under reduced motion the whole
 * thing degrades to a static wrapped row — no scrolling, no clipped content.
 */
export function MarqueeRow({
  children,
  className,
  speed = 46,
  reverse = false,
}: MarqueeRowProps) {
  const reduced = useReducedMotion();

  if (reduced) {
    return (
      <div className={cn("flex flex-wrap justify-center gap-3", className)}>{children}</div>
    );
  }

  return (
    <div className={cn("mask-edges group relative overflow-hidden", className)}>
      <div
        className="flex w-max gap-3 group-hover:[animation-play-state:paused]"
        style={{
          animation: `marquee ${speed}s linear infinite`,
          animationDirection: reverse ? "reverse" : "normal",
        }}
      >
        <div className="flex shrink-0 gap-3">{children}</div>
        <div className="flex shrink-0 gap-3" aria-hidden="true">
          {children}
        </div>
      </div>
    </div>
  );
}
