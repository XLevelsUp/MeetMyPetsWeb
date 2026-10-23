"use client";

import Image from "next/image";

import { Reveal } from "@/components/motion/Reveal";
import { about } from "@/config/site";
import { cn } from "@/lib/utils";

const ITEMS = about.values.items;

/**
 * Values displayed in an alternating zigzag layout:
 * odd rows → image left / text right, even rows → text left / image right.
 *
 * Each value gets its own full-width row with the pet cutout on one side
 * and the title + body on the other, creating a premium editorial feel.
 */
export function ValuesZigzag() {
  return (
    <div className="flex flex-col gap-10 md:gap-14">
      {ITEMS.map((item, i) => {
        const isReversed = i % 2 !== 0;
        return (
          <Reveal key={item.id} variant="springy" delay={0.06 * i}>
            <div
              className={cn(
                "group relative grid grid-cols-1 items-center gap-6 overflow-hidden border border-border/70 bg-card shadow-soft transition-[transform] duration-300 md:grid-cols-2 md:gap-0",
                isReversed ? "card-paw-alt" : "card-paw",
              )}
            >
              {/* ── Pet image ── */}
              <div
                className={cn(
                  "relative flex items-center justify-center bg-gradient-to-br from-brand-soft/50 via-transparent to-trust-soft/30 px-6 py-10 sm:px-10 md:py-14",
                  isReversed && "md:order-2",
                )}
              >
                <Image
                  src={item.pet.src}
                  alt={item.pet.alt}
                  width={280}
                  height={280}
                  className="pointer-events-none h-40 w-auto select-none drop-shadow-lg transition-transform duration-500 group-hover:scale-105 sm:h-48 md:h-56"
                />
              </div>

              {/* ── Text content ── */}
              <div
                className={cn(
                  "flex flex-col justify-center px-6 pb-8 sm:px-10 md:py-12 md:pb-12",
                  isReversed && "md:order-1",
                )}
              >
                {/* Step number badge */}
                <span className="mb-3 inline-flex size-9 items-center justify-center rounded-full bg-brand/10 text-sm font-bold text-brand ring-1 ring-brand/20">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <h3 className="text-2xl font-semibold tracking-wide text-ink sm:text-3xl">
                  {item.title}
                </h3>
                <p className="mt-3 max-w-md leading-relaxed text-ink-soft">
                  {item.body}
                </p>

                {/* Brand accent bar */}
                <span
                  aria-hidden="true"
                  className="mt-6 h-1 w-16 rounded-full bg-gradient-to-r from-brand to-brand-ink"
                />
              </div>
            </div>
          </Reveal>
        );
      })}
    </div>
  );
}
