import { ArrowRight, MessagesSquare, PawPrint, Sparkles, LayoutGrid } from "lucide-react";

import { Reveal } from "@/components/motion/Reveal";
import { PawScatter } from "@/components/ui/paw-scatter";
import { SectionHeading } from "@/components/ui/section-heading";
import { WaveDivider } from "@/components/ui/wave-divider";
import { solution } from "@/config/site";
import { cn } from "@/lib/utils";

// One icon per answer: discovery, one place, chat before meeting.
const ICONS = [Sparkles, LayoutGrid, MessagesSquare];

/** Answers the Problem section directly above it, card for card. */
export function Solution() {
  return (
    <section id="solution" className="relative scroll-mt-24 bg-secondary/40 py-10 sm:py-14">
      <PawScatter
        paws={[
          { className: "top-[14%] right-[5%] rotate-[14deg]", size: 50 },
          { className: "bottom-[12%] left-[4%] -rotate-[8deg]", size: 46 },
        ]}
      />

      <div className="section-shell">
        <SectionHeading eyebrow={solution.eyebrow} title={solution.title} body={solution.body} />

        <ol
          className="relative mt-10 grid grid-cols-1 gap-5 md:grid-cols-3 md:gap-6"
          style={{ "--sol-gap": "1.5rem" } as React.CSSProperties}
        >
          {[1, 2].map((gap) => (
            <span
              key={gap}
              aria-hidden="true"
              className="pointer-events-none absolute top-[3.1rem] z-10 hidden size-7 -translate-x-1/2 place-items-center rounded-full bg-card text-trust shadow-soft ring-1 ring-trust/20 md:grid"
              // Gap centre, not column centre: each track is (100% - 2*gap)/3, so a plain n/3 lands on the card.
              style={{ left: `calc((100% - 2 * var(--sol-gap)) / 3 * ${gap} + var(--sol-gap) * ${gap - 0.5})` }}
            >
              <ArrowRight className="size-4" />
            </span>
          ))}

          {solution.cards.map((card, index) => {
            const Icon = ICONS[index] ?? Sparkles;
            return (
              <Reveal as="li" key={card.step} delay={index * 0.08} variant="springy">
                {/* Shape + hover on this inner node so Reveal's resting inline transform never beats the hover rule. */}
                <div
                  className={cn(
                    "group relative flex h-full flex-col overflow-hidden border border-border/70 bg-card px-6 py-7 shadow-soft transition-[translate,box-shadow] duration-300 hover:-translate-y-1 hover:shadow-lift sm:px-7",
                    index % 2 === 0 ? "card-paw-alt" : "card-paw",
                  )}
                >
                  {/* Trust-toned wash on hover — the answer to Problem's brand-red one. */}
                  <div
                    aria-hidden="true"
                    className="pointer-events-none absolute inset-0 -z-10 opacity-0 transition-opacity duration-300 group-hover:opacity-100"
                    style={{
                      background:
                        "radial-gradient(22rem 12rem at 50% 0%, var(--trust-soft), transparent 70%)",
                    }}
                  />

                  <div className="flex items-center justify-between gap-4">
                    <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-trust-soft text-trust shadow-soft ring-1 ring-trust/10 transition-transform duration-300 group-hover:rotate-6 group-hover:scale-110">
                      <Icon className="size-5.5" aria-hidden="true" />
                    </span>
                    <span
                      aria-hidden="true"
                      className="font-heading text-4xl leading-none font-bold text-trust/20 tabular-nums transition-colors duration-300 select-none group-hover:text-trust/40"
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
          <p className="group inline-flex items-center gap-3 rounded-2xl border border-brand/20 bg-brand-soft/40 px-6 py-4 text-center text-lg font-semibold text-balance text-brand-ink shadow-soft transition-[translate,box-shadow,background-color] duration-300 hover:-translate-y-0.5 hover:bg-brand-soft/70 hover:shadow-lift sm:text-xl">
            <PawPrint
              className="size-5 shrink-0 transition-transform duration-300 group-hover:-rotate-12 group-hover:scale-110"
              aria-hidden="true"
            />
            {solution.closing}
          </p>
        </Reveal>
      </div>

      <WaveDivider flip color="color-mix(in oklab, var(--secondary) 40%, var(--background))" />
      <WaveDivider color="var(--background)" />
    </section>
  );
}
