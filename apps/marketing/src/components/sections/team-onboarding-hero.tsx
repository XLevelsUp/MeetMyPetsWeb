"use client";

import { m, useReducedMotion, useScroll, useTransform } from "motion/react";
import Image from "next/image";
import { useRef } from "react";

import { teamOnboarding } from "@/config/site";

/**
 * Full-viewport hero for /team-onboarding: one group photo edge to edge, headline over it.
 *
 * The brief asked for a cut-out PNG of the team layered ABOVE the headline so
 * heads overlap the letters. That needs a transparent-background cut-out, and
 * the photo we have is a flat JPEG on a studio wall — so this is the brief's
 * own stated fallback: text on top of the image. To upgrade later, drop a
 * transparent PNG at /team/team-cutout.png and render it in a layer above
 * `headline` with the same object-position.
 *
 * Legibility is not left to chance: the photo carries a gradient scrim, so
 * white type holds up even where the wall behind it is pale.
 */
export function TeamOnboardingHero() {
  const reduced = useReducedMotion();
  const ref = useRef<HTMLElement>(null);

  // Photo drifts slower than the page, headline slightly faster — the depth
  // cue the brief asks for, done with transforms only.
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end start"] });
  const photoY = useTransform(scrollYProgress, [0, 1], ["0%", "14%"]);
  const textY = useTransform(scrollYProgress, [0, 1], ["0%", "-22%"]);
  const textFade = useTransform(scrollYProgress, [0, 0.75], [1, 0]);

  // Split for the staggered rise. Two lines on desktop; each wraps on its own
  // below sm, which is what gives the 3–4 line mobile stack.
  const lines = [teamOnboarding.heroLine1, teamOnboarding.heroLine2];

  return (
    <section
      ref={ref}
      // svh, not vh: on mobile the browser chrome makes 100vh overflow.
      className="relative flex h-svh min-h-[34rem] w-full items-center overflow-hidden bg-[#8c6f55]"
    >
      {/* z-0, not a negative layer: a negative z-index puts this BEHIND the
          section's own background, which then paints over the photo entirely. */}
      <m.div
        style={reduced ? undefined : { y: photoY }}
        initial={reduced ? undefined : { scale: 1.08 }}
        animate={reduced ? undefined : { scale: 1 }}
        transition={{ duration: 1.6, ease: [0.22, 1, 0.36, 1] }}
        className="absolute inset-0 z-0"
      >
        <Image
          src="/team/team-group.webp"
          alt={teamOnboarding.photoAlt}
          fill
          priority
          sizes="100vw"
          // center bottom: the photo is 3:2 inside a much wider box on desktop
          // and a much taller one on mobile. Anchoring low keeps faces in frame
          // in both, since the empty wall is above the heads.
          className="object-cover object-[center_bottom]"
        />
      </m.div>

      {/* Scrim. Heavier at the top where the headline sits, so white type keeps
          its contrast against the pale wall behind it. */}
      <span
        aria-hidden="true"
        className="absolute inset-0 z-10 bg-gradient-to-b from-ink/75 via-ink/30 to-transparent"
      />

      <m.div
        style={reduced ? undefined : { y: textY, opacity: textFade }}
        className="section-shell relative z-20 w-full self-start pt-28 sm:pt-32 lg:pt-36"
      >
        <m.p
          initial={reduced ? undefined : { opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="text-xs font-semibold tracking-[0.18em] text-white/70 uppercase"
        >
          {teamOnboarding.eyebrow}
        </m.p>

        <h1 className="mt-4 font-heading text-[clamp(2.75rem,11vw,9rem)] leading-[0.92] font-bold tracking-[-0.035em] text-white">
          {lines.map((line, i) => (
            // Each line rises behind its own clipping mask, so the words appear
            // to slide up from under the one above.
            <span key={line} className="block overflow-hidden pb-[0.06em]">
              <m.span
                initial={reduced ? undefined : { y: "100%" }}
                animate={{ y: 0 }}
                transition={{
                  duration: 0.9,
                  delay: 0.15 + i * 0.12,
                  ease: [0.22, 1, 0.36, 1],
                }}
                className="block"
              >
                {line}
              </m.span>
            </span>
          ))}
        </h1>

        <m.p
          initial={reduced ? undefined : { opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.5 }}
          className="mt-7 max-w-xl text-base leading-relaxed text-white/85 sm:text-lg"
        >
          {teamOnboarding.intro}
        </m.p>
      </m.div>

      {/* Scroll cue, bottom centre. */}
      <m.span
        aria-hidden="true"
        initial={reduced ? undefined : { opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.1, duration: 0.6 }}
        className="absolute bottom-7 left-1/2 z-20 -translate-x-1/2"
      >
        <m.span
          animate={reduced ? undefined : { y: [0, 7, 0] }}
          transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut" }}
          className="block h-10 w-6 rounded-full border-2 border-white/50"
        >
          <span className="mx-auto mt-2 block h-2 w-1 rounded-full bg-white/70" />
        </m.span>
      </m.span>
    </section>
  );
}
