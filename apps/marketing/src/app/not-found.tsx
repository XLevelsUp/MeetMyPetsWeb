import { Compass, Home, PawPrint, Search } from "lucide-react";
import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";

import { Logo } from "@/components/ui/logo";
import { PawScatter } from "@/components/ui/paw-scatter";
import { cta } from "@/config/site";

export const metadata: Metadata = {
  title: "Page not found",
  robots: { index: false, follow: true },
};

/**
 * App-wide 404. Placed at the app root (not inside a route group), so it
 * catches every unmatched path across the marketing site and legal pages
 * alike — Next.js only allows one `not-found.tsx` per root layout.
 *
 * Server Component: nothing here needs interactivity, so it ships zero
 * client JS — appropriate for a page whose only job is "get the visitor
 * back on track," not entertain them at the cost of extra hydration.
 */
export default function NotFound() {
  return (
    <div className="relative flex min-h-screen flex-col overflow-hidden">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 -z-10"
        style={{
          background:
            "radial-gradient(60rem 32rem at 12% -8%, var(--brand-soft), transparent 60%), radial-gradient(48rem 28rem at 92% 4%, var(--trust-soft), transparent 62%)",
        }}
      />
      <PawScatter
        paws={[
          { className: "top-20 left-[8%] size-14 rotate-[-16deg]" },
          { className: "bottom-24 left-[4%] size-10 rotate-[10deg]" },
          { className: "top-32 right-[10%] size-12 rotate-[22deg]" },
          { className: "bottom-16 right-[6%] size-16 rotate-[-8deg]" },
        ]}
      />

      <header className="section-shell flex h-16 items-center sm:h-18">
        <Link href="/" className="rounded-lg" aria-label="MeetMyPets home">
          <Logo />
        </Link>
      </header>

      <main id="main" className="section-shell flex flex-1 flex-col items-center justify-center py-16 text-center">
        <div className="relative">
          <Image
            src="/MMP Dog 02.webp"
            alt="A beagle peeking over the edge, looking for something"
            width={640}
            height={480}
            priority
            className="h-40 w-auto object-contain drop-shadow-lg sm:h-48"
          />
        </div>

        <span className="glass mt-2 inline-flex items-center gap-2 rounded-full px-3.5 py-1.5 text-xs font-semibold tracking-wide text-brand-ink uppercase">
          <Search className="size-3.5" aria-hidden="true" />
          404 — gone walkies
        </span>

        <h1 className="mt-5 text-hero font-semibold">This page slipped its leash.</h1>

        <p className="mt-4 max-w-md text-lg leading-relaxed text-ink-soft">
          We sniffed around but couldn&apos;t track down that page. It may have
          moved, been renamed, or wandered off entirely.
        </p>

        <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
          <Link
            href="/"
            className="relative inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-brand px-7 text-base font-semibold text-white shadow-soft transition-colors duration-200 hover:bg-brand-ink"
          >
            <Home className="size-4" aria-hidden="true" />
            Back to home
          </Link>
          <Link
            href={`/${cta.secondaryHref}`}
            className="relative inline-flex min-h-11 items-center justify-center gap-2 rounded-full border border-border bg-card px-7 text-base font-semibold text-ink transition-colors duration-200 hover:bg-accent"
          >
            <Compass className="size-4" aria-hidden="true" />
            Explore the ecosystem
          </Link>
        </div>

        <p className="mt-10 flex items-center gap-1.5 text-xs text-ink-soft">
          <PawPrint className="size-3.5 text-brand-ink" aria-hidden="true" />
          Error code 404 · Page not found
        </p>
      </main>
    </div>
  );
}
