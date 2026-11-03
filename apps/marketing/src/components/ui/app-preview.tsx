"use client";

import { Check, Heart, X } from "lucide-react";
import { m, useReducedMotion } from "motion/react";

import { SpeciesIcon } from "@/components/ui/species-icon";

/**
 * Phone mockup for the /app-for-pets hero — a pet profile with a verified
 * badge and two chat bubbles planning a playdate.
 *
 * Drawn in markup rather than shipped as an image so it stays sharp at any
 * size, inherits the brand tokens, and costs no download. It is decorative:
 * the surrounding copy states everything shown here.
 */
export function AppPreview() {
  const reduced = useReducedMotion();
  const float = (delay: number) =>
    reduced
      ? undefined
      : {
          y: [0, -6, 0],
          transition: { duration: 4.5, repeat: Infinity, ease: "easeInOut" as const, delay },
        };

  return (
    <div aria-hidden="true" className="relative mx-auto w-full max-w-[19rem]">
      {/* Phone body */}
      <m.div
        initial={reduced ? undefined : { opacity: 0, y: 24, scale: 0.96 }}
        whileInView={reduced ? undefined : { opacity: 1, y: 0, scale: 1 }}
        viewport={{ once: true, amount: 0.3 }}
        transition={{ type: "spring", bounce: 0.2, duration: 0.7 }}
        className="relative rounded-[2.25rem] bg-ink p-2.5 shadow-float"
      >
        <div className="relative overflow-hidden rounded-[1.75rem] bg-card px-4 pt-5 pb-4">
          <p className="text-center font-heading text-sm font-black text-ink">
            MeetMy<span className="text-brand">Pets</span>
          </p>

          {/* Pet card */}
          <div className="relative mt-4 overflow-hidden rounded-2xl bg-brand-soft/70 pt-7 pb-4">
            <span className="mx-auto grid size-24 place-items-center rounded-full bg-card text-brand-ink shadow-soft">
              <SpeciesIcon species="dog" className="size-14" />
            </span>
            <div className="mt-5 flex items-center justify-between px-4">
              <div>
                <p className="font-heading text-sm font-bold text-ink">Mochi</p>
                <p className="text-[11px] text-ink-soft">within 1 km</p>
              </div>
              <span className="grid size-6 place-items-center rounded-full bg-brand text-white">
                <Check className="size-3.5" strokeWidth={3} />
              </span>
            </div>
          </div>

          {/* Swipe actions */}
          <div className="mt-4 flex items-center justify-center gap-5">
            <span className="grid size-11 place-items-center rounded-full border border-border bg-card text-ink-soft">
              <X className="size-5" strokeWidth={2.5} />
            </span>
            <span className="grid size-12 place-items-center rounded-full bg-brand text-white shadow-lift">
              <Heart className="size-5 fill-current" />
            </span>
          </div>
        </div>
      </m.div>

      {/* Chat bubbles, straddling the phone edges. Hidden below sm, where the
          phone is narrow enough that they would overlap the screen. */}
      <m.span
        animate={float(0)}
        className="absolute -left-6 top-[22%] hidden rounded-full bg-[#ffc400] px-3.5 py-2 text-[11px] font-bold text-ink shadow-lift sm:block"
      >
        Playdate at the park?
      </m.span>
      {/* Sits below the phone, not beside it: at -bottom-[12%] it covered the
          swipe buttons on the screen behind. */}
      <m.span
        animate={float(1.4)}
        className="absolute -right-4 -bottom-4 hidden rounded-full border border-border bg-card px-3.5 py-2 text-[11px] font-bold text-ink shadow-lift sm:block"
      >
        Yes! See you at 5
      </m.span>
    </div>
  );
}
