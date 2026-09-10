"use client";

import { m, useReducedMotion } from "motion/react";
import type { ReactNode } from "react";

type RevealProps = {
  children: ReactNode;
  /** Seconds to wait before this element animates. Use for stagger. */
  delay?: number;
  /** Travel distance in px. Negative pulls from above. */
  y?: number;
  className?: string;
  as?: "div" | "li" | "section" | "article";
  /**
   * "floaty" (default) — a slow, heavily-damped spring with zero overshoot.
   * For whole sections, headings and other large blocks: settles gently,
   * feels weightless rather than mechanical.
   *
   * "springy" — a lighter, underdamped spring that overshoots slightly
   * before settling, plus a small scale-in. For small elements (cards,
   * icons, badges) where a bit of bounce reads as energetic rather than
   * janky.
   */
  variant?: "floaty" | "springy";
};

const SPRINGS = {
  floaty: { type: "spring" as const, stiffness: 70, damping: 22, mass: 0.9 },
  // Damping raised from 16 → 22: a hair of overshoot so cards land with
  // weight, not a visible bounce. The "premium, not kids' app" line.
  springy: { type: "spring" as const, stiffness: 220, damping: 22, mass: 0.7 },
};

/**
 * Scroll-triggered entrance. Fires once, never replays on scroll-back.
 *
 * `data-reveal` is the hook for the <noscript> fallback in layout.tsx — without
 * it, a JS-disabled visitor would see permanently transparent content, since
 * the initial opacity:0 is baked into the prerendered HTML.
 *
 * Spring-driven (not eased duration) so both variants feel physical: floaty
 * sections arrive like they're settling under their own weight, springy
 * elements overshoot a hair and bounce back — a subtler version of the same
 * distinction whileHover/whileTap already used for buttons/cards.
 */
export function Reveal({
  children,
  delay = 0,
  y,
  className,
  as = "div",
  variant = "floaty",
}: RevealProps) {
  const reduced = useReducedMotion();
  const MotionTag = m[as];

  if (reduced) {
    const Tag = as;
    return <Tag className={className}>{children}</Tag>;
  }

  const travel = y ?? (variant === "springy" ? 14 : 22);

  return (
    <MotionTag
      data-reveal
      className={className}
      initial={{ opacity: 0, y: travel, scale: variant === "springy" ? 0.97 : 1 }}
      whileInView={{ opacity: 1, y: 0, scale: 1 }}
      viewport={{ once: true, margin: "-80px" }}
      transition={{ ...SPRINGS[variant], delay }}
    >
      {children}
    </MotionTag>
  );
}
