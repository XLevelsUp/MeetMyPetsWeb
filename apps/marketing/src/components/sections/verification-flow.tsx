import { BadgeCheck, ChevronRight, IdCard, Lock, PawPrint, Syringe } from "lucide-react";
import Image from "next/image";

import { HERO_BLOB_PATH } from "@/components/ui/blob-clip";
import { Reveal } from "@/components/motion/Reveal";
import { PawScatter } from "@/components/ui/paw-scatter";
import { SectionHeading } from "@/components/ui/section-heading";
import { WaveDivider } from "@/components/ui/wave-divider";
import { verificationSteps } from "@/config/site";
import { cn } from "@/lib/utils";

// One icon per step: owner ID check, vaccination record review, badge issued.
const ICONS = [IdCard, Syringe, BadgeCheck];

const TRUST_BLOB_CLIP = "url(#trust-blob)";

/**
 * Server Component — no interactivity here, so no "use client" and no JS
 * shipped for this section beyond the Reveal wrappers.
 *
 * Each step is a two-tone card: a tinted header band carrying the icon (in
 * a raised white chip) and a large ghost step numeral, then a white body
 * with the copy. The final step — the badge actually being issued — gets a
 * warm-to-cool gradient band, a brand ring and the paw badge, so the row
 * builds toward it. Between cards at md+ a gradient thread runs behind the
 * bands with small chevron connectors at the gaps, so the three read as one
 * left-to-right progression rather than three unrelated boxes.
 *
 * At lg+ a blob-clipped pet photo sits to the right of the heading — the
 * most direct visual shorthand for "a real animal, cared for by a real
 * person."
 */
export function VerificationFlow() {
  return (
    <section id="verification" className="relative scroll-mt-24 bg-secondary/40 py-10 sm:py-14">
      <svg aria-hidden="true" className="pointer-events-none absolute size-0">
        <defs>
          <clipPath id="trust-blob" clipPathUnits="objectBoundingBox">
            <path d={HERO_BLOB_PATH} />
          </clipPath>
        </defs>
      </svg>

      <PawScatter
        paws={[
          { className: "top-[10%] right-[6%] rotate-[15deg]", size: 56 },
          { className: "bottom-[14%] left-[4%] -rotate-[10deg]", size: 44 },
        ]}
      />
      <div className="section-shell">
        <div className="grid grid-cols-1 items-center gap-10 lg:grid-cols-[1fr_220px]">
          <SectionHeading
            eyebrow="Trust"
            title="How verification actually works"
            body="A badge is only worth something if it can be taken away. Ours expires with the vaccination it represents."
            align="left"
          />

          <Reveal className="hidden lg:block">
            <div
              className="relative mx-auto aspect-[3/4] w-48 overflow-hidden"
              style={{ clipPath: TRUST_BLOB_CLIP }}
            >
              <Image
                src="/pet-maine-coon.webp"
                alt="A well-cared-for Maine Coon — the kind of pet behind a verified profile"
                fill
                sizes="192px"
                className="object-cover"
              />
            </div>
          </Reveal>
        </div>

        <ol className="relative mt-10 grid grid-cols-1 gap-5 md:grid-cols-3 md:gap-6">
          <div className="verification-thread hidden md:block" aria-hidden="true" />
          {/* Chevron connectors sit on the thread at each column gap. */}
          {[1, 2].map((gap) => (
            <span
              key={gap}
              aria-hidden="true"
              className="pointer-events-none absolute top-[2.6rem] z-10 hidden size-7 -translate-x-1/2 place-items-center rounded-full bg-card text-brand-ink shadow-soft ring-1 ring-brand/15 md:grid"
              style={{ left: `calc(${(gap * 100) / 3}% )` }}
            >
              <ChevronRight className="size-4" />
            </span>
          ))}

          {verificationSteps.map((step, index) => {
            const Icon = ICONS[index] ?? BadgeCheck;
            const featured = index === verificationSteps.length - 1;
            return (
              <Reveal as="li" key={step.step} delay={index * 0.08} variant="springy" className="relative">
                {featured && (
                  <span className="card-paw-badge z-10" aria-hidden="true">
                    <PawPrint className="size-4.5" />
                  </span>
                )}
                {/* Shape + hover-lift live on this inner element, separate
                    from Reveal's own motion.li above, so Reveal's resting
                    inline transform never beats the hover rule. */}
                <div
                  className={cn(
                    "relative flex h-full flex-col overflow-hidden border border-border/70 bg-card shadow-soft transition-[translate,box-shadow] duration-300 hover:-translate-y-1 hover:shadow-lift",
                    index % 2 === 0 ? "card-paw" : "card-paw-alt",
                    featured && "ring-1 ring-brand/20",
                  )}
                >
                  <div
                    className={cn(
                      "relative flex items-center justify-between gap-4 px-6 pt-6 pb-5 sm:px-7",
                      featured
                        ? "bg-gradient-to-br from-brand-soft via-brand-soft/70 to-trust-soft"
                        : "bg-trust-soft/55",
                    )}
                  >
                    <span
                      className={cn(
                        "grid shrink-0 place-items-center rounded-2xl bg-card shadow-soft ring-1",
                        featured ? "size-16 text-brand-ink ring-brand/15" : "size-14 text-trust ring-trust/10",
                      )}
                    >
                      <Icon className={featured ? "size-7" : "size-6"} aria-hidden="true" />
                    </span>
                    <span
                      aria-hidden="true"
                      className="font-heading text-5xl leading-none font-bold text-brand-ink/20 tabular-nums select-none"
                    >
                      {step.step}
                    </span>
                  </div>

                  <div className="flex flex-1 flex-col px-6 pt-5 pb-7 sm:px-7">
                    <p className="font-heading text-xs font-semibold tracking-[0.14em] text-brand-ink uppercase">
                      {step.step}
                    </p>
                    <h3 className={cn("mt-2 font-semibold", featured ? "text-2xl" : "text-xl")}>
                      {step.title}
                    </h3>
                    <p
                      className={cn(
                        "mt-3 leading-relaxed text-ink-soft",
                        featured ? "text-base" : "text-sm",
                      )}
                    >
                      {step.body}
                    </p>
                  </div>
                </div>
              </Reveal>
            );
          })}
        </ol>

        <Reveal className="mx-auto mt-10 flex max-w-2xl justify-center">
          <p className="inline-flex items-start gap-3 rounded-2xl border border-border/70 bg-card/80 px-5 py-4 text-left text-sm leading-relaxed text-ink-soft shadow-soft sm:items-center">
            <Lock className="mt-0.5 size-4 shrink-0 text-trust sm:mt-0" aria-hidden="true" />
            <span>
              Documents are reviewed, never published. Other users see a badge and a proximity band —
              never your records, your address, or your exact location.
            </span>
          </p>
        </Reveal>
      </div>

      <WaveDivider flip color="color-mix(in oklab, var(--secondary) 40%, var(--background))" />
      <WaveDivider color="var(--background)" />
    </section>
  );
}
