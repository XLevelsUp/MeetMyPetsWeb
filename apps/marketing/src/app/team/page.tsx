import { ArrowRight } from "lucide-react";
import type { Metadata } from "next";
import Image from "next/image";

import { Reveal } from "@/components/motion/Reveal";
import { WordReveal } from "@/components/motion/WordReveal";
import { PawScatter } from "@/components/ui/paw-scatter";
import { TeamTiers } from "@/components/sections/team-tiers";
import { WaveDivider } from "@/components/ui/wave-divider";
import { site, team } from "@/config/site";

const DESCRIPTION =
  "Meet the people building MeetMyPets — the founders, the team, and the three pets who supervise all of it.";

export const metadata: Metadata = {
  title: "Our Team",
  description: DESCRIPTION,
  alternates: { canonical: "/team/" },
  openGraph: {
    type: "website",
    url: "/team/",
    title: `Our Team — ${site.name}`,
    description: DESCRIPTION,
    // A page-level `openGraph` REPLACES the root layout's wholesale (see csae-policy/page.tsx).
    siteName: site.name,
    locale: site.locale,
  },
  robots: { index: true, follow: true },
};

export default function TeamPage() {
  const { cutout, pets, cta } = team;

  return (
    <>
      {/* ── 1. Hero ── */}
      {/* Desktop keeps full editorial stage (lg:min-h-screen); mobile & tab tighten space between headline and image */}
      <section className="relative flex w-full flex-col justify-end overflow-hidden pt-16 pb-0 sm:pt-20 md:pt-24 lg:pt-24">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 -z-10"
          style={{
            background:
              "radial-gradient(80rem 48rem at 50% 10%, var(--brand-soft), transparent 75%), var(--background)",
          }}
        />
        <PawScatter
          paws={[
            { className: "top-[12%] left-[4%] -rotate-[14deg]", size: 54 },
            { className: "top-[18%] right-[5%] rotate-[16deg]", size: 48 },
          ]}
        />

        {/* Headline: On mobile & tablet, "The People" and "Behind the Paws" are stacked together in one clean block (matching Image 2).
            On desktop (lg+), "The People" is at top, and "Behind the Paws" is layered across the lower sofa stage. */}
        <div className="pointer-events-none relative z-20 px-4 text-center select-none">
          <Reveal variant="floaty">
            <p className="mb-1.5 text-xs font-bold tracking-[0.2em] text-brand uppercase sm:mb-2 md:mb-2.5 lg:mb-3">
              {team.eyebrow}
            </p>
            <h1 className="font-heading text-[clamp(2.15rem,7.5vw,4.5rem)] leading-[0.94] font-extrabold tracking-[-0.03em] text-balance text-ink lg:text-[clamp(2.5rem,7.5vw,8.5rem)] lg:leading-[0.92]">
              <span className="block">{team.titleLead}</span>
              <span className="block text-brand lg:hidden">{team.titleAccent}</span>
              <span className="sr-only lg:not-sr-only lg:hidden"> {team.titleAccent}</span>
            </h1>
          </Reveal>
        </div>

        {/* Image Stage:
            On mobile & tablet: tight spacing right beneath "Behind the Paws" with zero overlay over people.
            On desktop (lg+): preserved pull-up with "Behind the Paws" across the sofa. */}
        <div className="pointer-events-none relative z-10 mt-1 flex w-full items-end justify-center px-2 sm:mt-2 sm:px-4 md:mt-3 lg:-mt-12 lg:px-0 xl:-mt-16">
          {/* Desktop-only: "Behind the Paws" sits across the sofa/legs at lg:bottom-[34%] */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-x-0 bottom-[34%] z-20 hidden px-4 text-center select-none lg:block"
          >
            <Reveal variant="floaty" delay={0.12}>
              <span className="mx-auto block max-w-[min(100%,72rem)] font-heading text-[clamp(2.5rem,7.5vw,8.5rem)] leading-[0.92] font-extrabold tracking-[-0.03em] text-balance text-brand">
                {team.titleAccent}
              </span>
            </Reveal>
          </div>

          <Image
            src={cutout.src}
            alt={cutout.alt}
            width={4979}
            height={3299}
            priority
            quality={95}
            sizes="(min-width: 1440px) 1440px, (min-width: 1024px) 100vw, 100vw"
            className="h-auto w-full max-w-full select-none lg:w-full"
          />
        </div>
      </section>

      {/* ── Intro Callout ── */}
      <section className="relative border-b border-border/60 bg-secondary/30 py-10 sm:py-12 text-center">
        <div className="section-shell">
          <WordReveal
            text={`“${team.intro}”`}
            className="mx-auto max-w-2xl text-lg font-medium leading-relaxed text-balance text-ink sm:text-xl"
          />
        </div>
      </section>

      <TeamTiers />

      {/* ── 5. The pets — the only tier with photos, so it reads as the payoff ── */}
      <section className="relative scroll-mt-24 overflow-hidden bg-secondary/40 py-10 sm:py-11 lg:py-12">
        <PawScatter
          paws={[
            { className: "top-[8%] right-[5%] rotate-[14deg]", size: 52 },
            { className: "bottom-[10%] left-[4%] -rotate-[12deg]", size: 58 },
          ]}
        />
        <div className="section-shell">
          <Reveal className="text-center">
            <h2 className="font-heading text-3xl font-bold tracking-tight uppercase sm:text-4xl">
              <span className="text-ink">And The </span>
              <span className="text-brand">Real Bosses</span>
            </h2>
            <p className="mx-auto mt-2 max-w-xl text-sm text-ink-soft sm:text-base">{pets.lede}</p>
          </Reveal>

          {/* Pets get a squat landscape tile, so the row never reads as a fourth human tier. */}
          <ul className="mt-10 grid grid-cols-1 items-stretch gap-6 sm:grid-cols-2 md:grid-cols-3 lg:gap-8">
            {pets.members.map((pet, i) => (
              <Reveal as="li" key={pet.name} delay={i * 0.1} variant="springy" className="h-full">
                <div className="clay-card group flex h-full flex-col overflow-hidden rounded-[1.75rem] bg-card transition-[transform,box-shadow] duration-300 ease-out hover:-translate-y-1.5 hover:clay-card-hover sm:rounded-[2rem]">
                  {/* Portraits at 3:4 and object-contain: the source photos are 0.75, so a landscape crop cut the pets in half. */}
                  <div className="relative aspect-[3/4] w-full shrink-0 overflow-hidden bg-brand-soft/40">
                    <Image
                      src={pet.photo.src}
                      alt={pet.photo.alt}
                      fill
                      sizes="(min-width: 1024px) 21rem, (min-width: 640px) 45vw, 90vw"
                      className="object-contain object-bottom transition-transform duration-700 ease-out group-hover:scale-[1.04]"
                    />
                    <span className="pointer-events-none absolute top-3 left-1/2 -translate-x-1/2 rounded-full bg-card px-3 py-1 text-[10px] font-bold tracking-[0.14em] text-brand-ink uppercase shadow-soft">
                      {pet.abbr}
                    </span>
                  </div>

                  <div className="flex flex-1 flex-col px-5 pt-4 pb-2 text-center">
                    <h3 className="font-heading text-xl font-bold text-ink sm:text-2xl">
                      {pet.name}
                    </h3>
                    <p className="mt-1 text-[10px] font-bold tracking-[0.18em] text-brand uppercase">
                      {pet.role}
                    </p>
                    <p className="mt-3 text-sm leading-relaxed text-ink-soft">{pet.body}</p>
                  </div>
                </div>
              </Reveal>
            ))}
          </ul>
        </div>

        <WaveDivider flip color="color-mix(in oklab, var(--secondary) 40%, var(--background))" />
        <WaveDivider color="var(--background)" />
      </section>

      {/* ── 6. Closing CTA ── */}
      <section className="relative scroll-mt-24 py-10 text-center sm:py-11 lg:py-12">
        <div className="section-shell">
          <Reveal>
            <h2 className="font-heading text-3xl leading-tight font-bold text-balance sm:text-4xl">
              {cta.title}
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-lg leading-relaxed text-ink-soft">
              {cta.body}
            </p>
            <a
              href={cta.href}
              className="group mt-8 inline-flex min-h-12 items-center gap-2 rounded-full bg-brand px-8 py-3.5 text-sm font-bold text-white shadow-lift transition-all duration-200 hover:bg-brand-ink hover:shadow-float focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
            >
              {cta.label}
              <ArrowRight
                className="size-4 transition-transform duration-200 group-hover:translate-x-0.5"
                aria-hidden="true"
              />
            </a>
          </Reveal>
        </div>
      </section>
    </>
  );
}
