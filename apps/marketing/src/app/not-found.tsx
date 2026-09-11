import { Compass, PawPrint, Search } from "lucide-react";
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

/** App-wide 404 — must live at the app root; Next allows only one. */
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
        <span className="glass inline-flex items-center gap-2 rounded-full px-3.5 py-1.5 text-xs font-semibold tracking-wide text-brand-ink uppercase">
          <Search className="size-3.5" aria-hidden="true" />
          404 — the path disappeared
        </span>

        {/* Trimmed to the walk cycle's repeat point so the loop is seamless. */}
        <Image
          src="/404-puppy-search.webp"
          alt="A puppy sniffing along the ground, searching for a lost trail"
          width={340}
          height={272}
          priority
          unoptimized
          className="mt-4 h-40 w-auto object-contain sm:h-48 motion-reduce:hidden"
        />
        <Image
          src="/404-puppy-still.webp"
          alt="A puppy sniffing along the ground, searching for a lost trail"
          width={340}
          height={272}
          className="mt-4 hidden h-40 w-auto object-contain sm:h-48 motion-reduce:block"
        />

        <h1 className="mt-5 text-hero font-semibold">Looks like we lost the footprints.</h1>

        <p className="mt-4 max-w-md text-lg leading-relaxed text-ink-soft">
          We followed the paw prints this far, but they suddenly disappeared.
          This page may have wandered off somewhere else.
        </p>

        <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
          <Link
            href="/"
            className="relative inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-brand px-7 text-base font-semibold text-white shadow-soft transition-colors duration-200 hover:bg-brand-ink"
          >
            <PawPrint className="size-4" aria-hidden="true" />
            Back to Home
          </Link>
          <Link
            href={`/${cta.secondaryHref}`}
            className="relative inline-flex min-h-11 items-center justify-center gap-2 rounded-full border border-border bg-card px-7 text-base font-semibold text-ink transition-colors duration-200 hover:bg-accent"
          >
            <Compass className="size-4" aria-hidden="true" />
            Explore MeetMyPets
          </Link>
        </div>

        <p className="mt-10 flex items-center gap-1.5 text-xs tracking-wide text-ink-soft uppercase">
          <PawPrint className="size-3.5 text-brand-ink" aria-hidden="true" />
          404 — the path disappeared
        </p>
      </main>
    </div>
  );
}
