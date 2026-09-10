import { cn } from "@/lib/utils";

/**
 * Running-dog loading indicator for the waitlist submit buttons — inline SVG
 * driven by CSS keyframes, so it costs nothing to load and inherits
 * `currentColor`. Pass `animate={false}` under reduced motion for a static pose.
 */
export function DogRunLoader({
  className,
  animate = true,
}: {
  className?: string;
  animate?: boolean;
}) {
  return (
    <svg
      viewBox="0 0 32 20"
      fill="none"
      aria-hidden="true"
      className={cn("size-5 shrink-0", animate && "motion-safe:animate-dog-run", className)}
    >
      {/* Body + head */}
      <path
        d="M6 12c0-3 2.5-5 6-5h4.5c2 0 3.5-1.2 4.5-2.8.5-.8 1.7-.6 1.8.3l.2 2c1.6.3 2.8 1 3.5 2 .3.4-.1 1-.6.8-.9-.3-1.7-.3-2.4 0-.6.3-1 .9-1 1.7 0 2.5-2 4-4.5 4H11c-2.8 0-5-1.8-5-4Z"
        fill="currentColor"
      />
      {/* Ear */}
      <path d="M20 4.5c.6-1 1.4-1.8 2.3-2.3-.2 1-.1 2 .3 2.9-.9.1-1.8-.1-2.6-.6Z" fill="currentColor" />
      {/* Tail, wags on the same cycle as the legs */}
      <path
        d="M6.5 10.5c-1.5-.8-2.8-.6-3.8.3"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        className={animate ? "origin-[6.5px_10.5px] motion-safe:animate-dog-tail" : undefined}
      />
      {/* Front legs */}
      <path
        d="M12 16.5 12 13M15.5 16.5 15.5 13"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        className={animate ? "motion-safe:animate-dog-leg-a" : undefined}
      />
      {/* Back legs */}
      <path
        d="M19 16.5 19 13M22.5 16.5 22.5 13"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        className={animate ? "motion-safe:animate-dog-leg-b" : undefined}
      />
    </svg>
  );
}
