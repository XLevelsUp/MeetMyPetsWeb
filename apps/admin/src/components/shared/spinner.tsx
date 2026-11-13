import { Loader2 } from "lucide-react";

import { copy } from "@/config/admin";
import { cn } from "@/lib/utils";

const SIZES = {
  sm: "size-3.5",
  md: "size-4",
  lg: "size-6",
} as const;

/**
 * The one spinner. Every surface imports this rather than reaching for
 * `Loader2` and picking its own size, so a slow save looks the same wherever
 * it happens.
 *
 * `role="status"` with a visually hidden label: a bare spinning icon announces
 * nothing to a screen reader, and `aria-hidden` on it would leave the busy
 * state silent entirely.
 */
export function Spinner({
  size = "md",
  className,
  label,
}: {
  size?: keyof typeof SIZES;
  className?: string;
  label?: string;
}) {
  return (
    <span role="status" className="inline-flex">
      <Loader2 className={cn(SIZES[size], "animate-spin", className)} aria-hidden="true" />
      <span className="sr-only">{label ?? copy.common.loading}</span>
    </span>
  );
}

