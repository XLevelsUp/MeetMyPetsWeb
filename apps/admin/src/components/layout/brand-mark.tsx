import { cn } from "@/lib/utils";

/**
 * The MeetMyPets heart-loop mark (public/brand-mark.png, from the app-icon
 * pack's bare-mark layer).
 *
 * Drawn as a CSS mask filled with a theme colour rather than as an <img>:
 * the source artwork is navy, which vanishes on the dark theme. The
 * mask takes the shape and the caller's `bg-*` class supplies the colour, so
 * it follows light/dark like the text beside it. Decorative — the product
 * name is always rendered next to it as real text.
 */
export function BrandMark({ className }: { className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={cn("inline-block shrink-0 bg-foreground", className)}
      style={{
        maskImage: "url(/brand-mark.png)",
        WebkitMaskImage: "url(/brand-mark.png)",
        maskSize: "contain",
        WebkitMaskSize: "contain",
        maskRepeat: "no-repeat",
        WebkitMaskRepeat: "no-repeat",
        maskPosition: "center",
        WebkitMaskPosition: "center",
      }}
    />
  );
}
