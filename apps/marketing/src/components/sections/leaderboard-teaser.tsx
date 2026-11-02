"use client";

import { ArrowRight, Crown, PawPrint } from "lucide-react";
import { m, useReducedMotion } from "motion/react";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";

import { Reveal } from "@/components/motion/Reveal";
import { SpeciesIcon } from "@/components/ui/species-icon";
import { leaderboard } from "@/config/site";
import { fetchLeaderboard, type LeaderboardEntry } from "@/lib/leaderboard";
import { cn } from "@/lib/utils";

/**
 * Hall of Fame wall — three framed portraits on a podium.
 *
 * Rank is carried by the frame itself: gold / silver / bronze metal, and the
 * winner's frame is physically larger and stands on the tallest plinth. Order
 * is 2nd, 1st, 3rd across, so the centre is the winner.
 */

/** Per-rank frame treatment. Index is the rank, not the display order. */
const FRAMES = [
  {
    // Gold
    ring: "ring-[3px] ring-[#e0a800]",
    mat: "bg-gradient-to-br from-[#f7c948] via-[#e8b530] to-[#c08f00]",
    badge: "from-[#f7c948] to-[#e0a800] text-[#4a3500]",
    plinth: "h-8 bg-gradient-to-b from-[#f0c23f] to-[#c89a1a] sm:h-12",
    label: "text-[#6b4e00]",
  },
  {
    // Silver
    ring: "ring-2 ring-[#aab4bf]",
    mat: "bg-gradient-to-br from-[#e6eaee] via-[#c7cfd8] to-[#9aa5b1]",
    badge: "from-[#d8dde3] to-[#aab4bf] text-[#3a4047]",
    plinth: "h-5 bg-gradient-to-b from-[#d3dae1] to-[#a5b0bb] sm:h-7",
    label: "text-[#3f4650]",
  },
  {
    // Bronze
    ring: "ring-2 ring-[#b97f4a]",
    mat: "bg-gradient-to-br from-[#e3b183] via-[#cf9460] to-[#a97140]",
    badge: "from-[#d9a06b] to-[#b97f4a] text-[#3f2715]",
    plinth: "h-3 bg-gradient-to-b from-[#d59f6e] to-[#ab7445] sm:h-4",
    label: "text-[#5a3a1d]",
  },
];

/** Display order across the wall: 2nd, 1st, 3rd. */
const WALL_ORDER = [1, 0, 2];

function speciesKey(species: string | null): string {
  if (!species) return "paw";
  const s = species.toLowerCase();
  if (s.includes("dog")) return "dog";
  if (s.includes("cat")) return "cat";
  if (s.includes("rabbit") || s.includes("bunny")) return "rabbit";
  if (s.includes("bird") || s.includes("parrot")) return "bird";
  if (s.includes("fish")) return "fish";
  if (s.includes("turtle") || s.includes("reptile") || s.includes("gecko")) return "reptile";
  return "paw";
}

function Frame({ entry, rank, slot }: { entry: LeaderboardEntry; rank: number; slot: number }) {
  const reduced = useReducedMotion();
  const frame = FRAMES[rank];
  const first = rank === 0;

  return (
    <m.li
      initial={reduced ? undefined : { opacity: 0, y: 30, scale: 0.92 }}
      whileInView={reduced ? undefined : { opacity: 1, y: 0, scale: 1 }}
      viewport={{ once: true, amount: 0.25 }}
      transition={{
        type: "spring",
        bounce: first ? 0.34 : 0.14,
        duration: 0.55,
        // Outer frames land first, the winner last.
        delay: reduced ? 0 : (first ? 2 : slot === 0 ? 0 : 1) * 0.11,
      }}
      className="flex min-w-0 flex-col justify-end"
    >
      {/* The portrait. Hovering wags it — a short rotation, not a loop. */}
      <m.div
        whileHover={reduced ? undefined : { rotate: [0, -2.2, 2.2, -1.2, 0], y: -6 }}
        transition={{ duration: 0.7, ease: "easeInOut" }}
        className={cn("group/frame relative mx-auto w-full", first ? "max-w-[13rem]" : "max-w-[10.5rem]")}
      >
        {first && (
          <m.span
            aria-hidden="true"
            animate={reduced ? { opacity: 0.35 } : { opacity: [0.25, 0.5, 0.25] }}
            transition={{ duration: 3.2, repeat: Infinity, ease: "easeInOut" }}
            className="pointer-events-none absolute -inset-2 -z-10 rounded-[1.5rem] bg-[#f7c948]/40 blur-lg"
          />
        )}

        {/* Metal mat, then the photo inset within it — a real frame has a border. */}
        <div
          className={cn(
            "relative rounded-[1.1rem] p-[3px] shadow-lift sm:rounded-[1.25rem] sm:p-1",
            frame.mat,
          )}
        >
          <div
            className={cn(
              "relative overflow-hidden rounded-[0.9rem] bg-secondary sm:rounded-[1rem]",
              first ? "aspect-[4/5]" : "aspect-square",
              frame.ring,
            )}
          >
            {entry.photoUrl ? (
              <Image
                src={entry.photoUrl}
                alt={entry.name}
                fill
                unoptimized
                sizes="(min-width: 1024px) 210px, 30vw"
                className="object-cover transition-transform duration-[700ms] ease-out group-hover/frame:scale-[1.06]"
              />
            ) : (
              <span
                aria-hidden="true"
                className="grid size-full place-items-center bg-gradient-to-br from-brand-soft to-brand/25 text-brand-ink"
              >
                <SpeciesIcon species={speciesKey(entry.species)} className="size-10" />
              </span>
            )}

            <span
              aria-hidden="true"
              className="pointer-events-none absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/80 to-transparent"
            />

            <div className="absolute inset-x-0 bottom-0 p-2.5">
              <p className="truncate font-heading text-sm leading-tight font-bold text-white drop-shadow">
                {entry.name}
              </p>
              {entry.species && (
                <p className="mt-0.5 flex items-center gap-1 text-[11px] font-medium text-white/75">
                  <SpeciesIcon species={speciesKey(entry.species)} className="size-3" />
                  {entry.species}
                </p>
              )}
            </div>
          </div>

          {/* Rank plaque, hung on the frame's top edge. */}
          <m.span
            initial={reduced ? undefined : { scale: 0, rotate: -30 }}
            whileInView={reduced ? undefined : { scale: 1, rotate: 0 }}
            viewport={{ once: true, amount: 0.25 }}
            transition={{ type: "spring", bounce: 0.5, duration: 0.5, delay: 0.3 }}
            className={cn(
              "absolute -top-2.5 left-1/2 grid -translate-x-1/2 place-items-center rounded-full bg-gradient-to-br font-heading font-bold shadow-lift ring-2 ring-background",
              frame.badge,
              first ? "size-8" : "size-7 text-xs",
            )}
          >
            {first ? <Crown className="size-4" aria-hidden="true" /> : rank + 1}
          </m.span>
        </div>
      </m.div>

      {/* Plinth. Height encodes rank, so the three read as a podium. */}
      <m.div
        initial={reduced ? undefined : { scaleY: 0 }}
        whileInView={reduced ? undefined : { scaleY: 1 }}
        viewport={{ once: true, amount: 0.25 }}
        transition={{ duration: 0.45, delay: 0.35, ease: "easeOut" }}
        style={{ transformOrigin: "bottom" }}
        className={cn("mt-3 rounded-t-md", frame.plinth)}
      />
    </m.li>
  );
}

