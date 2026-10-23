import { ArrowRight, Compass, PawPrint } from "lucide-react";
import type { Metadata } from "next";

import { Reveal } from "@/components/motion/Reveal";
import { WordReveal } from "@/components/motion/WordReveal";
import { ValuesCarousel } from "@/components/sections/values-carousel";
import { PawScatter } from "@/components/ui/paw-scatter";
import { WaveDivider } from "@/components/ui/wave-divider";
import { about, site } from "@/config/site";

const DESCRIPTION =
  "MeetMyPets is a pet social platform built to bring pets and their people closer — our mission, vision and the values we build on.";

export const metadata: Metadata = {
  title: "About Us",
  description: DESCRIPTION,
  alternates: { canonical: "/about/" },
  openGraph: {
    type: "website",
    url: "/about/",
    title: `About Us — ${site.name}`,
    description: DESCRIPTION,
    // A page-level `openGraph` REPLACES the root layout's wholesale (see csae-policy/page.tsx).
    siteName: site.name,
    locale: site.locale,
  },
  robots: { index: true, follow: true },
};

/** Dotted rule with a paw in the middle — the section divider. */
function PawRule({ className }: { className?: string }) {
  return (
    <div aria-hidden="true" className={`flex items-center justify-center gap-3 ${className ?? ""}`}>
      <span className="h-px w-16 bg-[repeating-linear-gradient(90deg,var(--brand)_0_3px,transparent_3px_8px)] sm:w-24" />
      <PawPrint className="size-4 shrink-0 text-brand" />
      <span className="h-px w-16 bg-[repeating-linear-gradient(90deg,var(--brand)_0_3px,transparent_3px_8px)] sm:w-24" />
    </div>
  );
}

/** Two-tone section heading: first word plain, second in brand. */
function SplitHeading({ lead, accent }: { lead: string; accent: string }) {
  return (
    <h2 className="font-heading text-3xl font-bold tracking-tight uppercase sm:text-4xl lg:text-5xl">
      <span className="text-ink">{lead} </span>
      <span className="text-brand">{accent}</span>
    </h2>
  );
}

