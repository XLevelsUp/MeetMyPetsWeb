"use client";

import { domMax, LazyMotion } from "motion/react";
import type { ReactNode } from "react";

/**
 * Wraps the whole app in one shared LazyMotion provider, `strict` mode on.
 *
 * Every animated component in this app uses the lightweight `m` component
 * (never the eager `motion` one — `strict` throws if any does, catching a
 * regression immediately instead of silently doubling the bundle). `domMax`
 * rather than the smaller `domAnimation` because the Ecosystem section's
 * sliding tab-pill highlight uses `layoutId`, a layout-animation feature
 * `domAnimation` does not include.
 *
 * A dedicated client component, not inlined in layout.tsx: RootLayout is a
 * Server Component (static metadata, next/font), and LazyMotion needs a
 * client boundary. This is that boundary and nothing else.
 */
export function MotionProvider({ children }: { children: ReactNode }) {
  return (
    <LazyMotion features={domMax} strict>
      {children}
    </LazyMotion>
  );
}
