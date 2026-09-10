"use client";

import { useReducedMotion } from "motion/react";
import { PawPrint } from "lucide-react";

import { cn } from "@/lib/utils";

/* Inline bone SVG — 12×6px silhouette, same single-colour technique as
   DogRunLoader. No external asset, just a path. */
function BoneIcon({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <svg
      viewBox="0 0 24 12"
      fill="none"
      aria-hidden="true"
      className={className}
      style={style}
    >
      <path
        d="M6.5 2.5a2.5 2.5 0 0 0-4.8 1A2.5 2.5 0 0 0 4 7.5L7 6l10 0 3-1.5a2.5 2.5 0 0 0 2.3 4 2.5 2.5 0 0 0-4.8-1H6.5Z"
        fill="currentColor"
      />
    </svg>
  );
}

/**
 * Scatter of paw prints and bones, each animated with CSS keyframes, laid
 * over the feature-bento section. Entirely compositor-driven — the React
 * tree is static once mounted, and the CSS handles all motion.
 *
 * Each element gets a different `animation-delay` so they drift out of phase
 * rather than moving in lockstep. Opacity stays very low (0.04–0.10 via the
 * paw-pulse keyframe) so they read as texture, not content.
 *
 * Under `prefers-reduced-motion` nothing renders — the section's existing
 * static PawScatter is the fallback.
 */

type DriftPaw = {
  /** Tailwind position classes (top/left/right/bottom). */
  position: string;
  size: number;
  /** rotation at rest */
  rotate: number;
  /** stagger delay in seconds */
  delay: number;
};

type DriftBone = {
  position: string;
  size: number;
  rotate: number;
  delay: number;
};

const PAWS: DriftPaw[] = [
  { position: "top-[8%] left-[6%]",       size: 38, rotate: 15,  delay: 0 },
  { position: "top-[18%] right-[10%]",     size: 28, rotate: -20, delay: 3.5 },
  { position: "top-[45%] left-[2%]",       size: 44, rotate: 8,   delay: 6 },
  { position: "bottom-[22%] right-[5%]",   size: 34, rotate: -12, delay: 9 },
  { position: "bottom-[10%] left-[12%]",   size: 26, rotate: 25,  delay: 12 },
  { position: "top-[65%] right-[15%]",     size: 32, rotate: -30, delay: 15 },
];

const BONES: DriftBone[] = [
  { position: "top-[30%] right-[3%]",     size: 20, rotate: 35,  delay: 2 },
  { position: "bottom-[35%] left-[8%]",   size: 16, rotate: -15, delay: 7 },
  { position: "top-[70%] right-[20%]",    size: 18, rotate: 50,  delay: 11 },
];

export function FloatingPetBg({ className }: { className?: string }) {
  const reduced = useReducedMotion();

  /* Under reduced motion, don't render anything — the section's existing
     static PawScatter provides the non-animated fallback. */
  if (reduced) return null;

  return (
    <div
      aria-hidden="true"
      className={cn(
        "pointer-events-none absolute inset-0 -z-10 overflow-hidden",
        className,
      )}
    >
      {PAWS.map((paw, i) => (
        <PawPrint
          key={`paw-${i}`}
          className={cn(
            "absolute text-brand-ink motion-safe:animate-paw-drift",
            paw.position,
          )}
          style={{
            width: paw.size,
            height: paw.size,
            rotate: `${paw.rotate}deg`,
            animationDelay: `${paw.delay}s`,
            /* paw-pulse drives opacity; start at the keyframe's low value
               so the first frame isn't a flash. */
            opacity: 0.1,
            animation: `paw-drift ${18 + i * 1.5}s ease-in-out ${paw.delay}s infinite, paw-pulse 6s ease-in-out ${paw.delay + 1}s infinite`,
          }}
        />
      ))}

      {BONES.map((bone, i) => (
        <BoneIcon
          key={`bone-${i}`}
          className={cn(
            "absolute text-brand-ink",
            bone.position,
          )}
          style={{
            width: bone.size,
            height: bone.size / 2,
            rotate: `${bone.rotate}deg`,
            opacity: 0.12,
            animation: `bone-float ${12 + i * 2}s ease-in-out ${bone.delay}s infinite, paw-pulse 8s ease-in-out ${bone.delay + 2}s infinite`,
          }}
        />
      ))}
    </div>
  );
}
