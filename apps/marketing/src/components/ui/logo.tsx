import Image from "next/image";

import { cn } from "@/lib/utils";
import { site } from "@/config/site";

/** Inline paw glyph — the only mark that inherits currentColor. */
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

/** Brand lockup: supplied artwork for both halves, so neither depends on a webfont. */
export function Logo({ className }: { className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      {/* Decorative: the wordmark beside it carries the name for assistive tech. */}
      <Image
        src="/brand-mark.png"
        alt=""
        aria-hidden="true"
        width={144}
        height={144}
        // In the header on every page, so it must not arrive late.
        priority
        className="size-9 shrink-0"
      />
      {/* Intrinsic 850x144; height is fixed and width follows the 5.9:1 ratio. */}
      <Image
        src="/brand-wordmark.png"
        alt={site.name}
        width={850}
        height={144}
        priority
        className="h-5 w-auto shrink-0 sm:h-6"
      />
    </span>
  );
}
