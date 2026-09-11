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

/** Brand lockup — next/image because the source is an 87KB PNG rendered at 36px. */
export function Logo({ className }: { className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      {/* Decorative: the wordmark beside it already names the brand, so an
          alt here would make screen readers announce "MeetMyPets" twice. */}
      <Image
        src="/brand-mark.webp"
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
