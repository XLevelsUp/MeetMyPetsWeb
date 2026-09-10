"use client";

import { domMax, LazyMotion } from "motion/react";
import type { ReactNode } from "react";

/**
 * One shared LazyMotion provider, `strict` mode on — every animated component
 * uses the lightweight `m` component, and strict throws if any imports the
 * eager `motion` one. `domMax` rather than `domAnimation` because the
 * ecosystem tabs use `layoutId`.
 */
export function MotionProvider({ children }: { children: ReactNode }) {
  return (
    <LazyMotion features={domMax} strict>
      {children}
    </LazyMotion>
  );
}
