"use client";

import { m, useReducedMotion } from "motion/react";
import { PawPrint } from "lucide-react";

import { cn } from "@/lib/utils";

const STEPS = 3;

/**
 * Three paw prints that step in ahead of a section heading, so the entrance
 * is branded rather than a generic fade. Absolutely positioned (adds no
 * layout height) and sm:-only. Pure flourish — nothing under reduced motion.
 */
export function PawWalkIn({ align = "center" }: { align?: "center" | "left" }) {
  const reduced = useReducedMotion();
  if (reduced) return null;

  return (
    <span
      aria-hidden="true"
      className={cn(
        "pointer-events-none absolute -top-9 hidden h-0 sm:block",
        align === "center" ? "left-1/2 -translate-x-[4.6rem]" : "left-0",
      )}
    >
      {Array.from({ length: STEPS }).map((_, i) => (
        <m.span
          key={i}
          className="absolute text-brand-ink"
          style={{
            left: `${i * 2.2}rem`,
            top: `${(i % 2) * 0.9}rem`,
            rotate: `${20 + (i % 2 === 0 ? -14 : 14)}deg`,
          }}
          initial={{ opacity: 0, scale: 0.5 }}
          whileInView={{ opacity: [0, 0.55, 0.28], scale: 1 }}
          viewport={{ once: true, margin: "-60px" }}
          transition={{ duration: 0.55, delay: 0.1 + i * 0.14, ease: "easeOut" }}
        >
          <PawPrint className="size-[18px]" />
        </m.span>
      ))}
    </span>
  );
}
