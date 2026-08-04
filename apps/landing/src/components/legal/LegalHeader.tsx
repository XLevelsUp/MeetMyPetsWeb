import { ArrowLeft } from "lucide-react";

import { Logo } from "@/components/ui/logo";

/**
 * Header for the legal pages.
 *
 * Deliberately not the marketing header: that one's nav is entirely in-page
 * anchors (#features, #ecosystem) which do not exist here and would dead-end.
 * This gives one unambiguous way back to the site instead.
 *
 * Server Component — no interactivity, so no JS ships for it.
 */
export function LegalHeader() {
  return (
    <header className="sticky top-0 z-50 border-b border-border bg-background/85 backdrop-blur-md">
      <div className="section-shell flex h-16 items-center justify-between gap-4">
        <a href="/" className="rounded-lg" aria-label="MeetMyPets home">
          <Logo />
        </a>
        <a
          href="/"
          className="inline-flex min-h-11 items-center gap-2 rounded-full px-4 text-sm font-medium text-ink-soft transition-colors hover:bg-accent hover:text-ink"
        >
          <ArrowLeft className="size-4" aria-hidden="true" />
          Back to site
        </a>
      </div>
    </header>
  );
}
