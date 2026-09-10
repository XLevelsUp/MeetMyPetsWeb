"use client";

import { AnimatePresence, m, useReducedMotion } from "motion/react";
import { BadgeCheck, CalendarDays, MapPin, PawPrint } from "lucide-react";
import Image from "next/image";
import { useState } from "react";

import { MagneticButton } from "@/components/motion/MagneticButton";
import { ParallaxCard } from "@/components/motion/ParallaxCard";
import { HERO_BLOB_PATH } from "@/components/ui/blob-clip";
import { HeroCompanions } from "@/components/ui/hero-companions";
import { HeroMascot } from "@/components/ui/hero-mascot";
import { SpeciesIcon } from "@/components/ui/species-icon";
import { VipBadge } from "@/components/ui/vip-badge";
import { cta, hero, heroPersona } from "@/config/site";
import { WaveDivider } from "@/components/ui/wave-divider";

const HERO_BLOB_CLIP = "url(#hero-blob)";

/** Kinetic reveal: each line rides up from behind an overflow mask. */
function MaskedLine({ text, index, reduced }: { text: string; index: number; reduced: boolean }) {
  if (reduced) return <span className="block">{text}</span>;
  return (
    <span className="block overflow-hidden pb-[0.12em]">
      <m.span
        className="block"
        initial={{ y: "110%" }}
        animate={{ y: "0%" }}
        transition={{ duration: 0.75, delay: 0.08 * index, ease: [0.22, 1, 0.36, 1] }}
      >
        {text}
      </m.span>
    </span>
  );
}

/**
 * A single paw print that fades, scales up and drifts away — spawned once
 * per click on a hero mockup card, then removed from state on animation end.
 * Purely decorative (the cards themselves stay aria-hidden), so this never
 * renders when reduced motion is on: there is nothing to skip to.
 */
function PawBurst({ id, x, onDone }: { id: number; x: number; onDone: (id: number) => void }) {
  return (
    <m.span
      aria-hidden="true"
      className="pointer-events-none absolute top-1/2 left-1/2 text-brand-ink"
      style={{ x, y: "-50%" }}
      initial={{ opacity: 0.9, scale: 0.4, y: "-50%" }}
      animate={{ opacity: 0, scale: 1.1, y: "-140%" }}
      transition={{ duration: 0.6, ease: "easeOut" }}
      onAnimationComplete={() => onDone(id)}
    >
      <PawPrint className="size-4" />
    </m.span>
  );
}

/** Click-burst state + handler, shared by every hero mockup card. */
function usePawBursts(reduced: boolean) {
  const [bursts, setBursts] = useState<{ id: number; x: number }[]>([]);

  function spawn() {
    if (reduced) return;
    const id = Date.now() + Math.random();
    setBursts((prev) => [...prev, { id, x: Math.random() * 24 - 12 }]);
  }

  function remove(id: number) {
    setBursts((prev) => prev.filter((burst) => burst.id !== id));
  }

  return { bursts, spawn, remove };
}

/**
 * The hero's centre card: photo on the front, Mochi's profile on the back.
 * Hover flips it on desktop; tap toggles it on touch/keyboard, since there
 * is no hover state to rely on there. Takes the same position/size in the
 * composition that the plain photo card used to occupy — the verification
 * and meetup cards around it are unaffected and never flip.
 */
