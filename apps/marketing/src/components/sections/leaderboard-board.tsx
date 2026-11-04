"use client";

import { AnimatePresence, m, useReducedMotion, useScroll, useTransform } from "motion/react";
import { Crown, Fish, Heart, PawPrint, RefreshCw, Sparkles, UserPlus, Users } from "lucide-react";
import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";

import { SpeciesIcon } from "@/components/ui/species-icon";
import { leaderboard } from "@/config/site";
import {
  fetchLeaderboard,
  type CategoryId,
  type LeaderboardCategory,
  type LeaderboardEntry,
} from "@/lib/leaderboard";
import { cn } from "@/lib/utils";

/**
 * Every timing in one place. Durations are seconds, delays are seconds.
 * Turn the whole thing down by scaling `stagger` and the `*Delay` values;
 * `podiumOrder` controls which card lands first.
 */
const ANIM = {
  /** Fires once ~25% of the row is on screen. */
  viewport: { once: true, amount: 0.25 } as const,
  /** For small children inside a card: any sliver in view is enough. */
  childViewport: { once: true, amount: "some" } as const,
  card: { duration: 0.55, bounce: 0.3 },
  /** Per-card gap. 3rd, then 2nd, then 1st. */
  stagger: 0.12,
  /** Landing order by card index: 3rd place first, winner last. */
  podiumOrder: [2, 1, 0],
  badgeDelay: 0.22,
  /** Treat fall: how far above the card a treat starts, and how long it falls. */
  treatDrop: -140,
  treatFall: 0.62,
  /** Extra treats showered on the winner. */
  treatShower: 5,
  ribbonDelay: 0.34,
  heading: { duration: 0.5 },
  subtitleDelay: 0.1,
  hover: { lift: -6, zoom: 1.05, duration: 0.32 },
  /** Max degrees of cursor tilt. */
  tilt: 6,
  shimmerEvery: 4,
  /** Parallax travel for the paw background, in px. */
  parallax: 40,
};

const ICONS: Record<CategoryId, React.ElementType> = {
  popular: Sparkles,
  matched: Users,
  liked: Heart,
  followed: UserPlus,
};

/** Rank badge colours — gold, silver, bronze. */
const MEDALS = [
  "from-[#f7c948] to-[#e0a800] text-[#4a3500]",
  "from-[#d8dde3] to-[#aab4bf] text-[#3a4047]",
  "from-[#d9a06b] to-[#b97f4a] text-[#3f2715]",
];

/** A dog bone. Lucide has no bone glyph, so it is drawn here. */
function Bone({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" className={className}>
      <path d="M6.6 4.2a2.6 2.6 0 0 1 4.2 2.5l5.3 5.3a2.6 2.6 0 1 1 1.4 4.6 2.6 2.6 0 1 1-4.6-1.4L7.6 9.9a2.6 2.6 0 1 1-1.4-4.6 2.6 2.6 0 0 1 .4-1.1Z" />
    </svg>
  );
}

type State =
  | { status: "loading" }
  | { status: "ready"; categories: LeaderboardCategory[] }
  | { status: "error" };

function speciesKey(species: string | null): string {
  if (!species) return "paw";
  const s = species.toLowerCase();
  if (s.includes("dog")) return "dog";
  if (s.includes("cat")) return "cat";
  if (s.includes("rabbit") || s.includes("bunny")) return "rabbit";
  if (s.includes("bird") || s.includes("parrot")) return "bird";
  if (s.includes("fish")) return "fish";
  if (s.includes("turtle") || s.includes("reptile") || s.includes("gecko")) return "reptile";
  if (s.includes("snail")) return "snail";
  return "paw";
}

/** Loaded only when the winner lands, so it never costs a first paint. */
async function celebrate() {
  const { default: confetti } = await import("canvas-confetti");
  confetti({
    particleCount: 45,
    spread: 55,
    startVelocity: 26,
    scalar: 0.75,
    ticks: 90,
    origin: { y: 0.55 },
    colors: ["#ff1744", "#f7c948", "#ffe4e8", "#e0a800"],
    disableForReducedMotion: true,
  });
}

