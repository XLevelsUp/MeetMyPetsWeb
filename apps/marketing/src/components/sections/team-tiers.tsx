"use client";

import { Code2, Smile } from "lucide-react";
import { m, useReducedMotion } from "motion/react";
import Image from "next/image";
import { useMemo } from "react";

import { PawScatter } from "@/components/ui/paw-scatter";
import { team } from "@/config/site";

/** Every timing in one place, so the whole page can be tuned from here. */
const ANIM = {
  viewport: { once: true, amount: 0.2 } as const,
  enter: { duration: 0.75, bounce: 0.18 },
  stagger: 0.15,
  /** Max px a card follows the cursor. */
  magnet: 12,
  /** Max degrees of 3D tilt on the grid cards. */
  tilt: 8,
};

/* ── Shared card ─────────────────────────────────────────────────────────── */

/** Fine-line paw, used at small sizes where a filled icon reads as a blob. */
function PawGlyph({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden="true" className={className}>
      <ellipse cx="7.2" cy="8.4" rx="2.05" ry="2.75" strokeWidth="1.4" />
      <ellipse cx="12" cy="6.6" rx="2.05" ry="2.9" strokeWidth="1.4" />
      <ellipse cx="16.8" cy="8.4" rx="2.05" ry="2.75" strokeWidth="1.4" />
      <path
        d="M12 11.4c2.9 0 5.2 2.1 5.2 4.5 0 1.9-1.6 3.1-3.6 3.1-1 0-1.2.4-1.6.4s-.6-.4-1.6-.4c-2 0-3.6-1.2-3.6-3.1 0-2.4 2.3-4.5 5.2-4.5Z"
        strokeWidth="1.4"
      />
    </svg>
  );
}

/** One claymorphic card, used by every tier on the page. */
function ClayCard({
  person,
  index,
  eyebrow,
}: {
  person: {
    name: string;
    role: string;
    bio: string;
    photo: string;
    color: string;
    /** Founders only — the others have no quote, so the line is skipped. */
    quote?: string;
    funFact?: string;
  };
  index: number;
  eyebrow?: string;
}) {
  const reduced = useReducedMotion();

  return (
    <m.li
      initial={reduced ? undefined : { opacity: 0, y: 28 }}
      whileInView={reduced ? undefined : { opacity: 1, y: 0 }}
      viewport={ANIM.viewport}
      transition={{
        type: "spring",
        bounce: 0.22,
        duration: 0.7,
        delay: index * 0.09,
      }}
      className="group h-full list-none"
    >
      <div className="clay-card flex h-full w-full flex-col rounded-[1.75rem] bg-card p-3.5 text-left transition-[transform,box-shadow] duration-300 ease-out hover:-translate-y-1.5 hover:clay-card-hover sm:rounded-[2rem] sm:p-4">
        {/* Badges live on this wrapper, not inside the clipped frame, so the corner radius cannot crop them. */}
        <div className="relative w-full shrink-0">
          <div
            className="relative aspect-[4/5] w-full overflow-hidden rounded-[1.25rem] sm:rounded-[1.5rem]"
            style={{ backgroundColor: person.color }}
          >
            <Image
              src={person.photo}
              alt={person.name}
              fill
              sizes="(min-width: 1024px) 21rem, (min-width: 640px) 45vw, 85vw"
              className="object-cover object-[center_top] transition-transform duration-700 ease-out group-hover:scale-[1.045]"
            />
          </div>

          {eyebrow && (
            <span className="pointer-events-none absolute top-3 left-3 inline-flex items-center gap-1.5 rounded-full bg-card px-2.5 py-1 text-[10px] font-bold tracking-[0.12em] text-ink uppercase shadow-soft">
              <span className="size-1.5 rounded-full bg-brand" aria-hidden="true" />
              {eyebrow}
            </span>
          )}

        </div>

        <div className="flex flex-1 flex-col px-2 pt-5 pb-1.5 sm:px-2.5">
          <h3 className="line-clamp-1 font-heading text-lg leading-tight font-bold tracking-tight text-ink sm:text-xl">
            {person.name}
          </h3>

          {/* Two-line budget: "Associate Software Engineer" wraps where "CTO" does not, which would offset everything below. */}
          <p className="mt-1 min-h-[1.75rem] text-[10px] leading-[1.4] font-bold tracking-[0.16em] text-brand uppercase">
            {person.role}
          </p>

          {/* One treatment for every tier: the founders' quote style, falling back to the bio for everyone else. */}
          <p className="mt-3 line-clamp-4 border-l-2 border-brand/35 pl-3 text-sm leading-snug font-medium text-balance text-ink italic sm:text-base">
            {person.quote ?? person.bio}
          </p>

          {person.funFact && (
            <div className="mt-4 border-t border-border pt-3">
              <p className="flex items-center gap-1.5 text-[9px] font-bold tracking-[0.18em] text-brand uppercase">
                <Smile className="size-3.5" aria-hidden="true" />
                Fun fact
              </p>
              <p className="mt-1.5 text-[0.8125rem] leading-relaxed text-ink-soft sm:text-sm">
                {person.funFact}
              </p>
            </div>
          )}
        </div>
      </div>
    </m.li>
  );
}

