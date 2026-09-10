"use client";

import { m, useMotionValue, useSpring } from "motion/react";
import Image from "next/image";
import { useEffect, useRef } from "react";

import { cn } from "@/lib/utils";

const SRC = "/MMP Dog 01.webp";
const NATIVE_W = 166;
const NATIVE_H = 93;
export const MASCOT_ASPECT = NATIVE_H / NATIVE_W;
/** Pointer distance (px) beyond which the dog stops paying attention. */
const NOTICE_PX = 360;

/**
 * The hero mascot — the same dog cutout that peeks over the Trust card, so it
 * reads as one character across the page.
 *
 * `reactive`: tilts and leans toward the pointer, more so the closer it gets.
 * One rAF-throttled listener writing to springs; no React render per frame.
 * Fine pointers only — touch has no hover to react to.
 */
export function HeroMascot({
  width,
  className,
  reactive = false,
  wave = false,
  priority = false,
}: {
  /** Rendered width in px; height follows the artwork's aspect ratio. */
  width: number;
  className?: string;
  reactive?: boolean;
  wave?: boolean;
  priority?: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const tilt = useMotionValue(0);
  const lean = useMotionValue(0);
  const sTilt = useSpring(tilt, { stiffness: 140, damping: 16 });
  const sLean = useSpring(lean, { stiffness: 140, damping: 18 });

  useEffect(() => {
    if (!reactive) return;
    if (!window.matchMedia("(pointer: fine)").matches) return;

    let raf = 0;
    let last: PointerEvent | null = null;

    const update = () => {
      raf = 0;
      const el = ref.current;
      if (!el || !last) return;
      const rect = el.getBoundingClientRect();
      const dx = last.clientX - (rect.left + rect.width / 2);
      const dy = last.clientY - (rect.top + rect.height / 2);
      const dist = Math.hypot(dx, dy) || 1;
      const near = Math.max(0, 1 - dist / NOTICE_PX);
      tilt.set((dx / dist) * 9 * (0.35 + 0.65 * near));
      lean.set((dx / dist) * 5 * near);
    };

    const onMove = (event: PointerEvent) => {
      last = event;
      if (!raf) raf = requestAnimationFrame(update);
    };

    window.addEventListener("pointermove", onMove, { passive: true });
    return () => {
      window.removeEventListener("pointermove", onMove);
      if (raf) cancelAnimationFrame(raf);
    };
  }, [reactive, tilt, lean]);

  const height = Math.round(width * MASCOT_ASPECT);

  return (
    <m.div
      ref={ref}
      className={cn("relative shrink-0 origin-bottom", className)}
      style={{ width, height, ...(reactive ? { rotate: sTilt, x: sLean } : {}) }}
    >
      <Image
        src={SRC}
        alt=""
        width={NATIVE_W}
        height={NATIVE_H}
        priority={priority}
        sizes={`${width}px`}
        draggable={false}
        className={cn(
          "h-full w-full object-contain drop-shadow-md select-none",
          wave && "origin-bottom motion-safe:animate-wiggle-tail",
        )}
      />
    </m.div>
  );
}
