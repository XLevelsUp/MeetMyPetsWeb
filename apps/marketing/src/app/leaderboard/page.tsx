import { ArrowRight, PawPrint } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { Reveal } from "@/components/motion/Reveal";
import { WordReveal } from "@/components/motion/WordReveal";
import { LeaderboardBoard } from "@/components/sections/leaderboard-board";
import { PawScatter } from "@/components/ui/paw-scatter";
import { WaveDivider } from "@/components/ui/wave-divider";
import { leaderboard, site } from "@/config/site";

const DESCRIPTION =
  "See the most popular pets on MeetMyPets right now — ranked by likes, follows and matches, updated every 30 minutes.";

export const metadata: Metadata = {
  title: "Pet Leaderboard",
  description: DESCRIPTION,
  alternates: { canonical: "/leaderboard/" },
  openGraph: {
    type: "website",
    url: "/leaderboard/",
    title: `Pet Leaderboard — ${site.name}`,
    description: DESCRIPTION,
    // A page-level `openGraph` REPLACES the root layout's wholesale (see csae-policy/page.tsx).
    siteName: site.name,
    locale: site.locale,
  },
  robots: { index: true, follow: true },
};

export default function LeaderboardPage() {
  return (
    <>
      {/* ── 1. Hero ── */}
      <section className="relative scroll-mt-24 overflow-hidden pt-28 pb-10 sm:pt-36 sm:pb-14">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 -z-10"
          style={{
            background:
              "radial-gradient(46rem 28rem at 50% -10%, var(--brand-soft), transparent 70%)",
          }}
        />
        <PawScatter
          paws={[
            { className: "top-[20%] left-[5%] -rotate-[14deg]", size: 54 },
            { className: "bottom-[16%] right-[6%] rotate-[16deg]", size: 46 },
          ]}
        />

        <div className="section-shell text-center">
          <Reveal>
            <p className="text-xs font-semibold tracking-[0.14em] text-brand-ink uppercase">
              {leaderboard.eyebrow}
            </p>
            <h1 className="mx-auto mt-5 max-w-4xl font-heading text-[clamp(2.25rem,6vw,4.25rem)] leading-[1.05] font-bold tracking-tight text-balance">
              {leaderboard.title}
            </h1>
          </Reveal>
          <WordReveal
            text={leaderboard.intro}
            delay={0.2}
            className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-balance text-ink-soft sm:text-xl"
          />
        </div>
      </section>

      {/* ── 2. The board ── */}
      <section className="relative scroll-mt-24 pb-0">
        <LeaderboardBoard />
      </section>

      {/* ── 3. Closing CTA ── */}
      <section className="relative scroll-mt-24 overflow-hidden bg-brand py-12 text-center sm:py-14">
        <PawScatter
          paws={[
            { className: "top-[16%] left-[8%] -rotate-[18deg]", size: 68 },
            { className: "bottom-[14%] right-[9%] rotate-[14deg]", size: 56 },
          ]}
          opacity={0.12}
        />
        <WaveDivider flip color="var(--background)" />
        <div className="section-shell">
          <Reveal>
            <h2 className="font-heading text-3xl leading-tight font-bold text-balance text-white sm:text-4xl">
              Want Your Pet On This Board?
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-lg leading-relaxed text-white/85">
              Create a profile, make a few friends, and watch them climb.
            </p>
            <Link
              href={leaderboard.cta.href}
              target="_blank"
              rel="noopener noreferrer"
              className="group mt-8 inline-flex min-h-12 items-center gap-2 rounded-full bg-white px-8 py-3.5 text-sm font-bold text-brand-ink shadow-lift transition-all duration-200 hover:shadow-float focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
            >
              <PawPrint className="size-4" aria-hidden="true" />
              {leaderboard.cta.label}
              <ArrowRight
                className="size-4 transition-transform duration-200 group-hover:translate-x-0.5"
                aria-hidden="true"
              />
            </Link>
          </Reveal>
        </div>
      </section>
    </>
  );
}
