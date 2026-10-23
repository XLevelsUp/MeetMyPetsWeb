import { ArrowRight, Compass, Heart, PawPrint, ShieldCheck } from "lucide-react";
import type { Metadata } from "next";

import { CountUp } from "@/components/motion/CountUp";
import { Reveal } from "@/components/motion/Reveal";
import { StaggerList, WordReveal } from "@/components/motion/WordReveal";
import { PawScatter } from "@/components/ui/paw-scatter";
import { PhotoSlot } from "@/components/ui/photo-slot";
import { SpeciesIcon } from "@/components/ui/species-icon";
import { WaveDivider } from "@/components/ui/wave-divider";
import { ourStory, site } from "@/config/site";
import { cn } from "@/lib/utils";

const DESCRIPTION =
  "How a childhood surrounded by animals, and one cat's search for a friend, became MeetMyPets — a community built for every pet and every person who loves one.";

export const metadata: Metadata = {
  title: "Our Story",
  description: DESCRIPTION,
  alternates: { canonical: "/our-story/" },
  openGraph: {
    type: "article",
    url: "/our-story/",
    title: `Our Story — ${site.name}`,
    description: DESCRIPTION,
    // A page-level `openGraph` REPLACES the root layout's wholesale (see csae-policy/page.tsx).
    siteName: site.name,
    locale: site.locale,
  },
  robots: { index: true, follow: true },
};

const PILLAR_ICONS = [Heart, Compass, ShieldCheck];

