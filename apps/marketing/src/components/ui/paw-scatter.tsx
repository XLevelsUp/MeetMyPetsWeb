"use client";

import { m, useReducedMotion } from "motion/react";
import { PawPrint } from "lucide-react";

import { cn } from "@/lib/utils";

type Paw = {
  className: string;
  size?: number;
};

/**
 * Low-opacity paw prints scattered behind a section's content. Each fades and
 * rotates into place as its own section enters the viewport, staggered so they
 * land one after another.
 *
 * Purely atmospheric: aria-hidden, pointer-events-none, always behind content.
 */
export function PawScatter({
  paws,
  opacity = 0.14,
  className,
}: {
  paws: Paw[];
  /** Shared opacity for the whole scatter once landed — keep it low, this is texture, not content. */
  opacity?: number;
  className?: string;
}) {
  const reduced = useReducedMotion();

  return (
    <div
      aria-hidden="true"
      className={cn("pointer-events-none absolute inset-0 -z-10 overflow-hidden", className)}
    >
      {paws.map((paw, i) => {
        // Tailwind's leading "-" on `-rotate-[16deg]` negates the whole
        // utility (rotate by -16deg) — it sits before "rotate", not inside
        // the brackets, so both signs have to be captured to get the true
        // landed angle instead of always reading a positive degree value.
        const fromRotation = paw.className.match(/(-?)rotate-\[(\d+)deg\]/);
        const landedRotate = fromRotation
          ? Number(`${fromRotation[1]}${fromRotation[2]}`)
          : 0;

        if (reduced) {
          return (
            <PawPrint
              key={i}
              className={cn("absolute text-brand-ink", paw.className)}
              style={{ opacity, ...(paw.size ? { width: paw.size, height: paw.size } : {}) }}
            />
          );
        }

        return (
          <m.div
            key={i}
            className={cn("absolute", paw.className.replace(/-?rotate-\[\d+deg\]/, "").trim())}
            initial={{ opacity: 0, scale: 0.4, rotate: landedRotate - 40 }}
            whileInView={{ opacity, scale: 1, rotate: landedRotate }}
            viewport={{ once: true, amount: 0 }}
            transition={{
              type: "spring",
              stiffness: 140,
              damping: 14,
              delay: i * 0.12,
            }}
          >
            <PawPrint
              className="text-brand-ink"
              style={paw.size ? { width: paw.size, height: paw.size } : undefined}
            />
          </m.div>
        );
      })}
    </div>
  );
}