/**
 * A poster card. The photo fills it, a gradient scrim carries the name, and the
 * whole thing lifts forward on hover — neighbours stay put, so nothing reflows.
 *
 * `order` is the landing position, separate from `index` (the rank), so the
 * podium can fill 3rd → 2nd → 1st while the medals stay correct.
 */
function PosterCard({
  entry,
  index,
  order,
  featured,
  rankLabel,
  slideFrom,
  onLanded,
  onHoverChange,
}: {
  entry: LeaderboardEntry;
  index: number;
  order: number;
  featured: boolean;
  /** Netflix-style "#1 in Matches" ribbon; winner only. */
  rankLabel?: string;
  /** Horizontal entrance offset, used by the "Most Matched" row. */
  slideFrom?: number;
  onLanded?: () => void;
  onHoverChange?: (hovered: boolean) => void;
}) {
  const reduced = useReducedMotion();
  const [failed, setFailed] = useState(false);
  const [tilt, setTilt] = useState({ x: 0, y: 0 });
  const cardRef = useRef<HTMLDivElement>(null);
  const medal = MEDALS[Math.min(index, 2)];
  const delay = reduced ? 0 : order * ANIM.stagger;

  // Pointer tilt, mouse only: a touch device has no hover, and tracking the
  // finger here would fight the page scroll.
  function onPointerMove(event: React.PointerEvent) {
    if (reduced || event.pointerType !== "mouse") return;
    const el = cardRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const px = (event.clientX - r.left) / r.width - 0.5;
    const py = (event.clientY - r.top) / r.height - 0.5;
    setTilt({ x: -py * ANIM.tilt * 2, y: px * ANIM.tilt * 2 });
  }

  return (
    <m.li
      initial="hidden"
      whileInView="shown"
      variants={{
        hidden: reduced ? {} : { opacity: 0, y: 34, x: slideFrom ?? 0, scale: 0.94 },
        shown: reduced ? {} : { opacity: 1, y: 0, x: 0, scale: 1 },
      }}
      viewport={ANIM.viewport}
      transition={{
        type: "spring",
        // Only the winner overshoots — it is the one that "lands".
        bounce: featured ? ANIM.card.bounce : 0.12,
        duration: ANIM.card.duration,
        delay,
      }}
      // Children inherit this trigger via variants, so a small badge no
      // longer needs its own in-view check (which did not fire).
      onAnimationComplete={featured ? onLanded : undefined}
      onHoverStart={() => onHoverChange?.(true)}
      onHoverEnd={() => {
        onHoverChange?.(false);
        setTilt({ x: 0, y: 0 });
      }}
      // All three share one baseline. The winner is marked by its ring, glow,
      // crown and ribbon — lifting it as well left the row visibly ragged.
      className="group relative"
    >
      {/* Mobile crown, outside the card: the card clips its own children, so the badge has to live on the li. */}
      {index === 0 && (
        <span
          aria-hidden="true"
          className="absolute -top-3 -left-2 z-20 grid size-8 place-items-center rounded-full bg-gradient-to-br from-[#ffd76a] to-[#e0a800] text-[#4a3500] shadow-lift sm:hidden"
        >
          <Crown className="size-4" />
        </span>
      )}

      {/* Winner's glow, behind the card so it never tints the photo. */}
      {featured && (
        <m.span
          aria-hidden="true"
          initial={{ opacity: 0 }}
          whileInView={reduced ? { opacity: 0.4 } : { opacity: [0.3, 0.55, 0.3] }}
          viewport={{ once: false }}
          transition={{ duration: 3.2, repeat: Infinity, ease: "easeInOut" }}
          className="pointer-events-none absolute -inset-2 -z-10 rounded-[2rem] bg-brand/30 blur-xl"
        />
      )}

      <m.div
        ref={cardRef}
        onPointerMove={onPointerMove}
        animate={reduced ? undefined : { rotateX: tilt.x, rotateY: tilt.y }}
        whileHover={reduced ? undefined : { y: ANIM.hover.lift, scale: 1.02 }}
        whileTap={reduced ? undefined : { scale: 0.99 }}
        transition={{ type: "spring", bounce: 0, duration: ANIM.hover.duration }}
        style={{ transformPerspective: 900 }}
        className={cn(
          "relative aspect-[3/4] overflow-hidden rounded-[1.5rem] bg-secondary shadow-float ring-1 transition-shadow duration-300 group-hover:shadow-[0_24px_60px_-12px_rgba(0,0,0,0.28)]",
          featured ? "ring-2 ring-brand" : "ring-border",
        )}
      >
        {entry.photoUrl && !failed ? (
          <Image
            src={entry.photoUrl}
            alt={entry.name}
            fill
            unoptimized
            sizes="(min-width: 1024px) 300px, (min-width: 640px) 30vw, 44vw"
            onError={() => setFailed(true)}
            className="object-cover object-center transition-transform duration-[800ms] ease-out group-hover:scale-[1.05]"
          />
        ) : (
          <span
            aria-hidden="true"
            className="grid size-full place-items-center bg-gradient-to-br from-brand-soft to-brand/25 text-brand-ink"
          >
            <SpeciesIcon species={speciesKey(entry.species)} className="size-14" />
          </span>
        )}

        {/* Light sweeping across the winner, as a spotlight would. */}
        {featured && (
          <m.span
            aria-hidden="true"
            initial={{ x: "-120%" }}
            animate={reduced ? { x: "-120%" } : { x: "220%" }}
            transition={{
              duration: 2.4,
              repeat: Infinity,
              repeatDelay: ANIM.shimmerEvery,
              ease: "easeInOut",
            }}
            className="pointer-events-none absolute inset-y-0 w-1/3 skew-x-12 bg-gradient-to-r from-transparent via-white/30 to-transparent"
          />
        )}

        {/* Scrim: the name has to stay legible over any photo. */}
        <span
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 bottom-0 h-3/5 bg-gradient-to-t from-black/90 via-black/45 to-transparent"
        />

        {/* Treat dispenser: the badge falls in from above the card, bounces on
            landing, and becomes the rank marker. Hovering rattles it. */}
        <m.span
          // One tween for every property. A spring cannot take the winner's
          // multi-keyframe settle, and splitting the transition per-property
          // left opacity stuck at 0 — so the whole drop is keyframed instead.
          variants={{
            hidden: { y: reduced ? 0 : ANIM.treatDrop, opacity: reduced ? 1 : 0, rotate: 0 },
            shown: {
              y: reduced ? 0 : [ANIM.treatDrop, 6, -3, 0],
              opacity: 1,
              rotate: reduced ? 0 : featured ? [-120, 14, -6, 0] : [-120, 8, 0],
            },
          }}
          transition={{
            duration: reduced ? 0 : ANIM.treatFall + (featured ? 0.2 : 0),
            delay: reduced ? 0 : delay + ANIM.badgeDelay,
            // Fast fall, soft settle — the shape of something dropping.
            ease: [0.34, 1.26, 0.64, 1],
          }}
          className={cn(
            "absolute top-3 left-3 grid size-9 place-items-center overflow-hidden rounded-full bg-gradient-to-br font-heading text-sm font-bold shadow-lift sm:size-10",
            // Rattle on hover. motion-safe, not a JS branch: `reduced` is false
            // during SSR and true on the client, which mismatched on hydration.
            "transition-transform duration-200 motion-safe:group-hover:animate-[treat-rattle_0.45s_ease-in-out]",
            // Below sm the winner's crown sits outside the card and ranks 2–3 are dropped, so all in-card chips hide.
            "hidden sm:grid",
            medal,
          )}
        >
          {index === 0 ? <Crown className="size-4.5" aria-hidden="true" /> : entry.rank}
          {featured && (
            <m.span
              aria-hidden="true"
              initial={{ x: "-150%" }}
              animate={reduced ? { x: "-150%" } : { x: "250%" }}
              transition={{
                duration: 1.1,
                repeat: Infinity,
                repeatDelay: ANIM.shimmerEvery,
                ease: "easeInOut",
              }}
              className="absolute inset-y-0 w-1/2 skew-x-12 bg-white/50"
            />
          )}
        </m.span>

        {/* Shower of treats on the winner, landing just before the crown. */}
        {featured && (
          <span aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
            {Array.from({ length: ANIM.treatShower }).map((_, t) => (
              <m.span
                key={t}
                initial={{ y: ANIM.treatDrop, opacity: 0, rotate: -40 }}
                whileInView={{ y: "120%", opacity: [0, 1, 1, 0], rotate: 180 + t * 40 }}
                viewport={ANIM.childViewport}
                transition={{
                  duration: 1.5,
                  delay: delay + 0.1 + t * 0.09,
                  ease: "easeIn",
                }}
                className="absolute top-0 text-[#e0a800]"
                style={{ left: `${14 + t * 17}%` }}
              >
                {t % 2 === 0 ? <Bone className="size-4" /> : <Fish className="size-4" />}
              </m.span>
            ))}
          </span>
        )}

        {rankLabel && (
          <m.span
            initial={reduced ? undefined : { opacity: 0, scale: 0.85 }}
            whileInView={reduced ? undefined : { opacity: 1, scale: 1 }}
            viewport={ANIM.childViewport}
            transition={{ type: "spring", bounce: 0.35, duration: 0.45, delay: delay + ANIM.ribbonDelay }}
            // Hidden below sm: at 375px the label wraps to two lines and covers the pet.
            className="absolute top-3 right-3 hidden sm:block"
          >
            <m.span
              animate={reduced ? undefined : { scale: [1, 1.045, 1] }}
              transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }}
              className="inline-flex items-center gap-1 rounded-full bg-brand px-2.5 py-1 text-[10px] font-bold tracking-wide whitespace-nowrap text-white uppercase shadow-lift sm:text-[11px]"
            >
              <PawPrint className="size-3" aria-hidden="true" />
              {rankLabel}
            </m.span>
          </m.span>
        )}

        <div className="absolute inset-x-0 bottom-0 p-3.5 sm:p-4">
          <p className="truncate font-heading text-base leading-tight font-bold text-white drop-shadow transition-transform duration-300 ease-out group-hover:-translate-y-0.5 sm:text-lg">
            {entry.name}
          </p>
          {/* Species is dropped below sm: on a 44vw card the name alone is all that reads cleanly. */}
          {entry.species && (
            <p className="mt-1 hidden items-center gap-1.5 text-xs font-semibold text-white/85 transition-all duration-300 ease-out group-hover:-translate-y-0.5 group-hover:text-white sm:flex sm:text-[0.8125rem]">
              <SpeciesIcon species={speciesKey(entry.species)} className="size-4 shrink-0" />
              <span className="truncate">{entry.species}</span>
            </p>
          )}
        </div>
      </m.div>
    </m.li>
  );
}

