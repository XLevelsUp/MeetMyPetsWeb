import { copy } from "@/config/admin";

/**
 * System status — a config-driven stub in Phase 1 (no live probe). The
 * pulse dot is decorative; the label carries the information.
 */
export function StatusIndicator() {
  return (
    <span className="flex items-center gap-2 text-xs text-muted-foreground">
      <span aria-hidden className="relative flex size-2">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-verified opacity-60" />
        <span className="relative inline-flex size-2 rounded-full bg-verified" />
      </span>
      {copy.systemStatus.label}
    </span>
  );
}
