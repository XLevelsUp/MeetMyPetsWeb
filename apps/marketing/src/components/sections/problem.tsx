import { HeartHandshake, MapPin, PawPrint, Search } from "lucide-react";

import { Reveal } from "@/components/motion/Reveal";
import { PawScatter } from "@/components/ui/paw-scatter";
import { ScatteredSources } from "@/components/ui/scattered-sources";
import { SectionHeading } from "@/components/ui/section-heading";
import { problem } from "@/config/site";
import { cn } from "@/lib/utils";

// One icon per problem: finding a match, searching everywhere, connecting.
const ICONS = [Search, MapPin, HeartHandshake];

/** Names the three frictions the product removes, ahead of "What you get". */
export function Problem() {
  return (
    <section id="problem" className="relative scroll-mt-24 py-10 sm:py-14">
      <PawScatter
        paws={[
          { className: "top-[12%] left-[4%] -rotate-[12deg]", size: 48 },
          { className: "bottom-[10%] right-[5%] rotate-[18deg]", size: 54 },
        ]}
      />

      <div className="section-shell">
        <div className="grid grid-cols-1 items-center gap-10 lg:grid-cols-[1fr_260px]">
          <SectionHeading
            eyebrow={problem.eyebrow}
            title={problem.title}
            body={problem.body}
            align="left"
          />

          {/* Decorative restatement of card 02 — hidden below lg where the cards need the width. */}
          <Reveal className="hidden lg:block">
            <ScatteredSources />
          </Reveal>
        </div>

        <ol className="mt-10 grid grid-cols-1 gap-5 md:grid-cols-3 md:gap-6">
          {problem.cards.map((card, index) => {
            const Icon = ICONS[index] ?? Search;
            return (
              <Reveal as="li" key={card.step} delay={index * 0.08} variant="springy">
                {/* Shape + hover on this inner node so Reveal's resting inline transform never beats the hover rule. */}
                <div
                  className={cn(
                    "group relative flex h-full flex-col overflow-hidden border border-border/70 bg-card px-6 py-7 shadow-soft transition-[translate,box-shadow] duration-300 hover:-translate-y-1 hover:shadow-lift sm:px-7",
                    index % 2 === 0 ? "card-paw" : "card-paw-alt",
                  )}
                >
                  {/* Brand wash that fades in under the card contents on hover. */}
                  <div
                    aria-hidden="true"
                    className="pointer-events-none absolute inset-0 -z-10 opacity-0 transition-opacity duration-300 group-hover:opacity-100"
                    style={{
                      background:
                        "radial-gradient(22rem 12rem at 50% 0%, var(--brand-soft), transparent 70%)",
                    }}
                  />

                  <div className="flex items-center justify-between gap-4">
                    <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-brand-soft/70 text-brand-ink shadow-soft ring-1 ring-brand/10 transition-transform duration-300 group-hover:-rotate-6 group-hover:scale-110">
                      <Icon className="size-5.5" aria-hidden="true" />
                    </span>
                    <span
                      aria-hidden="true"
                      className="font-heading text-4xl leading-none font-bold text-brand-ink/15 tabular-nums transition-colors duration-300 select-none group-hover:text-brand-ink/30"
                    >
                      {card.step}
                    </span>
                  </div>

                  <h3 className="mt-5 text-xl font-semibold">{card.title}</h3>
                  <p className="mt-3 text-sm leading-relaxed text-ink-soft">{card.body}</p>
                </div>
              </Reveal>
            );
          })}
        </ol>

        <Reveal className="mt-10 flex justify-center">
          <p className="inline-flex items-center gap-3 rounded-2xl border border-brand/20 bg-brand-soft/40 px-6 py-4 text-center text-lg font-semibold text-balance text-brand-ink shadow-soft sm:text-xl">
            <PawPrint className="size-5 shrink-0" aria-hidden="true" />
            {problem.closing}
          </p>
        </Reveal>
      </div>
    </section>
  );
}
