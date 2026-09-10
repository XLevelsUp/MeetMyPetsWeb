"use client";

import { m, useReducedMotion } from "motion/react";
import { Crown, Sparkles } from "lucide-react";
import { useEffect, useState } from "react";

import { fetchVipCount } from "@/lib/vip-count";
import { vipOffer } from "@/config/site";
import { cn } from "@/lib/utils";

type State =
  | { status: "loading" }
  | { status: "static" }
  | { status: "live"; remaining: number };

/**
 * "First 10,000 get VIP access" promo pill — three variants:
 *
 * - `compact`: small solid pill, used inline near other badges (hero top row).
 * - `full`: larger pill with breathing room (waitlist section, above the form).
 * - `spotlight`: a bold, multi-line feature block that makes the offer
 *   unmissable — crown icon, animated shimmer, remaining-spots counter,
 *   and a sub-line with the benefit text. Used as its own hero element
 *   or in the waitlist card.
 *
 * SOLID FILL, NOT GLASS: this used to be the same translucent-outline style
 * as every other small label on the page (the "Built for every whisker…"
 * pill, nav chips), so it read as one more quiet tag rather than an offer —
 * easy to miss entirely. Solid terracotta + white text matches the weight
 * of the primary CTA buttons instead, plus a soft pulsing halo behind it so
 * it draws the eye on load without looping forever (the halo's own
 * animation runs a fixed few cycles via `repeat`, not `Infinity` — a
 * "highlight this" cue should fade once it's made its point, not become
 * permanent motion competing with the rest of the page. Reduced-motion
 * visitors get the badge with no halo and no entrance animation.
 *
 * Two sizes: `compact` for the hero (sits inline near the existing "Built
 * for every whisker…" pill) and `full` for the waitlist section (its own
 * line, slightly larger, room for the crown + remaining count to breathe).
 */
export function VipBadge({
  variant = "compact",
  className,
}: {
  variant?: "compact" | "full" | "spotlight";
  className?: string;
}) {
  const reduced = useReducedMotion();
  const [state, setState] = useState<State>({ status: "static" });

  useEffect(() => {
    let active = true;
    fetchVipCount().then((result) => {
      if (!active || !result) return;
      setState({ status: "live", remaining: result.remaining });
    });
    return () => {
      active = false;
    };
  }, []);

  const text =
    state.status === "live"
      ? `Only ${state.remaining.toLocaleString()} of ${vipOffer.cap.toLocaleString()} VIP spots left`
      : vipOffer.badge;

  /* ── Spotlight variant ── */
  if (variant === "spotlight") {
    return (
      <m.div
        initial={reduced ? undefined : { opacity: 0, y: 10, scale: 0.96 }}
        animate={reduced ? undefined : { opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
        className={cn("relative overflow-hidden", className)}
      >
        {/* Outer glow halo — pulses 3 times then fades out */}
        {!reduced && (
          <m.span
            aria-hidden="true"
            className="absolute inset-0 -z-10 rounded-2xl bg-brand/30 blur-xl"
            initial={{ opacity: 0.8, scale: 1 }}
            animate={{ opacity: 0, scale: 1.5 }}
            transition={{ duration: 2.2, ease: "easeOut", repeat: 3, repeatDelay: 0.3 }}
          />
        )}

        <div className="relative flex items-start gap-4 rounded-2xl border border-brand/20 bg-gradient-to-br from-brand to-brand-ink px-5 py-4 shadow-lift">
          {/* Shimmer sweep */}
          {!reduced && (
            <m.span
              aria-hidden="true"
              className="pointer-events-none absolute inset-y-0 -left-1/2 w-1/2 skew-x-12 bg-gradient-to-r from-transparent via-white/20 to-transparent"
              initial={{ x: 0 }}
              animate={{ x: "400%" }}
              transition={{ duration: 2.4, repeat: Infinity, repeatDelay: 2.8, ease: "easeInOut" }}
            />
          )}

          {/* Crown icon */}
          <span className="mt-0.5 grid size-10 shrink-0 place-items-center rounded-xl bg-white/15">
            <Crown className="size-5 text-white" aria-hidden="true" />
          </span>

          <div>
            <p className="flex items-center gap-2 text-base font-bold tracking-wide text-white uppercase">
              <Sparkles className="size-4" aria-hidden="true" />
              {text}
            </p>
            <p className="mt-1 text-sm leading-snug text-white/80">{vipOffer.perk}</p>
          </div>
        </div>
      </m.div>
    );
  }

  /* ── Compact / Full variants (unchanged behaviour) ── */
  return (
    <m.span
      initial={reduced ? undefined : { opacity: 0, y: 6, scale: 0.94 }}
      animate={reduced ? undefined : { opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.5 }}
      whileHover={
        reduced ? undefined : { scale: 1.05, transition: { type: "spring", stiffness: 300, damping: 20 } }
      }
      className={cn(
        "relative inline-flex items-center gap-2 rounded-full bg-brand font-semibold text-white shadow-soft",
        variant === "compact" ? "px-3.5 py-1.5 text-xs tracking-wide uppercase" : "px-4 py-2 text-sm",
        className,
      )}
    >
      {!reduced && (
        <m.span
          aria-hidden="true"
          className="absolute inset-0 -z-10 rounded-full bg-brand"
          initial={{ opacity: 0.6, scale: 1 }}
          animate={{ opacity: 0, scale: 1.6 }}
          transition={{ duration: 1.6, ease: "easeOut", repeat: 3, repeatDelay: 0.4 }}
        />
      )}
      <Crown className={variant === "compact" ? "size-3.5" : "size-4"} aria-hidden="true" />
      {text}
    </m.span>
  );
}
