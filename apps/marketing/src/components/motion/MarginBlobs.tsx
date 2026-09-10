/**
 * Soft colour fields drifting in the desktop side margins, where the content
 * column leaves bare canvas at >=1280px.
 *
 * No `filter: blur` — the radial gradient's own falloff is the softness — and
 * transform-only animation, so these are compositor layers that never repaint.
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
