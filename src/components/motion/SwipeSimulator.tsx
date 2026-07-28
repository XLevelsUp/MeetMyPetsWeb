"use client";

import { AnimatePresence, motion, useInView, useReducedMotion } from "motion/react";
import { BadgeCheck, Heart, X } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

import { SpeciesIcon, type SpeciesKey } from "@/components/ui/species-icon";

type Candidate = {
  name: string;
  species: string;
  glyph: SpeciesKey;
  distance: string;
  verified: boolean;
};

const DECK: Candidate[] = [
  { name: "Mochi", species: "Shiba Inu", glyph: "dog", distance: "1.2 km", verified: true },
  { name: "Pepper", species: "Bengal Cat", glyph: "cat", distance: "2.0 km", verified: true },
  { name: "Nimbus", species: "Holland Lop", glyph: "rabbit", distance: "3.4 km", verified: false },
  { name: "Kiwi", species: "Ringneck", glyph: "bird", distance: "4.1 km", verified: true },
];

const AUTOPLAY_MS = 2800;

/**
 * Mock swipe deck for the features bento.
 *
 * Accessibility notes that shaped this:
 *  - Drag is an enhancement, never the only route. The Skip / Playdate buttons
 *    are real <button>s at 44px and drive the same state (`gesture-alternative`).
 *  - Autoplay stops permanently on first interaction, so the control never
 *    fights the user, and it only runs while on screen.
 *  - The whole deck is aria-hidden decoration; the buttons carry the labels.
 */
export function SwipeSimulator() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { margin: "-60px" });
  const reduced = useReducedMotion();

  const [index, setIndex] = useState(0);
  const [matched, setMatched] = useState<Candidate | null>(null);
  const [userTook, setUserTook] = useState(false);

  const advance = useCallback((liked: boolean) => {
    setIndex((prev) => {
      const current = DECK[prev % DECK.length];
      if (liked) setMatched(current);
      return prev + 1;
    });
  }, []);

  // Autoplay: only while visible, never under reduced motion, and it yields
  // permanently once the user takes over.
  useEffect(() => {
    if (reduced || userTook || !inView) return;
    const id = window.setInterval(() => advance(Math.random() > 0.45), AUTOPLAY_MS);
    return () => window.clearInterval(id);
  }, [reduced, userTook, inView, advance]);

  // Match popover is transient; clear it so the deck does not stay covered.
  useEffect(() => {
    if (!matched) return;
    const id = window.setTimeout(() => setMatched(null), 1900);
    return () => window.clearTimeout(id);
  }, [matched]);

  function act(liked: boolean) {
    setUserTook(true);
    advance(liked);
  }

  const visible = [0, 1, 2].map((offset) => ({
    card: DECK[(index + offset) % DECK.length],
    offset,
    key: index + offset,
  }));

  return (
    <div ref={ref} className="flex flex-col items-center gap-4">
      <div className="relative h-56 w-full max-w-[15rem]" aria-hidden="true">
        <AnimatePresence initial={false}>
          {visible
            .slice()
            .reverse()
            .map(({ card, offset, key }) => (
              <motion.div
                key={key}
                className="absolute inset-0 flex flex-col justify-between rounded-2xl border border-border bg-card p-4 shadow-soft"
                initial={{ opacity: 0, scale: 0.94, y: 14 }}
                animate={{
                  opacity: offset === 0 ? 1 : 1 - offset * 0.28,
                  scale: 1 - offset * 0.05,
                  y: offset * -10,
                  zIndex: 10 - offset,
                }}
                exit={
                  reduced
                    ? { opacity: 0 }
                    : { x: matched ? 220 : -220, opacity: 0, rotate: matched ? 14 : -14 }
                }
                transition={{ type: "spring", stiffness: 100, damping: 15 }}
              >
                <div className="flex items-start justify-between">
                  <div className="size-11 rounded-xl bg-brand-soft p-2.5 text-brand-ink">
                    <SpeciesIcon species={card.glyph} />
                  </div>
                  {card.verified && (
                    <span className="glass inline-flex items-center gap-1 rounded-full px-2 py-1 text-[11px] font-semibold text-verified">
                      <BadgeCheck className="size-3.5" aria-hidden="true" />
                      Verified
                    </span>
                  )}
                </div>
                <div>
                  <p className="font-heading text-lg leading-tight font-semibold">{card.name}</p>
                  <p className="text-sm text-ink-soft">{card.species}</p>
                  <p className="mt-1 text-xs text-ink-soft">Within {card.distance}</p>
                </div>
              </motion.div>
            ))}
        </AnimatePresence>

        <AnimatePresence>
          {matched && (
            <motion.div
              className="absolute inset-x-0 top-1/2 z-20 mx-auto w-fit -translate-y-1/2 rounded-full bg-brand px-4 py-2 text-sm font-semibold text-white shadow-lift"
              initial={reduced ? { opacity: 0 } : { opacity: 0, scale: 0.7 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={reduced ? { opacity: 0 } : { opacity: 0, scale: 0.85 }}
              transition={{ type: "spring", stiffness: 320, damping: 18 }}
            >
              Playdate match
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => act(false)}
          className="inline-flex size-11 cursor-pointer items-center justify-center rounded-full border border-border bg-card text-ink-soft transition-colors hover:bg-accent"
        >
          <X className="size-5" aria-hidden="true" />
          <span className="sr-only">Skip this pet</span>
        </button>
        <button
          type="button"
          onClick={() => act(true)}
          className="inline-flex size-11 cursor-pointer items-center justify-center rounded-full bg-brand text-white transition-colors hover:bg-brand-ink"
        >
          <Heart className="size-5" aria-hidden="true" />
          <span className="sr-only">Send a playdate request</span>
        </button>
      </div>
    </div>
  );
}
