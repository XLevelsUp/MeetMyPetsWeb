import { BadgeCheck, IdCard, ScanLine } from "lucide-react";

import { Reveal } from "@/components/motion/Reveal";
import { SectionHeading } from "@/components/ui/section-heading";
import { verificationSteps } from "@/config/site";

const ICONS = [IdCard, ScanLine, BadgeCheck];

/**
 * Server Component — no interactivity here, so no "use client" and no JS
 * shipped for this section beyond the Reveal wrappers.
 */
export function VerificationFlow() {
  return (
    <section id="verification" className="scroll-mt-24 bg-secondary/40 py-20 sm:py-28">
      <div className="section-shell">
        <SectionHeading
          eyebrow="Trust"
          title="How verification actually works"
          body="A badge is only worth something if it can be taken away. Ours expires with the vaccination it represents."
        />

        <ol className="mt-14 grid gap-5 md:grid-cols-3">
          {verificationSteps.map((step, index) => {
            const Icon = ICONS[index] ?? BadgeCheck;
            return (
              <Reveal
                as="li"
                key={step.step}
                delay={index * 0.08}
                className="relative flex flex-col rounded-3xl border border-border bg-card p-6 shadow-soft sm:p-8"
              >
                <span className="grid size-12 place-items-center rounded-2xl bg-trust-soft text-trust">
                  <Icon className="size-5.5" aria-hidden="true" />
                </span>
                <p className="mt-6 font-heading text-sm font-semibold text-brand-ink">{step.step}</p>
                <h3 className="mt-2 text-xl font-semibold">{step.title}</h3>
                <p className="mt-3 text-sm leading-relaxed text-ink-soft">{step.body}</p>
              </Reveal>
            );
          })}
        </ol>

        <Reveal className="mx-auto mt-10 max-w-2xl text-center">
          <p className="text-sm leading-relaxed text-ink-soft">
            Documents are reviewed, never published. Other users see a badge and a proximity band —
            never your records, your address, or your exact location.
          </p>
        </Reveal>
      </div>
    </section>
  );
}
