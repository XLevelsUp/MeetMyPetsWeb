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
 * The mark is served from /brand-mark.svg rather than inlined: it carries four
 * linear gradients of its own (#E50037 → #FF7A00 → #FFC107), so unlike
 * PawMark it cannot take currentColor, and inlining ~7.6KB of gradient defs
 * into every page would cost more than the one cached request it replaces.
 *
 * Plain <img>, not next/image: `images.unoptimized` is set under static
 * export, so next/image would add a wrapper and no optimisation. An SVG is
 * already resolution-independent — there is nothing to optimise.
 *
 * No coloured tile behind it any more. The old placeholder was a white paw
 * that needed a brand-orange plate to read at all; this mark supplies its own
 * colour, and a plate would clash with its gradient.
 */
export function Logo({ className }: { className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      {/* Decorative: the wordmark beside it already names the brand, so an
          alt here would make screen readers announce "MeetMyPets" twice. */}
      {/* eslint-disable-next-line @next/next/no-img-element --
          see the doc comment above: unoptimized static export, and an SVG has
          no raster variants for next/image to generate. */}
      <img
        src="/brand-mark.svg"
        alt=""
        aria-hidden="true"
        width={36}
        height={36}
        className="size-9 shrink-0"
      />
      <span className="font-heading text-lg font-semibold tracking-tight">{site.name}</span>
    </span>
  );
}