export default function AboutPage() {
  return (
    <>
      {/* ── 1. Hero ── */}
      <section className="relative scroll-mt-24 overflow-hidden pt-28 pb-14 sm:pt-36 sm:pb-20">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 -z-10"
          style={{
            background:
              "radial-gradient(46rem 28rem at 50% -10%, var(--brand-soft), transparent 70%)",
          }}
        />
        {/* Kept wide and low so nothing sits behind the centred copy column. */}
        <PawScatter
          paws={[
            { className: "top-[18%] left-[4%] -rotate-[14deg]", size: 56 },
            { className: "bottom-[14%] right-[5%] rotate-[16deg]", size: 48 },
          ]}
        />

        {/* Centred statement, no imagery — the headline carries the section. */}
        <div className="section-shell text-center">
          <Reveal>
            <p className="text-xs font-semibold tracking-[0.14em] text-brand-ink uppercase">
              {about.eyebrow}
            </p>
            <h1 className="mx-auto mt-5 max-w-4xl font-heading text-[clamp(2.5rem,7vw,4.5rem)] leading-[1.03] font-bold tracking-tight text-balance">
              {about.title}
            </h1>
            <PawRule className="mt-7" />
            <p className="mx-auto mt-8 max-w-2xl text-lg leading-relaxed text-ink-soft sm:text-xl">
              {about.intro}
            </p>
          </Reveal>

          <WordReveal
            text={about.closing}
            delay={0.2}
            className="mx-auto mt-8 max-w-2xl text-xl leading-snug font-semibold text-balance text-brand-ink sm:text-2xl"
          />
        </div>
      </section>

      {/* ── 2. Mission — styled 4-line statement ── */}
      <section className="relative scroll-mt-24 py-14 sm:py-20">
        {/* Soft radial glow behind the card */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 -z-10"
          style={{
            background:
              "radial-gradient(36rem 20rem at 50% 40%, var(--brand-soft), transparent 70%)",
          }}
        />
        <div className="section-shell text-center">
          <Reveal className="mx-auto max-w-3xl">
            <SplitHeading lead="Our" accent="Mission" />
          </Reveal>

          {/* Card — text in pyramid shape */}
          <Reveal variant="springy" delay={0.1} className="mx-auto mt-10 max-w-5xl">
            <div className="relative overflow-hidden rounded-[1.5rem] bg-card/80 px-6 py-10 text-center shadow-float backdrop-blur-sm sm:px-12 sm:py-14">
              {/* Soft inner glow at top */}
              <div
                aria-hidden="true"
                className="pointer-events-none absolute inset-0 -z-10"
                style={{
                  background:
                    "radial-gradient(30rem 12rem at 50% 0%, var(--brand-soft), transparent 70%)",
                }}
              />

              {/* Decorative quotation mark */}
              <span
                aria-hidden="true"
                className="pointer-events-none absolute -top-2 left-1/2 -translate-x-1/2 font-heading text-[6rem] leading-none font-bold text-brand/8 sm:text-[8rem]"
              >
                &ldquo;
              </span>

              {/* Pyramid text — each line progressively wider to form an unmistakable pyramid shape */}
              <div className="relative flex flex-col items-center gap-3 sm:gap-4">
                <Reveal delay={0.12}>
                  <p className="mx-auto max-w-xl text-center text-sm leading-relaxed tracking-wide text-ink-soft sm:text-base md:text-base">
                    Our mission is to bring pets and their people closer through meaningful connections
                  </p>
                </Reveal>
                <Reveal delay={0.20}>
                  <p className="mx-auto max-w-2xl text-center text-base leading-relaxed text-ink-soft sm:text-lg md:text-lg">
                    and compatible companions. We make it easier for every pet to discover new
                  </p>
                </Reveal>
                <Reveal delay={0.28}>
                  <p className="mx-auto max-w-3xl text-center text-base leading-relaxed text-ink-soft sm:text-lg md:text-xl">
                    friends, share joyful experiences, and explore the world together. Through
                  </p>
                </Reveal>
                <Reveal delay={0.36}>
                  <p className="mx-auto max-w-4xl text-center text-lg leading-relaxed font-bold text-brand-ink sm:text-xl md:text-2xl">
                    a welcoming community, we aim to make every pet&apos;s social life happier.
                  </p>
                </Reveal>
              </div>

              <PawRule className="mt-8" />
            </div>
          </Reveal>
        </div>
      </section>

      {/* ── 3. Vision — framed statement, deliberately unlike the mission ── */}
      <section className="relative scroll-mt-24 bg-secondary/40 py-14 sm:py-20">
        <PawScatter
          paws={[
            { className: "top-[14%] right-[6%] rotate-[12deg]", size: 46 },
            { className: "bottom-[16%] left-[5%] -rotate-[10deg]", size: 50 },
          ]}
        />
        <div className="section-shell">
          <Reveal variant="springy" className="mx-auto max-w-4xl">
            <div className="relative overflow-hidden rounded-[2rem] bg-card px-6 py-12 text-center shadow-float sm:px-12 sm:py-16">
              <div
                aria-hidden="true"
                className="pointer-events-none absolute inset-0 -z-10"
                style={{
                  background:
                    "radial-gradient(34rem 16rem at 50% 0%, var(--brand-soft), transparent 72%)",
                }}
              />
              <span className="mx-auto grid size-14 place-items-center rounded-2xl bg-trust-soft text-trust shadow-soft">
                <Compass className="size-6" aria-hidden="true" />
              </span>
              <div className="mt-5">
                <SplitHeading lead="Our" accent="Vision" />
              </div>
              <blockquote className="mx-auto mt-6 max-w-3xl font-heading text-xl leading-snug font-bold text-balance text-ink sm:text-2xl">
                {about.vision.body}
              </blockquote>
              <PawRule className="mt-6" />

              {/* What the vision means in practice — the statement alone was abstract. */}
              <ul className="mt-9 grid grid-cols-1 gap-4 text-left sm:grid-cols-3 sm:gap-5">
                {about.vision.pillars.map((pillar, i) => (
                  <Reveal as="li" key={pillar.label} delay={i * 0.08}>
                    <div className="h-full rounded-2xl bg-secondary/50 px-5 py-5">
                      <p className="flex items-center gap-2 font-semibold text-brand-ink">
                        <PawPrint className="size-4 shrink-0" aria-hidden="true" />
                        {pillar.label}
                      </p>
                      <p className="mt-2 text-sm leading-relaxed text-ink-soft">{pillar.body}</p>
                    </div>
                  </Reveal>
                ))}
              </ul>
            </div>
          </Reveal>
        </div>

        <WaveDivider flip color="color-mix(in oklab, var(--secondary) 40%, var(--background))" />
        <WaveDivider color="var(--background)" />
      </section>

      {/* ── 4. Values carousel ── */}
      <section className="relative scroll-mt-24 overflow-hidden py-14 sm:py-20">
        <PawScatter
          paws={[
            { className: "top-[6%] right-[5%] rotate-[14deg]", size: 48 },
            { className: "bottom-[8%] left-[4%] -rotate-[12deg]", size: 54 },
          ]}
        />
        <div className="section-shell">
          <Reveal className="text-center">
            <SplitHeading lead={about.values.titleLead} accent={about.values.titleAccent} />
            <PawRule className="mt-5" />
          </Reveal>
        </div>

        <ValuesCarousel />
      </section>

      {/* ── 5. Closing CTA — full-bleed brand band ── */}
      <section className="relative scroll-mt-24 overflow-hidden bg-brand py-16 text-center sm:py-20">
        <PawScatter
          paws={[
            { className: "top-[16%] left-[8%] -rotate-[18deg]", size: 68 },
            { className: "bottom-[14%] right-[9%] rotate-[14deg]", size: 56 },
          ]}
          opacity={0.12}
        />
        <div className="section-shell">
          <Reveal>
            <h2 className="font-heading text-3xl leading-tight font-bold text-balance text-white sm:text-4xl">
              {about.cta.title}
            </h2>
            <p className="mt-4 text-lg font-medium text-white/90">{about.cta.lede}</p>
            <p className="mx-auto mt-3 max-w-xl leading-relaxed text-white/75">
              {about.cta.body}
            </p>
            <a
              href={about.cta.href}
              target={about.cta.href.startsWith("http") ? "_blank" : undefined}
              rel={about.cta.href.startsWith("http") ? "noopener noreferrer" : undefined}
              className="group mt-8 inline-flex min-h-12 items-center gap-2 rounded-full bg-white px-8 py-3.5 text-sm font-bold text-brand-ink shadow-lift transition-all duration-200 hover:shadow-float focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
            >
              {about.cta.label}
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
