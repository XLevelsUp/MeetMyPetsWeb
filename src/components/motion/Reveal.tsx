"use client";

import { motion, useReducedMotion } from "motion/react";
import type { ReactNode } from "react";

type RevealProps = {
  children: ReactNode;
  /** Seconds to wait before this element animates. Use for stagger. */
  delay?: number;
  /** Travel distance in px. Negative pulls from above. */
  y?: number;
  className?: string;
  as?: "div" | "li" | "section" | "article";
};

/**
 * Scroll-triggered entrance. Fires once, never replays on scroll-back.
 *
 * `data-reveal` is the hook for the <noscript> fallback in layout.tsx — without
 * it, a JS-disabled visitor would see permanently transparent content, since
 * the initial opacity:0 is baked into the prerendered HTML.
 */
export function Reveal({
  children,
  delay = 0,
  y = 18,
  className,
  as = "div",
}: RevealProps) {
  const reduced = useReducedMotion();
  const MotionTag = motion[as];

  if (reduced) {
    const Tag = as;
    return <Tag className={className}>{children}</Tag>;
  }

  return (
    <MotionTag
      data-reveal
      className={className}
      initial={{ opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-80px" }}
      transition={{ duration: 0.55, delay, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </MotionTag>
  );
}