/** Hearts drifting up from the winner of the "Most Matched" row. */
function HeartBurst() {
  const reduced = useReducedMotion();
  if (reduced) return null;
  return (
    <span aria-hidden="true" className="pointer-events-none absolute inset-x-0 bottom-1/3 z-10">
      {[0, 1, 2, 3].map((i) => (
        <m.span
          key={i}
          initial={{ opacity: 0, y: 0, scale: 0.6 }}
          animate={{ opacity: [0, 0.9, 0], y: -120 - i * 18, scale: 1 }}
          transition={{ duration: 2.4, delay: i * 0.22, ease: "easeOut" }}
          className="absolute text-brand"
          style={{ left: `${22 + i * 18}%` }}
        >
          <Heart className="size-5 fill-current" />
        </m.span>
      ))}
    </span>
  );
}

function CategoryRow({ category, index }: { category: LeaderboardCategory; index: number }) {
  const reduced = useReducedMotion();
  const meta = leaderboard.categories[category.id];
  const Icon = ICONS[category.id];
  const [landed, setLanded] = useState(false);
  // Only the first row fires confetti — four bursts down one page is noise.
  const celebrates = index === 0;
  const matched = category.id === "matched";

  const handleLanded = useCallback(() => {
    setLanded(true);
    if (celebrates && !reduced) void celebrate();
  }, [celebrates, reduced]);

  return (
    <section className="relative">
      <div className="flex items-end gap-3">
        <m.span
          initial={reduced ? undefined : { scale: 0.6, rotate: -20 }}
          whileInView={reduced ? undefined : { scale: 1, rotate: [-20, 12, 0] }}
          viewport={ANIM.viewport}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="grid size-10 shrink-0 place-items-center rounded-xl bg-brand-soft text-brand-ink shadow-soft sm:size-11"
        >
          <Icon className="size-5" aria-hidden="true" />
        </m.span>
        <div className="min-w-0">
          <m.h2
            initial={reduced ? undefined : { opacity: 0, x: -14 }}
            whileInView={reduced ? undefined : { opacity: 1, x: 0 }}
            viewport={ANIM.viewport}
            transition={{ duration: ANIM.heading.duration, ease: "easeOut" }}
            className="font-heading text-xl leading-tight font-bold text-ink sm:text-2xl"
          >
            {meta.title}
          </m.h2>
          <m.p
            initial={reduced ? undefined : { opacity: 0, x: -14 }}
            whileInView={reduced ? undefined : { opacity: 1, x: 0 }}
            viewport={ANIM.viewport}
            transition={{
              duration: ANIM.heading.duration,
              delay: ANIM.subtitleDelay,
              ease: "easeOut",
            }}
            className="mt-0.5 text-sm text-ink-soft"
          >
            {meta.blurb}
          </m.p>
        </div>

        {/* Per-row CTA. Sits in the heading line rather than under the cards:
            four full-width banners down one page would read as nagging. */}
        <m.a
          href={leaderboard.cta.href}
          target="_blank"
          rel="noopener noreferrer"
          initial={reduced ? undefined : { opacity: 0, x: 12 }}
          whileInView={reduced ? undefined : { opacity: 1, x: 0 }}
          viewport={ANIM.viewport}
          transition={{ duration: 0.45, delay: ANIM.subtitleDelay * 2, ease: "easeOut" }}
          className="group ml-auto hidden shrink-0 items-center gap-2 rounded-full border border-brand/30 bg-brand-soft/60 px-4 py-2.5 text-sm font-bold text-brand-ink transition-all duration-200 hover:border-brand hover:bg-brand hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand sm:inline-flex"
        >
          <PawPrint className="size-4" aria-hidden="true" />
          {meta.cta}
        </m.a>
      </div>

      {category.entries.length > 0 ? (
        <ul className="relative mt-7 grid grid-cols-[repeat(3,minmax(0,1fr))] items-start gap-3 sm:mt-9 sm:gap-5">
          {matched && landed && <HeartBurst />}
          {category.entries.map((entry, i) => (
            <PosterCard
              key={`${category.id}-${entry.name}`}
              entry={entry}
              index={i}
              // 3rd lands first, winner last.
              order={ANIM.podiumOrder.indexOf(i)}
              featured={i === 0}
              rankLabel={i === 0 ? meta.rank : undefined}
              // "Most Matched" enters sideways so it does not repeat row one.
              slideFrom={matched ? [0, -40, 40][i] : undefined}
              onLanded={i === 0 ? handleLanded : undefined}
            />
          ))}
        </ul>
      ) : null}

      {/* Phone equivalent of the heading-line CTA, which is hidden below sm. */}
      {category.entries.length > 0 ? (
        <a
          href={leaderboard.cta.href}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-5 flex min-h-11 items-center justify-center gap-2 rounded-full border border-brand/30 bg-brand-soft/60 px-5 text-sm font-bold text-brand-ink transition-colors hover:bg-brand hover:text-white sm:hidden"
        >
          <PawPrint className="size-4" aria-hidden="true" />
          {meta.cta}
        </a>
      ) : (
        <p className="mt-5 rounded-2xl border border-dashed border-brand/25 bg-brand-soft/20 px-5 py-8 text-center text-sm text-ink-soft">
          {meta.empty}
        </p>
      )}
    </section>
  );
}

