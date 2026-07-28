"use client";

import { motion, useMotionValue, useReducedMotion, useSpring, useTransform } from "motion/react";
import { useRef, type ReactNode } from "react";

import { cn } from "@/lib/utils";

type ParallaxCardProps = {
  children: ReactNode;
  className?: string;
  /** Maximum tilt in degrees at the card's edge. */
  tilt?: number;
  /** Spring config from the brief: stiffness 100, damping 15. */
  float?: boolean;
  floatDelay?: number;
};

/**
 * Mouse-aware tilt card used for the hero's floating UI mockups.
 *
 * The tilt is driven by pointer position relative to the card centre and is
 * disabled entirely for touch pointers and reduced-motion users — on a phone
 * there is no cursor to be aware of, so the effect would only cost frames.
 */
export function ParallaxCard({
  children,
  className,
  tilt = 9,
  float = false,
  floatDelay = 0,
}: ParallaxCardProps) {
  const ref = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion();

  const px = useMotionValue(0);
  const py = useMotionValue(0);

  const spring = { stiffness: 100, damping: 15, mass: 0.6 };
  const rotateX = useSpring(useTransform(py, [-0.5, 0.5], [tilt, -tilt]), spring);
  const rotateY = useSpring(useTransform(px, [-0.5, 0.5], [-tilt, tilt]), spring);

  function handleMove(event: React.PointerEvent) {
    if (reduced || event.pointerType !== "mouse" || !ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    px.set((event.clientX - rect.left) / rect.width - 0.5);
    py.set((event.clientY - rect.top) / rect.height - 0.5);
  }

  function reset() {
    px.set(0);
    py.set(0);
  }

  return (
    <motion.div
      ref={ref}
      onPointerMove={handleMove}
      onPointerLeave={reset}
      style={
        reduced
          ? undefined
          : { rotateX, rotateY, transformPerspective: 900, transformStyle: "preserve-3d" }
      }
      className={cn(
        float && !reduced && "motion-safe:animate-[float_7s_ease-in-out_infinite]",
        className,
      )}
      // Stagger the idle float so the three hero cards never bob in lockstep.
      {...(float && !reduced ? { transition: { delay: floatDelay } } : {})}
    >
      {children}
    </motion.div>
  );
}