/**
 * Homepage teaser: the three most popular pets as a Hall of Fame wall,
 * linking through to /leaderboard.
 *
 * Renders nothing when the data is unavailable. A homepage section that
 * announces itself and then shows an error is worse than one that was never
 * there — the full page keeps the error state, because a visitor went there on
 * purpose and deserves an explanation.
 */
export function LeaderboardTeaser() {
  const [entries, setEntries] = useState<LeaderboardEntry[] | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    let active = true;
    fetchLeaderboard(controller.signal).then((result) => {
      if (!active || !result.ok) return;
      const popular = result.data.categories.find((c) => c.id === "popular");
      if (popular?.entries.length) setEntries(popular.entries.slice(0, 3));
    });
    return () => {
      active = false;
      controller.abort();
    };
  }, []);

  if (!entries) return null;

  return (
    <section className="relative scroll-mt-24 overflow-hidden py-16 sm:py-20">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 -z-10"
        style={{
          background:
            "radial-gradient(46rem 24rem at 50% 0%, var(--brand-soft), transparent 68%)",
        }}
      />

      <div className="section-shell">
        <div className="grid grid-cols-1 items-center gap-10 lg:grid-cols-[1fr_1.1fr] lg:gap-16">
          <Reveal className="text-center lg:text-left">
            <p className="inline-flex items-center gap-2 text-xs font-semibold tracking-[0.14em] text-brand-ink uppercase">
              <span className="relative flex size-2">
                <span className="absolute inline-flex size-full rounded-full bg-verified opacity-60 motion-safe:animate-ping" />
                <span className="relative inline-flex size-2 rounded-full bg-verified" />
              </span>
              {leaderboard.teaser.eyebrow}
            </p>
            <h2 className="mt-4 font-heading text-[clamp(1.875rem,4.5vw,3.25rem)] leading-[1.05] font-bold tracking-tight text-balance">
              {leaderboard.teaser.title}
            </h2>
            <p className="mx-auto mt-5 max-w-md leading-relaxed text-ink-soft lg:mx-0 lg:text-lg">
              {leaderboard.teaser.body}
            </p>
            <Link
              href="/leaderboard/"
              className="group mt-7 inline-flex min-h-11 items-center gap-2 rounded-full bg-brand px-6 text-sm font-bold text-white shadow-lift transition-all duration-200 hover:bg-brand-ink hover:shadow-float focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
            >
              <PawPrint className="size-4" aria-hidden="true" />
              {leaderboard.teaser.link}
              <ArrowRight
                className="size-4 transition-transform duration-200 group-hover:translate-x-0.5"
                aria-hidden="true"
              />
            </Link>
          </Reveal>

          {/* Top padding leaves room for the crown, which hangs above the frame. */}
          <div className="relative pt-5">
            {/* 2nd, 1st, 3rd — items-end so every plinth rests on one floor. */}
            <ul className="grid grid-cols-[repeat(3,minmax(0,1fr))] items-end gap-2 sm:gap-4">
              {WALL_ORDER.map((rank, slot) => {
                const entry = entries[rank];
                if (!entry) return null;
                return <Frame key={entry.name} entry={entry} rank={rank} slot={slot} />;
              })}
            </ul>
            {/* The floor the podium stands on, with its own shadow so the
                plinths read as resting on something rather than stopping. */}
            <div
              aria-hidden="true"
              className="h-1.5 rounded-full bg-gradient-to-r from-transparent via-ink/15 to-transparent"
            />
            <div
              aria-hidden="true"
              className="mx-auto h-5 w-4/5 rounded-[50%] bg-gradient-to-b from-ink/8 to-transparent blur-md"
            />
          </div>
        </div>
      </div>
    </section>
  );
}
