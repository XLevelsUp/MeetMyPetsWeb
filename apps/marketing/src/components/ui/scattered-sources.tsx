"use client";

import { m, useReducedMotion } from "motion/react";
import { MessageCircle, Search, Share2, Users } from "lucide-react";

// The places pet parents look today — the fragmentation card 02 describes.
const SOURCES = [
  { label: "WhatsApp groups", Icon: MessageCircle, className: "left-0 top-2 -rotate-6" },
  { label: "Social media", Icon: Share2, className: "right-0 top-16 rotate-6" },
  { label: "Word of mouth", Icon: Users, className: "left-4 top-32 rotate-3" },
  { label: "Endless scrolling", Icon: Search, className: "right-3 top-48 -rotate-3" },
];

/** Decorative: scattered chips restating "too many places to search". */
export function ScatteredSources() {
  const reduced = useReducedMotion();

  return (
    <div aria-hidden="true" className="relative mx-auto h-72 w-full max-w-[260px]">
      {SOURCES.map(({ label, Icon, className }, i) => {
        const chip = (
          <span className="inline-flex items-center gap-2 rounded-full border border-border/70 bg-card px-3.5 py-2 text-xs font-medium whitespace-nowrap text-ink-soft shadow-soft">
            <Icon className="size-3.5 shrink-0 text-brand-ink/70" />
            {label}
          </span>
        );

        if (reduced) {
          return (
            <div key={label} className={`absolute ${className}`}>
              {chip}
            </div>
          );
        }

        return (
          <m.div
            key={label}
            className={`absolute ${className}`}
            initial={{ opacity: 0, y: 14, scale: 0.9 }}
            whileInView={{ opacity: 1, y: 0, scale: 1 }}
            viewport={{ once: true, amount: 0 }}
            transition={{ type: "spring", stiffness: 180, damping: 18, delay: i * 0.1 }}
          >
            <m.div
              animate={{ y: [0, -6, 0] }}
              transition={{ duration: 4 + i * 0.5, repeat: Infinity, ease: "easeInOut" }}
            >
              {chip}
            </m.div>
          </m.div>
        );
      })}
    </div>
  );
}
