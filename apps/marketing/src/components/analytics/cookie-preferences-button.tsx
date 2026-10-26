"use client";

import { OPEN_PREFERENCES } from "@/lib/analytics";

/**
 * Reopens the consent banner. Withdrawing has to be as easy as giving consent
 * (privacy §5), so this lives in the footer on every page.
 */
export function CookiePreferencesButton({ className }: { className?: string }) {
  return (
    <button
      type="button"
      onClick={() => window.dispatchEvent(new Event(OPEN_PREFERENCES))}
      className={className}
    >
      Cookie preferences
    </button>
  );
}
