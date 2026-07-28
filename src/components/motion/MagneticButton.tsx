"use client";

import { motion, useMotionValue, useReducedMotion, useSpring } from "motion/react";
import { useRef, type ReactNode } from "react";

import { cn } from "@/lib/utils";

type MagneticButtonProps = {
  children: ReactNode;
  href?: string;
  onClick?: () => void;
  variant?: "brand" | "outline";
  className?: string;
  /** How far the button drifts toward the cursor, in px. */
  strength?: number;
};

const base =
  "relative inline-flex min-h-11 items-center justify-center gap-2 rounded-full px-6 text-sm font-semibold " +
  "transition-colors duration-200 cursor-pointer select-none";

const variants = {
  // White on --brand = 4.61:1. Safe as a fill; see globals.css contrast note.
  brand: "bg-brand text-white hover:bg-brand-ink shadow-soft",
  outline: "border border-border bg-card text-ink hover:bg-accent",
} as const;

/**
 * Button that drifts toward the pointer on hover.
 *
 * Pointer-only by design: the effect is skipped on touch (where there is no
 * hover) and under prefers-reduced-motion. In both cases you get a normal
 * button with all the same semantics — never a div with a click handler.
 */
export function MagneticButton({
  children,
  href,
  onClick,
  variant = "brand",
  className,
  strength = 14,
}: MagneticButtonProps) {
  const ref = useRef<HTMLElement>(null);
  const reduced = useReducedMotion();

  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const springX = useSpring(x, { stiffness: 260, damping: 18, mass: 0.4 });
  const springY = useSpring(y, { stiffness: 260, damping: 18, mass: 0.4 });

  function handleMove(event: React.PointerEvent) {
    if (reduced || event.pointerType !== "mouse" || !ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    const relX = event.clientX - (rect.left + rect.width / 2);
    const relY = event.clientY - (rect.top + rect.height / 2);
    x.set((relX / (rect.width / 2)) * strength);
    y.set((relY / (rect.height / 2)) * strength);
  }

  function reset() {
    x.set(0);
    y.set(0);
  }

  const style = reduced ? undefined : { x: springX, y: springY };
  const classes = cn(base, variants[variant], className);

  if (href) {
    return (
      <motion.a
        ref={ref as React.Ref<HTMLAnchorElement>}
        href={href}
        className={classes}
        style={style}
        onPointerMove={handleMove}
        onPointerLeave={reset}
        whileTap={reduced ? undefined : { scale: 0.97 }}
      >
        {children}
      </motion.a>
    );
  }

  return (
    <motion.button
      ref={ref as React.Ref<HTMLButtonElement>}
      type="button"
      onClick={onClick}
      className={classes}
      style={style}
      onPointerMove={handleMove}
      onPointerLeave={reset}
      whileTap={reduced ? undefined : { scale: 0.97 }}
    >
      {children}
    </motion.button>
  );
}