function PhotoProfileFlipCard({
  onBurst,
  bursts,
  onBurstDone,
}: {
  onBurst: () => void;
  bursts: { id: number; x: number }[];
  onBurstDone: (id: number) => void;
}) {
  const reduced = useReducedMotion();
  const [flipped, setFlipped] = useState(false);

  /**
   * `onMouseEnter`/`onMouseLeave` fire on touch devices too (a tap on
   * Chromium synthesises several `mouseenter` events before its `click`) —
   * without this guard they forced `flipped(true)` on every tap regardless
   * of `handleActivate`'s own toggle, so a touch tap looked like a no-op
   * (mouseenter set it true, then the click toggled it straight back to
   * false). Checked live, not cached: a hybrid laptop can switch pointer
   * types mid-session.
   */
  function hoverCapable(): boolean {
    return typeof window !== "undefined" && Boolean(window.matchMedia?.("(hover: hover)").matches);
  }

  /**
   * A real mouse click on this card fires `mouseenter` (which — on a
   * hover-capable device — already sets `flipped(true)` above) BEFORE
   * `click`, so a naive toggle here immediately flipped it straight back to
   * `false` and a desktop click did nothing. Only touch/keyboard activation
   * toggles; on a hover-capable pointer, hover is already driving the flip
   * and a click is redundant (the front face's "Tap to flip" caption is
   * aimed at touch anyway). Keyboard (Enter/Space) always toggles: a
   * hover-capable user tabbing to the card has no hover state to rely on.
   */
  function handleActivate() {
    if (hoverCapable()) {
      onBurst();
      return;
    }
    setFlipped((f) => !f);
    onBurst();
  }

  return (
    <div
      role="button"
      tabIndex={0}
      aria-pressed={flipped}
      aria-label="Flip to see Mochi's profile"
      onClick={handleActivate}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          setFlipped((f) => !f);
          onBurst();
        }
      }}
      onMouseEnter={() => !reduced && hoverCapable() && setFlipped(true)}
      onMouseLeave={() => !reduced && hoverCapable() && setFlipped(false)}
      className="group relative aspect-[4/5] w-full cursor-pointer select-none [perspective:1200px] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-brand"
    >
      {/* Offset flat-colour shape behind the card — the layered, hand-cut
          collage look: a second shape peeking out from behind the photo
          rather than a plain card floating on the background. Counter-
          rotates further on hover so the two layers visibly separate,
          the same technique reels.tsx uses for its own blob cards. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -inset-4 -z-10 rotate-6 bg-brand/15 transition-transform duration-700 ease-out group-hover:rotate-[13deg]"
        style={{ clipPath: HERO_BLOB_CLIP }}
      />

      <m.div
        className="relative size-full [transform-style:preserve-3d]"
        animate={reduced ? undefined : { rotateY: flipped ? 180 : 0 }}
        transition={{ type: "spring", stiffness: 180, damping: 20 }}
      >
        {/* FRONT — Mochi's stand-in photo. fill + sizes because this box's
            pixel size varies by breakpoint (aspect-[4/5] w-full inside a
            max-w-sm/md:max-w-md wrapper), not fixed — the correct next/image
            pattern for a responsively-sized container. priority: the
            largest above-the-fold image on the page. Clipped to the same
            hand-cut outline as the offset shape behind it, not a plain
            rounded rectangle — the organic-collage direction for the hero
            redesign. */}
        <div
          className="absolute inset-0 overflow-hidden border border-border bg-card shadow-float [backface-visibility:hidden]"
          style={{
            clipPath: HERO_BLOB_CLIP,
            ...(reduced && flipped ? { display: "none" } : undefined),
          }}
        >
          <Image
            src={heroPersona.photo.src}
            alt={heroPersona.photo.alt}
            fill
            sizes="(min-width: 1024px) 400px, (min-width: 640px) 60vw, 90vw"
            className="object-cover"
            priority
          />
          {/* Scrim behind the caption — a real photo needs contrast help the
              old flat gradient placeholder didn't. */}
          <div
            aria-hidden="true"
            className="absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-black/50 to-transparent"
          />
          <p className="absolute bottom-5 left-1/2 -translate-x-1/2 text-xs font-medium text-white">
            Tap to flip
          </p>
        </div>

        {/* BACK — Mochi's profile, mirrored so it reads correctly once the
            card has rotated 180°. Same content the old separate profile
            card showed, now living on the flip side of the photo instead
            of its own overlapping card. Same blob outline as the front.

            The blob path pinches in hard near the very top and bottom (at
            y=0 it only spans ~x=0.22-0.78, a bit over half the card's
            width) — real UI content needs extra top/side clearance there
            that a plain photo (filling the shape via object-cover) never
            needed. Content sits in its own inset wrapper well clear of
            those pinched edges, rather than the outer p-5 the front face
            uses, which put the species icon and Verified badge right where
            the outline curves inward and clipped them. */}
        <div
          className="absolute inset-0 overflow-hidden border border-border bg-card shadow-float [backface-visibility:hidden] [transform:rotateY(180deg)]"
          style={{
            clipPath: HERO_BLOB_CLIP,
            ...(reduced && !flipped ? { display: "none" } : undefined),
          }}
        >
          <div className="flex size-full flex-col px-8 pt-12 pb-6 sm:px-9">
            {/* Both ends of this row need real clearance from the outline,
                not just the container's own padding — the curve pinches in
                fastest right where a plain flex row would want to sit
                (near y=0). Stacked on very narrow cards (rare — this is the
                lg-anchored hero card) rather than risk the badge clipping
                again if the icon's label ever grows. */}
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div className="size-11 shrink-0 rounded-2xl bg-brand-soft p-2.5 text-brand-ink">
                <SpeciesIcon species="dog" />
              </div>
              <span className="glass inline-flex shrink-0 items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold text-verified">
                <BadgeCheck className="size-3.5" aria-hidden="true" />
                Verified
              </span>
            </div>
            <p className="mt-4 font-heading text-xl font-semibold">{heroPersona.name}</p>
            <p className="text-sm text-ink-soft">
              {heroPersona.species} · {heroPersona.age}
            </p>
            <div className="mt-2 flex items-center gap-1.5 text-xs text-ink-soft">
              <MapPin className="size-3.5" aria-hidden="true" />
              {heroPersona.distance}
            </div>
            <p className="mt-3 text-sm leading-relaxed text-ink-soft italic">{heroPersona.bio}</p>
            {/* Tags sit right after the bio (mt-6, not mt-auto pinned to the
                card's bottom edge) — the meetup card overlaps this card's
                lower portion, and mt-auto was pushing the tags directly
                behind it, hiding them entirely. */}
            <div className="mt-6 flex flex-wrap gap-1.5">
              {heroPersona.tags.map((tag) => (
                <span key={tag} className="rounded-full bg-secondary px-2.5 py-1 text-xs font-medium">
                  {tag}
                </span>
              ))}
            </div>
          </div>
        </div>
      </m.div>

      <AnimatePresence>
        {bursts.map((burst) => (
          <PawBurst key={burst.id} id={burst.id} x={burst.x} onDone={onBurstDone} />
        ))}
      </AnimatePresence>
    </div>
  );
}

