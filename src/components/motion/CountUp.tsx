"use client";

import { animate, useInView, useReducedMotion } from "motion/react";
import { useEffect, useRef, useState } from "react";

type CountUpProps = {
  /** Target value. Rendered immediately (no animation) under reduced motion. */
  to: number;
  /** Text shown when `to` is not a number, e.g. "All". */
  fallback?: string;
  duration?: number;
  className?: string;
};

/**
 * Counts from 0 to `to` once the element scrolls into view.
 *
 * The final value is the SSR-rendered text, so the number is correct in the
 * prerendered HTML and for screen readers even if the animation never runs.
 * `tabular-nums` stops the width jitter that would otherwise cause CLS.
 */
export function CountUp({ to, fallback, duration = 1.1, className }: CountUpProps) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: "-40px" });
  const reduced = useReducedMotion();
  const [value, setValue] = useState(to);

  useEffect(() => {
    if (fallback !== undefined || reduced || !inView) return;
    // Zero targets have nothing to count toward — animating would just flash.
    if (to === 0) return;

    setValue(0);
    const controls = animate(0, to, {
      duration,
      ease: [0.22, 1, 0.36, 1],
      onUpdate: (latest) => setValue(Math.round(latest)),
    });
    return () => controls.stop();
  }, [inView, reduced, to, duration, fallback]);

  return (
    <span ref={ref} className={className} style={{ fontVariantNumeric: "tabular-nums" }}>
      {fallback ?? value}
    </span>
  );
}
