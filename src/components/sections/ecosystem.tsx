"use client";

import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { Check } from "lucide-react";
import { useState } from "react";

import { SectionHeading } from "@/components/ui/section-heading";
import { ecosystem } from "@/config/site";
import { cn } from "@/lib/utils";

/**
 * Three-paradigm switcher.
 *
 * Built on native buttons with the tablist/tab/tabpanel roles wired by hand
 * rather than a library, because the panels are plain content and this keeps
 * the JS cost near zero. Arrow-key roving focus is included — a tablist that
 * only responds to Tab is a common and avoidable accessibility miss.
 */
export function Ecosystem() {
  const [active, setActive] = useState(0);
  const reduced = useReducedMotion();
  const current = ecosystem[active];

  function handleKey(event: React.KeyboardEvent) {
    if (event.key !== "ArrowRight" && event.key !== "ArrowLeft") return;
    event.preventDefault();
    const next =
      event.key === "ArrowRight"
        ? (active + 1) % ecosystem.length
        : (active - 1 + ecosystem.length) % ecosystem.length;
    setActive(next);
    document.getElementById(`eco-tab-${ecosystem[next].id}`)?.focus();
  }

  return (
    <section id="ecosystem" className="py-20 sm:py-28">
      <div className="section-shell">
        <SectionHeading
          eyebrow="The ecosystem"
          title="Three products, one place your pet already lives"
          body="Community, discovery and professional services stop being three separate apps that never talk to each other."
        />

        <div
          role="tablist"
          aria-label="Who MeetMyPets is for"
          onKeyDown={handleKey}
          className="mt-12 flex flex-col gap-2 rounded-2xl border border-border bg-card p-2 sm:flex-row"
        >
          {ecosystem.map((item, index) => {
            const selected = index === active;
            return (
              <button
                key={item.id}
                id={`eco-tab-${item.id}`}
                role="tab"
                type="button"
                aria-selected={selected}
                aria-controls={`eco-panel-${item.id}`}
                tabIndex={selected ? 0 : -1}
                onClick={() => setActive(index)}
                className={cn(
                  "relative min-h-11 flex-1 cursor-pointer rounded-xl px-4 py-3 text-sm font-semibold transition-colors",
                  selected ? "text-primary font-bold" : "text-ink-soft hover:text-ink",
                )}
              >
                {selected && (
                  <motion.span
                    layoutId="eco-pill"
                    className="absolute inset-0 -z-10 rounded-xl bg-brand"
                    transition={
                      reduced ? { duration: 0 } : { type: "spring", stiffness: 320, damping: 30 }
                    }
                  />
                )}
                {item.eyebrow}
              </button>
            );
          })}
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={current.id}
            id={`eco-panel-${current.id}`}
            role="tabpanel"
            aria-labelledby={`eco-tab-${current.id}`}
            initial={reduced ? undefined : { opacity: 0, y: 10 }}
            animate={reduced ? undefined : { opacity: 1, y: 0 }}
            exit={reduced ? undefined : { opacity: 0, y: -8 }}
            transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
            className="mt-8 grid gap-8 rounded-3xl border border-border bg-card p-6 sm:p-10 lg:grid-cols-[1fr_1fr]"
          >
            <div>
              <h3 className="text-2xl leading-snug font-semibold sm:text-3xl">{current.title}</h3>
              <p className="mt-4 leading-relaxed text-ink-soft">{current.body}</p>
            </div>
            <ul className="grid content-start gap-3">
              {current.points.map((point) => (
                <li key={point} className="flex items-start gap-3 rounded-xl bg-secondary/60 px-4 py-3">
                  <span className="mt-0.5 grid size-5 shrink-0 place-items-center rounded-full bg-brand text-white">
                    <Check className="size-3" aria-hidden="true" />
                  </span>
                  <span className="text-sm leading-relaxed font-medium">{point}</span>
                </li>
              ))}
            </ul>
          </motion.div>
        </AnimatePresence>
      </div>
    </section>
  );
}
