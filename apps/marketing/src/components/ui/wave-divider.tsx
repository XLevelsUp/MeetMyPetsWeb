import { cn } from "@/lib/utils";

/**
 * Wavy SVG divider for section boundaries, so adjacent sections flow into
 * each other rather than meeting at a straight edge. One inline path, no JS.
 * `flip` mirrors it for the top edge of a section.
 */
export function WaveDivider({
  flip = false,
  color = "var(--background)",
  className,
}: {
  /** Mirror vertically — use `true` for the top edge of a section. */
  flip?: boolean;
  /** Fill colour — typically the background of the section the wave
   *  "belongs to" so it visually eats into the adjacent section. */
  color?: string;
  className?: string;
}) {
  return (
    <div
      aria-hidden="true"
      className={cn(
        "pointer-events-none absolute inset-x-0 -z-[1] h-10 sm:h-14 md:h-16 lg:h-20",
        flip ? "top-0 -translate-y-[98%]" : "bottom-0 translate-y-[98%]",
        className,
      )}
    >
      <svg
        viewBox="0 0 1440 80"
        preserveAspectRatio="none"
        fill={color}
        className={cn("block size-full", flip && "rotate-180")}
      >
        <path d="M0,48 C180,80 360,0 540,32 C720,64 900,16 1080,40 C1200,56 1320,24 1440,48 L1440,80 L0,80 Z" />
      </svg>
    </div>
  );
}