export default function OurStoryPage() {
  const { opening, belief, problem, turn, pillars, everyPet, journey, cta } = ourStory;

  return (
    <>
      {/* ── 1. Hero: quiet, one line, lots of air ── */}
      <section className="relative scroll-mt-24 pt-28 pb-12 sm:pt-36 sm:pb-16">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 -z-10"
          style={{
            background:
              "radial-gradient(44rem 26rem at 50% 0%, var(--brand-soft), transparent 68%)",
          }}
        />
        <PawScatter
          paws={[
            { className: "top-[22%] left-[6%] -rotate-[14deg]", size: 50 },
            { className: "top-[30%] right-[7%] rotate-[16deg]", size: 42 },
          ]}
        />

        <div className="section-shell">
          <Reveal className="mx-auto max-w-3xl text-center">
            <p className="text-xs font-semibold tracking-[0.14em] text-brand-ink uppercase">
              {ourStory.eyebrow}
            </p>
            <h1 className="mt-4 text-section font-semibold text-balance">{ourStory.title}</h1>
          </Reveal>
          <WordReveal
            text={ourStory.intro}
            delay={0.25}
            className="mx-auto mt-6 max-w-2xl text-center text-lg leading-relaxed text-balance text-ink-soft sm:text-xl"
          />
        </div>
      </section>

      {/* ── 2. The childhood: the list is the point, so it gets the stage ── */}
      <section id="where-it-began" className="relative scroll-mt-24 py-12 sm:py-16">
        <div className="section-shell">
          <div className="grid grid-cols-1 items-center gap-10 md:gap-12 lg:grid-cols-[1fr_0.85fr] lg:gap-16">
            <div>
              <Reveal>
                <p className="text-lg font-medium text-brand-ink">{opening.lede}</p>
                <h2 className="mt-3 text-2xl leading-tight font-semibold text-balance sm:text-3xl lg:text-4xl">
                  {opening.title}
                </h2>
                <p className="mt-5 text-lg leading-relaxed text-ink-soft">{opening.body}</p>
              </Reveal>

              {/* The specifics land one by one — the detail that makes a childhood real. */}
              <StaggerList
                items={opening.items}
                className="mt-6 justify-start"
                itemClassName="rounded-full bg-brand-soft/60 px-4 py-2 text-sm font-medium text-brand-ink"
              />

              <Reveal className="mt-6" variant="springy">
                <p className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                  <CountUp
                    to={opening.count}
                    className="font-heading text-5xl leading-none font-bold text-brand tabular-nums sm:text-6xl"
                  />
                  <span className="text-lg text-ink-soft">{opening.countLabel}</span>
                </p>
              </Reveal>

              <Reveal className="mt-6">
                <p className="text-lg leading-relaxed text-ink">{opening.closing}</p>
              </Reveal>
            </div>

            <Reveal variant="springy" className="hidden md:block">
              <PhotoSlot
                brief={opening.photo.brief}
                alt={opening.photo.alt}
                className="mx-auto w-full max-w-sm"
              />
            </Reveal>
          </div>
        </div>
      </section>

      {/* ── 3. The belief: full width, nothing competing with it ── */}
      <section className="relative scroll-mt-24 overflow-hidden bg-brand py-16 sm:py-20">
        <PawScatter
          paws={[
            { className: "top-[14%] left-[8%] -rotate-[18deg]", size: 72 },
            { className: "bottom-[12%] right-[9%] rotate-[14deg]", size: 60 },
          ]}
          opacity={0.1}
        />
        <div className="section-shell text-center">
          <WordReveal
            as="blockquote"
            text={`"${belief.quote}"`}
            className="mx-auto max-w-4xl font-heading text-3xl leading-tight font-bold text-balance text-white sm:text-4xl lg:text-5xl"
          />
          <Reveal>
            <p className="mx-auto mt-6 max-w-xl text-white/80">{belief.note}</p>
          </Reveal>
        </div>
      </section>

      {/* ── 4. The problem: JD gets the photo, the frustration gets the emphasis ── */}
      <section id="the-problem" className="relative scroll-mt-24 py-12 sm:py-16">
        <div className="section-shell">
          <div className="grid grid-cols-1 items-center gap-10 md:gap-12 lg:grid-cols-[0.85fr_1fr] lg:gap-16">
            <Reveal variant="springy" className="hidden md:block">
              <PhotoSlot
                src={problem.photo.src}
                caption={problem.photo.caption}
                alt={problem.photo.alt}
                className="mx-auto w-full max-w-sm"
              />
            </Reveal>

            <div>
              <Reveal>
                <p className="text-xs font-semibold tracking-[0.14em] text-brand-ink uppercase">
                  {problem.eyebrow}
                </p>
                <h2 className="mt-3 text-2xl leading-tight font-semibold text-balance sm:text-3xl lg:text-4xl">
                  {problem.title}
                </h2>
                <p className="mt-3 text-lg font-medium text-brand-ink">{problem.lede}</p>
                {problem.body.map((paragraph) => (
                  <p key={paragraph} className="mt-4 leading-relaxed text-ink-soft">
                    {paragraph}
                  </p>
                ))}
              </Reveal>

              <WordReveal
                text={problem.emphasis}
                className="mt-6 border-l-4 border-brand py-2 pl-5 text-xl leading-snug font-semibold text-balance text-ink sm:text-2xl"
              />

              <Reveal className="mt-5">
                <p className="leading-relaxed text-ink-soft">{problem.closing}</p>
              </Reveal>
            </div>
          </div>
        </div>
      </section>

      {/* ── 5. The turn: the question is the hinge of the whole story ── */}
      <section className="relative scroll-mt-24 bg-secondary/40 py-14 sm:py-18">
        <div className="section-shell">
          <Reveal className="text-center">
            <p className="text-xs font-semibold tracking-[0.14em] text-brand-ink uppercase">
              {turn.eyebrow}
            </p>
          </Reveal>
          <WordReveal
            as="h2"
            text={turn.question}
            className="mx-auto mt-4 max-w-3xl text-center font-heading text-2xl leading-tight font-bold text-balance text-brand-ink sm:text-3xl lg:text-4xl"
          />
          <div className="mx-auto mt-8 grid max-w-4xl grid-cols-1 gap-5 md:grid-cols-2 md:gap-8">
            {turn.body.map((paragraph, i) => (
              <Reveal key={paragraph} delay={i * 0.1}>
                <p className="leading-relaxed text-ink-soft">{paragraph}</p>
              </Reveal>
            ))}
          </div>
          <Reveal variant="springy" className="mt-8 text-center">
            <p className="font-heading text-xl font-semibold text-ink sm:text-2xl">
              {turn.closing}
            </p>
          </Reveal>
        </div>

        <WaveDivider flip color="color-mix(in oklab, var(--secondary) 40%, var(--background))" />
        <WaveDivider color="var(--background)" />
      </section>

      {/* ── 6. The vision: three pillars ── */}
      <section className="relative scroll-mt-24 py-12 sm:py-16">
        <PawScatter
          paws={[
            { className: "top-[10%] right-[4%] rotate-[12deg]", size: 46 },
            { className: "bottom-[14%] left-[5%] -rotate-[10deg]", size: 52 },
          ]}
        />
        <div className="section-shell">
          <Reveal className="mx-auto max-w-2xl text-center">
            <p className="text-xs font-semibold tracking-[0.14em] text-brand-ink uppercase">
              {pillars.eyebrow}
            </p>
            <h2 className="mt-3 text-section font-semibold text-balance">{pillars.title}</h2>
            <p className="mt-3 text-lg font-medium text-brand-ink">{pillars.lede}</p>
            <p className="mt-4 leading-relaxed text-ink-soft">{pillars.intro}</p>
          </Reveal>

          <ul className="mt-10 grid grid-cols-1 gap-5 md:grid-cols-3 md:gap-6">
            {pillars.items.map((item, index) => {
              const Icon = PILLAR_ICONS[index] ?? Heart;
              return (
                <Reveal as="li" key={item.title} delay={index * 0.08} variant="springy">
                  {/* Shape + hover on this inner node so Reveal's resting inline transform never beats the hover rule. */}
                  <div
                    className={cn(
                      "group flex h-full flex-col border border-border/70 bg-card px-6 py-7 shadow-soft transition-[translate,box-shadow] duration-300 hover:-translate-y-1 hover:shadow-lift sm:px-7",
                      index % 2 === 0 ? "card-paw" : "card-paw-alt",
                    )}
                  >
                    <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-brand-soft/70 text-brand-ink shadow-soft ring-1 ring-brand/10 transition-transform duration-300 group-hover:-rotate-6 group-hover:scale-110">
                      <Icon className="size-5.5" aria-hidden="true" />
                    </span>
                    <h3 className="mt-5 text-xl font-semibold">{item.title}</h3>
                    <p className="mt-3 text-sm leading-relaxed text-ink-soft">{item.body}</p>
                  </div>
                </Reveal>
              );
            })}
          </ul>

          <Reveal className="mx-auto mt-8 max-w-3xl">
            <p className="rounded-2xl border border-trust/20 bg-trust-soft/40 px-6 py-5 text-sm leading-relaxed text-ink-soft">
              {pillars.note}
            </p>
          </Reveal>
        </div>
      </section>

      {/* ── 7. Every pet: the species ARE the argument, so they get the stage ── */}
      <section className="relative scroll-mt-24 overflow-hidden bg-secondary/40 py-14 sm:py-18">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 -z-10"
          style={{
            background:
              "radial-gradient(40rem 22rem at 50% 30%, var(--brand-soft), transparent 65%)",
          }}
        />
        <PawScatter
          paws={[
            { className: "top-[8%] left-[6%] -rotate-[12deg]", size: 44 },
            { className: "bottom-[10%] right-[7%] rotate-[16deg]", size: 50 },
          ]}
        />

        <div className="section-shell text-center">
          <Reveal className="mx-auto max-w-2xl">
            <p className="text-xs font-semibold tracking-[0.14em] text-brand-ink uppercase">
              {everyPet.eyebrow}
            </p>
            <h2 className="mt-3 text-section font-semibold text-balance">{everyPet.title}</h2>
            <p className="mt-3 text-lg font-medium text-brand-ink">{everyPet.lede}</p>
          </Reveal>

          <WordReveal
            text={everyPet.notJust}
            className="mt-7 font-heading text-xl font-semibold text-ink sm:text-2xl"
          />

          {/* 2 cols on phones so nothing is cramped, 4 at md, all 8 at lg. */}
          <ul className="mx-auto mt-7 grid max-w-4xl grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4 lg:grid-cols-8">
            {everyPet.species.map((item, i) => (
              <Reveal as="li" key={item.label} delay={i * 0.06} variant="springy">
                <div className="group flex h-full flex-col items-center gap-2.5 rounded-2xl border border-border/70 bg-card px-3 py-5 shadow-soft transition-[translate,box-shadow] duration-300 hover:-translate-y-1 hover:shadow-lift">
                  <span className="grid size-11 place-items-center rounded-xl bg-brand-soft/70 p-2.5 text-brand-ink transition-transform duration-300 group-hover:-rotate-6 group-hover:scale-110">
                    <SpeciesIcon species={item.glyph} />
                  </span>
                  <span className="text-sm font-medium text-ink">{item.label}</span>
                </div>
              </Reveal>
            ))}
          </ul>

          {/* The "you belong too" turn — the emotional point of this section. */}
          <Reveal variant="springy" className="mx-auto mt-10 max-w-2xl">
            <div className="rounded-[2rem] border border-brand/20 bg-card px-6 py-8 shadow-lift sm:px-10">
              <PawPrint className="mx-auto size-6 text-brand-ink" aria-hidden="true" />
              <p className="mt-4 font-heading text-xl leading-snug font-bold text-balance text-brand-ink sm:text-2xl">
                {everyPet.belong.title}
              </p>
              <p className="mt-3 leading-relaxed text-ink-soft">{everyPet.belong.body}</p>
            </div>
          </Reveal>

          <Reveal className="mx-auto mt-8 max-w-2xl">
            <p className="leading-relaxed text-balance text-ink-soft">{everyPet.closing}</p>
          </Reveal>
        </div>

        <WaveDivider flip color="color-mix(in oklab, var(--secondary) 40%, var(--background))" />
        <WaveDivider color="var(--background)" />
      </section>

      {/* ── 8. Journey, then the closing CTA ── */}
      <section className="relative scroll-mt-24 py-12 sm:py-16">
        <div className="section-shell">
          <Reveal className="mx-auto max-w-2xl text-center">
            <p className="text-xs font-semibold tracking-[0.14em] text-brand-ink uppercase">
              {journey.eyebrow}
            </p>
            <h2 className="mt-3 text-section font-semibold text-balance">{journey.title}</h2>
            <p className="mt-3 text-lg font-medium text-brand-ink">{journey.lede}</p>
            <p className="mt-4 leading-relaxed text-ink-soft">{journey.body}</p>
          </Reveal>

          <WordReveal
            text={journey.vision}
            className="mx-auto mt-10 max-w-3xl text-center font-heading text-2xl leading-tight font-bold text-balance text-brand-ink sm:text-3xl"
          />

          <Reveal variant="springy" className="mt-8 text-center">
            <p className="font-heading text-lg font-semibold text-ink">
              {site.name} &mdash; {journey.signature}
            </p>
          </Reveal>
        </div>
      </section>

      <section className="relative scroll-mt-24 pb-16 sm:pb-20">
        <div className="section-shell">
          <Reveal variant="springy">
            <div className="card-paw relative overflow-hidden border border-border bg-card px-6 py-12 text-center shadow-lift sm:px-10 sm:py-14">
              <div
                aria-hidden="true"
                className="pointer-events-none absolute inset-0 -z-10"
                style={{
                  background:
                    "radial-gradient(36rem 18rem at 50% 0%, var(--brand-soft), transparent 70%)",
                }}
              />
              <h2 className="text-2xl leading-tight font-semibold text-balance sm:text-3xl">
                {cta.title}
              </h2>
              <p className="mt-3 text-lg font-medium text-brand-ink">{cta.lede}</p>
              <p className="mx-auto mt-4 max-w-xl leading-relaxed text-ink-soft">{cta.body}</p>
              <a
                href={cta.href}
                target={cta.href.startsWith("http") ? "_blank" : undefined}
                rel={cta.href.startsWith("http") ? "noopener noreferrer" : undefined}
                className="group mt-8 inline-flex min-h-11 items-center gap-2 rounded-full bg-brand px-7 py-3 text-sm font-semibold text-white shadow-lift transition-all duration-200 hover:bg-brand-ink hover:shadow-float focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
              >
                {cta.label}
                <ArrowRight
                  className="size-4 transition-transform duration-200 group-hover:translate-x-0.5"
                  aria-hidden="true"
                />
              </a>
            </div>
          </Reveal>
        </div>
      </section>
    </>
  );
}
