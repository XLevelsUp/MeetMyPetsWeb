"use client";

import { m, useReducedMotion } from "motion/react";
import { PawPrint } from "lucide-react";

import { cn } from "@/lib/utils";

type Paw = {
  className: string;
  size?: number;
};

/** Low-opacity paw prints that fade in as their section enters view. */
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
        // Tailwind's leading "-" negates the whole utility, so capture both signs.
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
