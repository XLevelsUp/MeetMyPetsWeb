"use client";

import { motion, useReducedMotion } from "motion/react";
import { BadgeCheck, CalendarDays, MapPin, PawPrint } from "lucide-react";

import { CountUp } from "@/components/motion/CountUp";
import { MagneticButton } from "@/components/motion/MagneticButton";
import { ParallaxCard } from "@/components/motion/ParallaxCard";
import { SpeciesIcon } from "@/components/ui/species-icon";
import { cta, hero, proofPoints } from "@/config/site";

/** Kinetic reveal: each line rides up from behind an overflow mask. */
function MaskedLine({ text, index, reduced }: { text: string; index: number; reduced: boolean }) {
  if (reduced) return <span className="block">{text}</span>;
  return (
    <span className="block overflow-hidden pb-[0.12em]">
      <motion.span
        className="block"
        initial={{ y: "110%" }}
        animate={{ y: "0%" }}
        transition={{ duration: 0.75, delay: 0.08 * index, ease: [0.22, 1, 0.36, 1] }}
      >
        {text}
      </motion.span>
    </span>
  );
}

export function Hero() {
  const reduced = useReducedMotion();

  return (
    <section id="top" className="relative overflow-hidden pt-28 pb-16 sm:pt-36 sm:pb-24">
      {/* Ambient warmth. Pointer-events off so it never eats a click. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 -z-10"
        style={{
          background:
            "radial-gradient(60rem 32rem at 12% -8%, var(--brand-soft), transparent 60%), radial-gradient(48rem 28rem at 92% 4%, var(--trust-soft), transparent 62%)",
        }}
      />

      <div className="section-shell grid items-center gap-14 lg:grid-cols-[1.05fr_0.95fr] lg:gap-10">
        <div>
          <motion.span
            initial={reduced ? undefined : { opacity: 0, y: 8 }}
            animate={reduced ? undefined : { opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="glass inline-flex items-center gap-2 rounded-full px-3.5 py-1.5 text-xs font-semibold tracking-wide text-brand-ink uppercase"
          >
            <PawPrint className="size-3.5" aria-hidden="true" />
            {hero.badge}
          </motion.span>

          {/* `text-hero` is a fluid clamp (see globals.css @theme). It replaced
              text-[2.6rem]/sm:text-6xl/lg:text-[4.2rem], which pinned every
              width from 640-1023px to the same 60px. */}
          <h1 className="mt-6 text-hero font-semibold">
            {hero.headlineLines.map((line, i) => (
              <MaskedLine key={line} text={line} index={i} reduced={Boolean(reduced)} />
            ))}
          </h1>

          <motion.p
            initial={reduced ? undefined : { opacity: 0, y: 12 }}
            animate={reduced ? undefined : { opacity: 1, y: 0 }}
            transition={{ duration: 0.55, delay: 0.42 }}
            className="mt-6 max-w-xl text-lg leading-relaxed text-ink-soft"
          >
            {hero.subhead}
          </motion.p>

          <motion.div
            initial={reduced ? undefined : { opacity: 0, y: 12 }}
            animate={reduced ? undefined : { opacity: 1, y: 0 }}
            transition={{ duration: 0.55, delay: 0.54 }}
            className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center"
          >
            <MagneticButton href={cta.waitlistHref} className="h-12 px-7 text-base">
              {cta.primary}
            </MagneticButton>
            <MagneticButton href={cta.secondaryHref} variant="outline" className="h-12 px-7 text-base">
              {cta.secondary}
            </MagneticButton>
          </motion.div>

          <dl className="mt-12 grid grid-cols-1 gap-6 border-t border-border pt-8 sm:grid-cols-3">
            {proofPoints.map((point) => (
              <div key={point.label}>
                <dt className="font-heading text-3xl font-semibold text-brand-ink">
                  {"countTo" in point && typeof point.countTo === "number" ? (
                    <CountUp to={point.countTo} />
                  ) : (
                    point.value
                  )}
                </dt>
                <dd className="mt-1 text-sm font-semibold text-ink">{point.label}</dd>
                <dd className="mt-1 text-sm leading-relaxed text-ink-soft">{point.detail}</dd>
              </div>
            ))}
          </dl>
        </div>

        {/* Floating UI mockups — composed from live DOM, not screenshots. No
            image weight, and nothing that misrepresents an unbuilt product. */}
        {/* The cards inside are positioned in percentages, so this wrapper's
            width is the only thing that scales them. Capped at max-w-sm it
            sat as a 384px island in the middle of a 1000px tablet page. */}
        <div
          className="relative mx-auto aspect-[4/5] w-full max-w-sm md:max-w-md lg:max-w-none"
          aria-hidden="true"
        >
          <ParallaxCard
            float
            className="absolute top-[6%] left-[4%] w-[62%] rounded-3xl border border-border bg-card p-4 shadow-float"
          >
            <div className="flex items-start justify-between">
              <div className="size-12 rounded-2xl bg-brand-soft p-3 text-brand-ink">
                <SpeciesIcon species="dog" />
              </div>
              <span className="glass inline-flex items-center gap-1 rounded-full px-2 py-1 text-[11px] font-semibold text-verified">
                <BadgeCheck className="size-3.5" aria-hidden="true" />
                Verified
              </span>
            </div>
            <p className="mt-4 font-heading text-xl font-semibold">Mochi</p>
            <p className="text-sm text-ink-soft">Shiba Inu · 3 yrs</p>
            <div className="mt-3 flex items-center gap-1.5 text-xs text-ink-soft">
              <MapPin className="size-3.5" aria-hidden="true" />
              Within 1.2 km
            </div>
            <div className="mt-4 flex gap-2">
              <span className="rounded-full bg-secondary px-2.5 py-1 text-[11px] font-medium">Playdate</span>
              <span className="rounded-full bg-secondary px-2.5 py-1 text-[11px] font-medium">Friendly</span>
            </div>
          </ParallaxCard>

          <ParallaxCard
            float
            floatDelay={1.4}
            tilt={12}
            className="absolute top-[42%] right-[2%] w-[52%] rounded-2xl border border-border bg-card p-4 shadow-lift"
          >
            <div className="flex items-center gap-2 text-verified">
              <BadgeCheck className="size-5" aria-hidden="true" />
              <p className="text-sm font-semibold">Vaccination verified</p>
            </div>
            <p className="mt-2 text-xs leading-relaxed text-ink-soft">
              Records checked and matched to this pet. Badge lapses on expiry.
            </p>
            <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-secondary">
              <div className="h-full w-full rounded-full bg-verified" />
            </div>
          </ParallaxCard>

          <ParallaxCard
            float
            floatDelay={0.7}
            tilt={12}
            className="absolute bottom-[3%] left-[8%] w-[58%] rounded-2xl border border-border bg-card p-4 shadow-lift"
          >
            <div className="flex items-center gap-2">
              <span className="grid size-9 place-items-center rounded-xl bg-trust-soft text-trust">
                <CalendarDays className="size-4.5" aria-hidden="true" />
              </span>
              <div>
                <p className="text-sm font-semibold">Local meetup</p>
                <p className="text-xs text-ink-soft">Saturday · Within 3 km</p>
              </div>
            </div>
            <p className="mt-3 text-xs leading-relaxed text-ink-soft">
              Small-breed social at the community park. 12 pets going.
            </p>
          </ParallaxCard>
        </div>
      </div>
    </section>
  );
}
