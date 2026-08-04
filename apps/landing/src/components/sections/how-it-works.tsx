"use client";

import { AnimatePresence, motion, useReducedMotion, useScroll, useSpring } from "motion/react";
import { useRef, useState } from "react";

import { SectionHeading } from "@/components/ui/section-heading";
import { howItWorks } from "@/config/site";
import { cn } from "@/lib/utils";

/**
 * Pinned scroll sequence, 01 -> 04.
 *
 * The pin is `position: sticky`, not a JS scroll-jack. That means the browser
 * owns the scroll — no layout thrash per frame, no fighting the user's
 * momentum, and it degrades to a plain stacked list on narrow screens where
 * there is no room for a two-column pin.
 */
export function HowItWorks() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(0);
  const reduced = useReducedMotion();

  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start center", "end center"],
  });
  const progress = useSpring(scrollYProgress, { stiffness: 90, damping: 24, mass: 0.4 });

  return (
    <section id="how-it-works" className="py-20 sm:py-28">
      <div className="section-shell">
        <SectionHeading
          eyebrow="How it works"
          title="From empty profile to local community in four steps"
        />

        <div ref={containerRef} className="mt-14 grid gap-10 lg:grid-cols-[0.9fr_1.1fr] lg:gap-16">
          {/* Pinned panel — hidden on mobile, where stacking reads better. */}
          <div className="hidden lg:block">
            <div className="sticky top-28">
              <div className="relative overflow-hidden rounded-3xl border border-border bg-card p-10 shadow-soft">
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-secondary">
                  <motion.div
                    className="h-full origin-left rounded-full bg-brand"
                    style={reduced ? { scaleX: 1 } : { scaleX: progress }}
                  />
                </div>

                <AnimatePresence mode="wait">
                  <motion.div
                    key={active}
                    initial={reduced ? undefined : { opacity: 0, y: 14 }}
                    animate={reduced ? undefined : { opacity: 1, y: 0 }}
                    exit={reduced ? undefined : { opacity: 0, y: -10 }}
                    transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
                    className="mt-10"
                  >
                    <p className="font-heading text-7xl leading-none font-semibold text-brand-soft">
                      {howItWorks[active].step}
                    </p>
                    <h3 className="mt-6 text-3xl leading-snug font-semibold">
                      {howItWorks[active].title}
                    </h3>
                    <p className="mt-4 leading-relaxed text-ink-soft">{howItWorks[active].body}</p>
                  </motion.div>
                </AnimatePresence>
              </div>
            </div>
          </div>

          <ol className="grid gap-5 lg:gap-0">
            {howItWorks.map((item, index) => (
              <motion.li
                key={item.step}
                onViewportEnter={() => setActive(index)}
                viewport={{ margin: "-45% 0px -45% 0px" }}
                className={cn(
                  "rounded-3xl border border-border bg-card p-6 sm:p-8",
                  "lg:flex lg:min-h-[70vh] lg:flex-col lg:justify-center lg:rounded-none lg:border-0 lg:border-t lg:bg-transparent lg:p-0 lg:pt-10",
                )}
              >
                <div className="flex items-baseline gap-4">
                  <span
                    className={cn(
                      "font-heading text-sm font-semibold transition-colors duration-300",
                      index === active ? "text-brand-ink" : "text-ink-soft",
                    )}
                  >
                    {item.step}
                  </span>
                  <h3 className="text-xl font-semibold sm:text-2xl">{item.title}</h3>
                </div>
                <p className="mt-3 leading-relaxed text-ink-soft lg:max-w-md">{item.body}</p>
              </motion.li>
            ))}
          </ol>
        </div>
      </div>
    </section>
  );
}