export function LeaderboardBoard() {
  const reduced = useReducedMotion();
  const [state, setState] = useState<State>({ status: "loading" });
  const [nonce, setNonce] = useState(0);
  const stageRef = useRef<HTMLDivElement>(null);

  // Paw background drifts slower than the content it sits behind.
  const { scrollYProgress } = useScroll({
    target: stageRef,
    offset: ["start end", "end start"],
  });
  const pawY = useTransform(scrollYProgress, [0, 1], [ANIM.parallax, -ANIM.parallax]);

  useEffect(() => {
    const controller = new AbortController();
    let active = true;

    fetchLeaderboard(controller.signal).then((result) => {
      if (!active) return;
      setState(
        result.ok ? { status: "ready", categories: result.data.categories } : { status: "error" },
      );
    });

    return () => {
      active = false;
      controller.abort();
    };
  }, [nonce]);

  // Reset in the handler, not the effect: setState during an effect triggers a
  // cascading render.
  const retry = useCallback(() => {
    setState({ status: "loading" });
    setNonce((n) => n + 1);
  }, []);

  return (
    <div ref={stageRef} className="relative overflow-hidden pt-14 pb-6 sm:pt-20 sm:pb-8">
      <m.div
        aria-hidden="true"
        style={reduced ? undefined : { y: pawY }}
        className="pointer-events-none absolute inset-0 -z-10"
      >
        <div
          className="absolute inset-0"
          style={{
            background:
              "radial-gradient(60rem 30rem at 15% 0%, var(--brand-soft), transparent 60%), radial-gradient(50rem 26rem at 85% 100%, var(--trust-soft), transparent 62%)",
          }}
        />
      </m.div>

      <div className="section-shell relative">
        <AnimatePresence mode="wait">
          {state.status === "loading" && (
            <m.div key="loading" exit={{ opacity: 0 }} className="space-y-12">
              {Array.from({ length: 2 }).map((_, r) => (
                <div key={r}>
                  <div aria-hidden="true" className="h-10 w-56 animate-pulse rounded-xl bg-secondary/60" />
                  <div className="mt-5 grid grid-cols-3 gap-3 sm:gap-5">
                    {Array.from({ length: 3 }).map((_, i) => (
                      <div
                        key={i}
                        aria-hidden="true"
                        className="aspect-[3/4] animate-pulse rounded-[1.5rem] bg-secondary/60"
                        style={{ animationDelay: `${i * 90}ms` }}
                      />
                    ))}
                  </div>
                </div>
              ))}
              <p className="sr-only" role="status">
                Loading the leaderboard
              </p>
            </m.div>
          )}

          {state.status === "error" && (
            <m.div
              key="error"
              initial={reduced ? undefined : { opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="rounded-[2rem] border border-border bg-card px-6 py-16 text-center shadow-soft"
            >
              <span className="mx-auto grid size-14 place-items-center rounded-2xl bg-brand-soft text-brand-ink">
                <PawPrint className="size-7" aria-hidden="true" />
              </span>
              <h2 className="mt-5 font-heading text-2xl font-bold text-ink">
                {leaderboard.error.title}
              </h2>
              <p className="mx-auto mt-3 max-w-md leading-relaxed text-ink-soft">
                {leaderboard.error.body}
              </p>
              <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
                <a
                  href={leaderboard.cta.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex min-h-11 items-center gap-2 rounded-full bg-brand px-6 text-sm font-bold text-white shadow-lift transition-colors hover:bg-brand-ink"
                >
                  {leaderboard.cta.label}
                </a>
                <button
                  type="button"
                  onClick={retry}
                  className="inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-full border border-border px-5 text-sm font-semibold text-ink-soft transition-colors hover:text-ink"
                >
                  <RefreshCw className="size-4" aria-hidden="true" />
                  Try again
                </button>
              </div>
            </m.div>
          )}

          {state.status === "ready" && (
            <m.div key="ready" initial={false} className="space-y-16 sm:space-y-20">
              {state.categories.length === 0 ? (
                <div className="rounded-[2rem] border border-dashed border-brand/25 bg-brand-soft/20 px-6 py-16 text-center">
                  <span className="mx-auto grid size-14 place-items-center rounded-2xl bg-brand-soft text-brand-ink">
                    <PawPrint className="size-7" aria-hidden="true" />
                  </span>
                  <p className="mt-5 font-heading text-xl font-bold text-ink">No rankings yet</p>
                  <p className="mx-auto mt-3 max-w-md leading-relaxed text-ink-soft">
                    The first pets to join will appear here — check back soon!
                  </p>
                </div>
              ) : (
                state.categories.map((category, i) => (
                  <CategoryRow key={category.id} category={category} index={i} />
                ))
              )}

              <p className="text-center text-xs text-ink-soft">{leaderboard.scopeNote}</p>
            </m.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
