/**
 * Large, soft colour fields that live in the desktop side margins, slowly
 * drifting. They exist because at ≥1280px the content column leaves a wide
 * strip of bare canvas on each side of every section, and a page-level
 * gradient alone was too faint to read as anything.
 *
 * Positioned along <main> by percentage so they distribute across the whole
 * page length regardless of how many sections it has. Each one is mostly
 * off-canvas — centred a few rem inside the viewport edge — so its bulk
 * sits in the margin and only its feathered edge reaches under content.
 *
 * Performance: no `filter: blur` (the radial gradient's own falloff is the
 * softness) and transform-only animation, so this is six compositor layers
 * that never trigger layout or paint. `motion-safe:` gates the drift for
 * reduced-motion visitors, who still get the static colour.
 *
 * Server Component, `lg:` only, aria-hidden, behind everything (-z-20 sits
 * under each section's own -z-10 wash so those still layer on top).
 */

type Blob = {
  top: string;
  side: "left" | "right";
  size: string;
  color: string;
  delay: number;
};

const BLOBS: Blob[] = [
  { top: "5%", side: "left", size: "34rem", color: "var(--brand-soft)", delay: 0 },
  { top: "21%", side: "right", size: "30rem", color: "var(--trust-soft)", delay: 6 },
  { top: "40%", side: "left", size: "28rem", color: "var(--trust-soft)", delay: 12 },
  { top: "57%", side: "right", size: "36rem", color: "var(--brand-soft)", delay: 3 },
  { top: "75%", side: "left", size: "30rem", color: "var(--brand-soft)", delay: 9 },
  { top: "90%", side: "right", size: "26rem", color: "var(--trust-soft)", delay: 15 },
];

export function MarginBlobs() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 -z-20 hidden overflow-hidden lg:block"
    >
      {BLOBS.map((blob, i) => (
        <div
          key={i}
          className="absolute rounded-full motion-safe:animate-blob-drift"
          style={{
            top: blob.top,
            [blob.side]: `calc(${blob.size} / -2.4)`,
            width: blob.size,
            height: blob.size,
            background: `radial-gradient(circle at center, ${blob.color} 0%, color-mix(in oklab, ${blob.color} 55%, transparent) 38%, transparent 70%)`,
            animationDelay: `${blob.delay}s`,
            animationDuration: `${24 + i * 3}s`,
          }}
        />
      ))}
    </div>
  );
}
