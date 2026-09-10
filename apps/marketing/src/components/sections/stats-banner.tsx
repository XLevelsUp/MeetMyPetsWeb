import { PawPrint } from "lucide-react";

import { CountUp } from "@/components/motion/CountUp";
import { Reveal } from "@/components/motion/Reveal";
import { WaveDivider } from "@/components/ui/wave-divider";
import { statsBanner } from "@/config/site";

/**
 * Stats strip on a brand-soft panel — the same warm wash the hero and waitlist
 * card use, so it sits inside the light palette rather than breaking it.
 *
 * Server Component; only CountUp ships client JS.
 */
export function StatsBanner() {
  return (
    <section className="relative overflow-hidden bg-brand-soft py-8 sm:py-10">
      <PawPrint
        aria-hidden="true"
        className="pointer-events-none absolute top-[10%] left-[4%] -z-0 hidden size-20 rotate-[-14deg] text-brand-ink opacity-[0.16] sm:block"
      />
      <PawPrint
        aria-hidden="true"
        className="pointer-events-none absolute bottom-[8%] right-[5%] -z-0 hidden size-16 rotate-[16deg] text-brand-ink opacity-[0.18] md:block"
      />
      {/* A real <dl>: these are term/description pairs ("100+" / "Pet Owners
          Surveyed"), and dt/dd are only announced as such by screen readers
          when a <dl> wraps them.

          Reveal renders a plain <div> per stat, which is exactly the single
          grouping wrapper HTML allows between <dl> and each dt/dd pair — so
          the animation and the correct structure come for free together. */}
      <dl className="section-shell relative grid grid-cols-2 gap-x-6 gap-y-10 lg:grid-cols-4">
        {statsBanner.map((stat, index) => (
          <Reveal key={stat.label} delay={index * 0.08} variant="springy" className="text-center">
            <dt className="font-heading text-4xl font-bold text-brand-ink sm:text-5xl">
              <CountUp to={stat.value} />
              {stat.suffix}
            </dt>
            <dd className="mt-2 text-sm font-medium text-ink sm:text-base">{stat.label}</dd>
          </Reveal>
        ))}
      </dl>

      {/* Wave at the top — hero flows into this strip */}
      <WaveDivider flip color="var(--brand-soft)" />
      {/* Wave at the bottom — this strip flows into ecosystem */}
      <WaveDivider color="var(--background)" />
    </section>
  );
}
