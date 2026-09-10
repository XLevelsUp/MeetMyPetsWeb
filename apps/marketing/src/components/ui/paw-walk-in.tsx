"use client";

import { m, useReducedMotion } from "motion/react";
import { PawPrint } from "lucide-react";

import { cn } from "@/lib/utils";

const STEPS = 3;

/**
 * Three paw prints that step in, one after another, just before a section
 * heading settles — the entrance is branded rather than a generic fade.
 * Alternating left/right offsets read as footsteps; each print lands,
 * brightens briefly, then settles to a faint mark.
 *
 * Absolutely positioned above the heading so it adds no layout height, and
 * `sm:`-only — on a phone the heading already sits close to the previous
 * section and there is no clear space above it. Pure flourish, so reduced
 * motion renders nothing at all.
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