export function Hero() {
  const reduced = useReducedMotion();
  const profileBurst = usePawBursts(Boolean(reduced));
  const verificationBurst = usePawBursts(Boolean(reduced));
  const meetupBurst = usePawBursts(Boolean(reduced));

  return (
    <section id="top" className="relative overflow-hidden pt-24 pb-12 sm:pt-28 sm:pb-16">
      {/* Hand-cut outline for the flip card and its offset backing shape —
          one definition, referenced by url(#hero-blob) from both. Same
          clip-path-via-SVG technique reels.tsx uses for its card grid. */}
      <svg aria-hidden="true" className="pointer-events-none absolute size-0">
        <defs>
          <clipPath id="hero-blob" clipPathUnits="objectBoundingBox">
            <path d={HERO_BLOB_PATH} />
          </clipPath>
        </defs>
      </svg>

      {/* Ambient warmth. Pointer-events off so it never eats a click. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 -z-10"
        style={{
          background:
            "radial-gradient(60rem 32rem at 12% -8%, var(--brand-soft), transparent 60%), radial-gradient(48rem 28rem at 92% 4%, var(--trust-soft), transparent 62%)",
        }}
      />

      {/* Zero-gravity companions (ball, feather, bone, fish, yarn) drifting
          around the content with pointer parallax — replaced three static
          paw prints. Desktop only; the page-level paw tile carries the
          texture below lg. */}
      <HeroCompanions />

      <div className="section-shell grid items-center gap-14 lg:grid-cols-[1.05fr_0.95fr] lg:gap-10">
        <div>
          <m.div
            initial={reduced ? undefined : { opacity: 0, y: 8 }}
            animate={reduced ? undefined : { opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="flex items-center gap-3"
          >
            <HeroMascot width={64} reactive={!reduced} />
            <m.span
              whileHover={
                reduced
                  ? undefined
                  : { scale: 1.04, transition: { type: "spring", stiffness: 300, damping: 20 } }
              }
              className="glass inline-flex items-center gap-2 rounded-full px-3.5 py-1.5 text-xs font-semibold tracking-wide text-brand-ink uppercase"
            >
              <PawPrint className="size-3.5" aria-hidden="true" />
              {hero.badge}
            </m.span>
          </m.div>

          {/* `text-hero` is a fluid clamp (see globals.css @theme). It replaced
              text-[2.6rem]/sm:text-6xl/lg:text-[4.2rem], which pinned every
              width from 640-1023px to the same 60px. */}
          <h1 className="mt-6 text-hero font-semibold">
            {hero.headlineLines.map((line, i) => (
              <MaskedLine key={line} text={line} index={i} reduced={Boolean(reduced)} />
            ))}
          </h1>

          <m.p
            initial={reduced ? undefined : { opacity: 0, y: 12 }}
            animate={reduced ? undefined : { opacity: 1, y: 0 }}
            transition={{ duration: 0.55, delay: 0.42 }}
            className="mt-6 max-w-xl text-lg leading-relaxed text-ink-soft"
          >
            {hero.subhead}
          </m.p>

          <m.div
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
          </m.div>

          {/* VIP spotlight — the offer deserves its own real estate below the
              CTA buttons, not an inline pill competing with the hero badge for
              the same line of space. Wraps to the full column width so the
              gradient card is clearly legible and the shimmer animation fires
              across a meaningful surface area. */}
          <VipBadge variant="spotlight" className="mt-6 max-w-sm" />
        </div>

        {/* Photo-led composition: the centre element is now a flip card
            (photo on the front, Mochi's profile on the back) rather than
            two separate overlapping cards — flip it to see both. The
            verification and meetup cards around it are unchanged and never
            flip. The centre card is real interactive UI (keyboard-operable),
            so it — and only it — sits outside the aria-hidden wrapper that
            covers the rest of this decorative composition. */}
        <div className="relative mx-auto w-full max-w-sm md:max-w-md lg:mr-0 lg:ml-auto lg:max-w-md">
          <PhotoProfileFlipCard
            onBurst={profileBurst.spawn}
            bursts={profileBurst.bursts}
            onBurstDone={profileBurst.remove}
          />

          <div aria-hidden="true">
            <ParallaxCard
              float
              floatDelay={1.4}
              tilt={12}
              hoverLift
              onClick={verificationBurst.spawn}
              className="absolute top-[62%] -right-4 w-[52%] max-w-[210px] cursor-pointer rounded-2xl border border-border bg-card p-3 shadow-lift sm:-right-8"
            >
              <div className="flex items-center gap-1.5 text-verified">
                <BadgeCheck className="size-4" aria-hidden="true" />
                <p className="text-xs font-semibold">Shots up to date</p>
              </div>
              <p className="mt-1.5 text-[11px] leading-snug text-ink-soft">
                Vet records on file, so every playdate starts safe.
              </p>
              <div className="mt-2 h-1 overflow-hidden rounded-full bg-secondary">
                <div className="h-full w-full rounded-full bg-verified" />
              </div>
              <AnimatePresence>
                {verificationBurst.bursts.map((burst) => (
                  <PawBurst key={burst.id} id={burst.id} x={burst.x} onDone={verificationBurst.remove} />
                ))}
              </AnimatePresence>
            </ParallaxCard>

            <ParallaxCard
              float
              floatDelay={0.6}
              tilt={12}
              hoverLift
              onClick={meetupBurst.spawn}
              className="absolute -bottom-6 left-1/2 w-[68%] max-w-[260px] -translate-x-1/2 cursor-pointer rounded-2xl border border-border bg-card p-3 shadow-lift"
            >
              <div className="flex items-center gap-2">
                <span className="grid size-8 place-items-center rounded-xl bg-trust-soft text-trust">
                  <CalendarDays className="size-4" aria-hidden="true" />
                </span>
                <div>
                  <p className="text-xs font-semibold">Local meetup</p>
                  <p className="text-[11px] text-ink-soft">Saturday · Within 3 km</p>
                </div>
              </div>
              <p className="mt-2 text-[11px] leading-snug text-ink-soft">
                Small-breed social at the community park. 12 pets going.
              </p>
              <AnimatePresence>
                {meetupBurst.bursts.map((burst) => (
                  <PawBurst key={burst.id} id={burst.id} x={burst.x} onDone={meetupBurst.remove} />
                ))}
              </AnimatePresence>
            </ParallaxCard>
          </div>
        </div>
      </div>

      {/* Organic wave flowing into the stats-banner below — the hero's
          warm gradient melts into the solid brand-soft strip rather than
          hard-stopping at a straight edge. */}
      <WaveDivider color="var(--brand-soft)" />
    </section>
  );
}
