import Image from "next/image";

import { cn } from "@/lib/utils";
import { site } from "@/config/site";

/**
 * Original placeholder brand mark — an inline SVG paw, drawn rather than
 * imported. Superseded by the real asset in <Logo> below, but kept because it
 * is the only mark that inherits currentColor: use it anywhere the glyph has
 * to take the colour of its surroundings (a single-colour print context, a
 * monochrome favicon fallback, an icon inside a filled button).
 */
export function PawMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 32 32"
      fill="none"
      aria-hidden="true"
      className={cn("size-full", className)}
    >
      <ellipse cx="9.4" cy="10.6" rx="3.5" ry="4.4" transform="rotate(-18 9.4 10.6)" fill="currentColor" />
      <ellipse cx="16" cy="8.2" rx="3.4" ry="4.6" fill="currentColor" />
      <ellipse cx="22.6" cy="10.6" rx="3.5" ry="4.4" transform="rotate(18 22.6 10.6)" fill="currentColor" />
      <path
        d="M16 15.4c4.2 0 7.6 3 7.6 6.6 0 2.6-2 4.4-4.6 4.4-1.2 0-2.1-.35-3-.35s-1.8.35-3 .35c-2.6 0-4.6-1.8-4.6-4.4 0-3.6 3.4-6.6 7.6-6.6Z"
        fill="currentColor"
      />
    </svg>
  );
}

/**
 * The brand lockup used in the header and footer.
 *
 * next/image, not a plain <img>: the source is an 87KB 512px PNG and this
 * renders at 36px. The optimiser serves a correctly-sized WebP instead, which
 * matters because the mark sits in the header of every page. (This was a plain
 * <img> while the app was a static export and had no optimiser; dropping
 * `output: "export"` for the Instagram proxy made next/image work here.)
 *
 * No coloured tile behind it. The old placeholder was a white paw that needed
 * a brand-orange plate to read at all; this mark supplies its own gradient,
 * and a plate would clash with it.
 */
export function Logo({ className }: { className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      {/* Decorative: the wordmark beside it already names the brand, so an
          alt here would make screen readers announce "MeetMyPets" twice. */}
      <Image
        src="/brand-mark.png"
        alt=""
        aria-hidden="true"
        width={72}
        height={72}
        // In the header on every page, so it must not arrive late.
        priority
        className="size-9 shrink-0"
      />
      {/* Love Ya Like A Sister. Its lowercase runs small and its strokes are
          thin, so it needs a size bump and normal weight to sit level with the
          mark — font-semibold on a handwritten face just muddies it. */}
      <span className="font-wordmark text-2xl leading-none text-ink">{site.name}</span>
    </span>
  );
}
