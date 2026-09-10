"use client";

import { m, useMotionValue, useReducedMotion, useSpring, useTransform, type MotionValue } from "motion/react";
import { useEffect } from "react";

import { cn } from "@/lib/utils";

/* Five small objects from a pet's world, single-colour inline SVGs so they
   inherit the palette and cost no network request. */
function Ball({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <circle cx="12" cy="12" r="9.5" fill="currentColor" />
      <path d="M4.2 8.5c3.2 1.6 5.2 4.2 5.6 7.6M19.8 8.5c-3.2 1.6-5.2 4.2-5.6 7.6" stroke="var(--background)" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}
function Bone({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 12" fill="none" className={className} aria-hidden="true">
      <path d="M6.5 2.5a2.5 2.5 0 0 0-4.8 1A2.5 2.5 0 0 0 4 7.5L7 6l10 0 3-1.5a2.5 2.5 0 0 0 2.3 4 2.5 2.5 0 0 0-4.8-1H6.5Z" fill="currentColor" />
    </svg>
  );
}
function Feather({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <path d="M4 20c6-1 10-6 12-12 1-3 2-5 4-6-1 3-2 6-4 9-3 4-7 7-12 9Z" fill="currentColor" />
      <path d="M4 20 15 9" stroke="var(--background)" strokeWidth="1.2" strokeLinecap="round" />
    </svg>
  );
}
function Fish({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <path d="M2 12c4-5 9-6 14-3l6-4-2 7 2 7-6-4c-5 3-10 2-14-3Z" fill="currentColor" />
      <circle cx="7" cy="11" r="1.2" fill="var(--background)" />
    </svg>
  );
}
function Yarn({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <circle cx="12" cy="12" r="9.5" fill="currentColor" />
      <path d="M4 10c4 1 8 1 13-1M4.5 15c5 1 9 0 14-3M9 3.5c-1 4 0 8 3 11" stroke="var(--background)" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  );
}

type Companion = {
  Icon: (p: { className?: string }) => React.ReactElement;
  position: string;
  size: number;
  rotate: number;
  /** How far (px) it shifts for a pointer at the viewport edge — larger = closer to the viewer. */
  depth: number;
  drift: "paw-drift" | "bone-float";
  duration: number;
  delay: number;
  tone: "brand" | "trust";
};

// Placed in the gaps of the two-column desktop hero: above/left of the badge,
// between the headline and the photo, under the CTA row, and around the
// photo card — never over the copy.
const COMPANIONS: Companion[] = [
  { Icon: Ball, position: "top-[13%] left-[3%]", size: 34, rotate: -12, depth: 22, drift: "paw-drift", duration: 19, delay: 0, tone: "brand" },
  { Icon: Feather, position: "top-[26%] left-[47%]", size: 40, rotate: 28, depth: 34, drift: "bone-float", duration: 13, delay: 2, tone: "trust" },
  { Icon: Bone, position: "top-[72%] left-[1.5%]", size: 44, rotate: -22, depth: 16, drift: "bone-float", duration: 15, delay: 5, tone: "brand" },
  { Icon: Fish, position: "top-[9%] right-[5%]", size: 38, rotate: -8, depth: 28, drift: "paw-drift", duration: 21, delay: 3, tone: "trust" },
  { Icon: Yarn, position: "top-[80%] right-[3%]", size: 32, rotate: 15, depth: 20, drift: "paw-drift", duration: 17, delay: 7, tone: "brand" },
];

function Drifter({
  companion,
  nx,
  ny,
  still,
}: {
  companion: Companion;
  nx: MotionValue<number>;
  ny: MotionValue<number>;
  still: boolean;
}) {
  const { Icon, position, size, rotate, depth, drift, duration, delay, tone } = companion;
  const x = useTransform(nx, (v) => v * depth);
  const y = useTransform(ny, (v) => v * depth * 0.7);

  return (
    <m.div
      className={cn("absolute", position)}
      style={still ? undefined : { x, y }}
    >
      <div
        className={cn(
          tone === "brand" ? "text-brand-ink" : "text-trust",
          !still && `motion-safe:animate-${drift}`,
        )}
        style={{
          width: size,
          height: drift === "bone-float" && Icon === Bone ? size / 2 : size,
          rotate: `${rotate}deg`,
          opacity: 0.32,
          animationDuration: `${duration}s`,
          animationDelay: `${delay}s`,
        }}
      >
        <Icon className="size-full" />
      </div>
    </m.div>
  );
}

/**
 * "Zero-gravity" companions drifting around the hero — a ball, feather, bone,
 * fish and yarn, each on its own CSS keyframe, plus a light pointer parallax
 * so the layer reads as having depth.
 *
 * One pointermove listener feeds two motion values; nothing re-renders per
 * frame. Desktop only — below lg these would sit over the stacked copy.
 */
export function HeroCompanions() {
  const reduced = useReducedMotion();
  const nx = useMotionValue(0);
  const ny = useMotionValue(0);
  const sx = useSpring(nx, { stiffness: 60, damping: 18, mass: 0.8 });
  const sy = useSpring(ny, { stiffness: 60, damping: 18, mass: 0.8 });

  useEffect(() => {
    if (reduced) return;
    if (!window.matchMedia("(pointer: fine)").matches) return;
    const onMove = (event: PointerEvent) => {
      nx.set((event.clientX / window.innerWidth) * 2 - 1);
      ny.set((event.clientY / window.innerHeight) * 2 - 1);
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    return () => window.removeEventListener("pointermove", onMove);
  }, [reduced, nx, ny]);

  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10 hidden overflow-hidden lg:block">
      {COMPANIONS.map((companion, i) => (
        <Drifter key={i} companion={companion} nx={sx} ny={sy} still={Boolean(reduced)} />
      ))}
    </div>
  );
}
