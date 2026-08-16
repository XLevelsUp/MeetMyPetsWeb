import { cn } from "@/lib/utils";
import { site } from "@/config/site";

/**
 * Placeholder brand mark — an inline SVG paw, drawn rather than imported.
 *
 * Inline keeps it zero-request and colourable via currentColor, and avoids
 * shipping a raster logo that would blur on retina. Swap for the real asset
 * when brand delivers one; only this file needs to change.
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

export function Logo({ className }: { className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-2", className)}>
      <span className="grid size-9 place-items-center rounded-xl bg-brand p-1.5 text-white">
        <PawMark />
      </span>
      <span className="font-heading text-lg font-semibold tracking-tight">{site.name}</span>
    </span>
  );
}