/* ── Page ───────────────────────────────────────────────────────────────── */

export function TeamTiers() {
  const reduced = useReducedMotion();

  const engineering = useMemo(
    () => team.people.filter((p) => p.group === "Engineering"),
    [],
  );
  const marketing = useMemo(
    () => team.people.filter((p) => p.group === "Marketing"),
    [],
  );

  return (
    <>
      {/* ── Tier 1: Founders & Directors (Warm Ivory Editorial Magazine Layout) ── */}
      <section className="relative scroll-mt-24 bg-[#FAF8F5] pt-12 pb-10 sm:pt-14 sm:pb-11 lg:pt-16 lg:pb-12">
        <div className="mx-auto w-full max-w-6xl px-5 sm:px-8 md:px-10">
          {/* Two founders, so the row is capped at 2 columns — a 3-col grid would leave a hole. */}
          <ul className="mx-auto grid max-w-3xl grid-cols-1 items-stretch gap-6 sm:grid-cols-2 lg:gap-8">
            {team.leaders.map((person, i) => (
              <ClayCard
                key={person.name}
                person={person}
                index={i}
              />
            ))}
          </ul>
        </div>
      </section>

      {/* ── Tier 2: Executive Leadership (Warm Ivory Editorial Magazine Layout) ── */}
      <section className="relative scroll-mt-24 bg-[#FAF8F5] pt-10 pb-10 sm:pt-11 sm:pb-11 lg:pt-12 lg:pb-12">
        <div className="mx-auto w-full max-w-6xl px-5 sm:px-8 md:px-10">
          {/* Header */}
          <div className="max-w-2xl">
            <m.div
              initial={reduced ? undefined : { opacity: 0, y: 16 }}
              whileInView={reduced ? undefined : { opacity: 1, y: 0 }}
              viewport={ANIM.viewport}
              transition={{ duration: 0.6 }}
              className="flex items-center gap-3"
            >
              <span className="text-[11px] font-bold tracking-[0.25em] text-brand uppercase">
                Executive Leadership
              </span>
              <span className="h-px w-8 bg-brand/40" aria-hidden="true" />
            </m.div>

            <m.h2
              initial={reduced ? undefined : { opacity: 0, y: 14 }}
              whileInView={reduced ? undefined : { opacity: 1, y: 0 }}
              viewport={ANIM.viewport}
              transition={{ duration: 0.6, delay: 0.08 }}
              className="mt-3 font-serif text-3xl font-medium tracking-tight text-ink sm:text-4xl lg:text-5xl"
            >
              The people steering the ship
            </m.h2>

            <m.p
              initial={reduced ? undefined : { opacity: 0, y: 10 }}
              whileInView={reduced ? undefined : { opacity: 1, y: 0 }}
              viewport={ANIM.viewport}
              transition={{ duration: 0.6, delay: 0.12 }}
              className="mt-3 font-sans text-sm leading-relaxed text-ink-soft sm:text-base"
            >
              Decades of combined craft in product, finance, and engineering.
            </m.p>
          </div>

          <ul className="mt-10 grid grid-cols-1 items-stretch gap-6 sm:grid-cols-2 md:grid-cols-3 lg:gap-8">
            {team.leadership.map((person, i) => (
              <ClayCard
                key={person.name}
                person={person}
                index={i}
              />
            ))}
          </ul>
        </div>
      </section>

      {/* ── Tier 3: Engineering ── */}
      <section className="relative scroll-mt-24 overflow-hidden py-10 sm:py-11 lg:py-12">
        <PawScatter
          paws={[
            { className: "top-[8%] left-[5%] rotate-[12deg]", size: 46 },
            { className: "bottom-[15%] right-[4%] -rotate-[16deg]", size: 50 },
          ]}
          opacity={0.06}
        />
        <div className="section-shell relative">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <m.p
                initial={reduced ? undefined : { opacity: 0, y: 16 }}
                whileInView={reduced ? undefined : { opacity: 1, y: 0 }}
                viewport={ANIM.viewport}
                transition={{ duration: 0.6 }}
                className="inline-flex items-center gap-1.5 font-heading text-xs font-bold tracking-[0.2em] text-brand-ink uppercase"
              >
                <Code2 className="size-4 text-brand" aria-hidden="true" />
                Engineering & Intelligence
              </m.p>
              <m.h2
                initial={reduced ? undefined : { opacity: 0, y: 14 }}
                whileInView={reduced ? undefined : { opacity: 1, y: 0 }}
                viewport={ANIM.viewport}
                transition={{ duration: 0.6, delay: 0.08 }}
                className="mt-2 font-heading text-2xl font-bold tracking-tight text-ink sm:text-4xl"
              >
                Architects of the experience
              </m.h2>
              <m.p
                initial={reduced ? undefined : { opacity: 0, y: 10 }}
                whileInView={reduced ? undefined : { opacity: 1, y: 0 }}
                viewport={ANIM.viewport}
                transition={{ duration: 0.6, delay: 0.12 }}
                className="mt-1 text-sm text-ink-soft"
              >
                Building the matching algorithm, real-time social feeds, and safety engines.
              </m.p>
            </div>
            <m.span
              initial={reduced ? undefined : { opacity: 0, scale: 0.9 }}
              whileInView={reduced ? undefined : { opacity: 1, scale: 1 }}
              viewport={ANIM.viewport}
              transition={{ duration: 0.5, delay: 0.15 }}
              className="inline-flex items-center gap-2 rounded-full border border-brand/20 bg-brand-soft px-4 py-2 text-sm font-semibold text-brand-ink shadow-sm"
            >
              <span className="size-2 rounded-full bg-brand" aria-hidden="true" />
              {engineering.length} engineers
            </m.span>
          </div>

          <ul className="mt-10 grid grid-cols-1 items-stretch gap-6 sm:grid-cols-2 md:grid-cols-3 lg:gap-8">
            {engineering.map((person, i) => (
              <ClayCard
                key={person.name}
                person={person}
                index={i}
                eyebrow={person.group}
              />
            ))}
          </ul>
        </div>
      </section>

      {/* ── Tier 4: Marketing — pet atelier ── */}
      <section className="relative scroll-mt-24 overflow-hidden py-10 sm:py-11 lg:py-12">
        <PawScatter
          paws={[
            { className: "top-[12%] right-[5%] -rotate-[18deg]", size: 54 },
            { className: "bottom-[8%] left-[6%] rotate-[14deg]", size: 48 },
          ]}
          opacity={0.06}
        />
        <div className="section-shell relative">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <m.p
                initial={reduced ? undefined : { opacity: 0, y: 16 }}
                whileInView={reduced ? undefined : { opacity: 1, y: 0 }}
                viewport={ANIM.viewport}
                transition={{ duration: 0.6 }}
                className="inline-flex items-center gap-1.5 font-heading text-xs font-bold tracking-[0.2em] text-brand-ink uppercase"
              >
                <PawGlyph className="size-4 text-brand" />
                Marketing &amp; Community
              </m.p>
              <m.h2
                initial={reduced ? undefined : { opacity: 0, y: 14 }}
                whileInView={reduced ? undefined : { opacity: 1, y: 0 }}
                viewport={ANIM.viewport}
                transition={{ duration: 0.6, delay: 0.08 }}
                className="mt-2 font-heading text-2xl font-bold tracking-tight text-ink sm:text-4xl"
              >
                Voices of the pack
              </m.h2>
              <m.p
                initial={reduced ? undefined : { opacity: 0, y: 10 }}
                whileInView={reduced ? undefined : { opacity: 1, y: 0 }}
                viewport={ANIM.viewport}
                transition={{ duration: 0.6, delay: 0.12 }}
                className="mt-1 text-sm text-ink-soft"
              >
                Connecting pet parents through authentic stories, creative campaigns, and events.
              </m.p>
            </div>
            <m.span
              initial={reduced ? undefined : { opacity: 0, scale: 0.9 }}
              whileInView={reduced ? undefined : { opacity: 1, scale: 1 }}
              viewport={ANIM.viewport}
              transition={{ duration: 0.5, delay: 0.15 }}
              className="inline-flex items-center gap-2 rounded-full border border-brand/20 bg-brand-soft px-4 py-2 text-sm font-semibold text-brand-ink shadow-sm"
            >
              <span className="size-2 rounded-full bg-brand" aria-hidden="true" />
              {marketing.length} storytellers
            </m.span>
          </div>

          <ul className="mt-10 grid grid-cols-1 items-stretch gap-6 sm:grid-cols-2 md:grid-cols-3 lg:gap-8">
            {marketing.map((person, i) => (
              <ClayCard
                key={person.name}
                person={person}
                index={i}
                eyebrow={person.group}
              />
            ))}
          </ul>
        </div>
      </section>

    </>
  );
}
