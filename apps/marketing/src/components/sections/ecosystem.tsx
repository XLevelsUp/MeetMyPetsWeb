"use client";

import { AnimatePresence, m, useReducedMotion } from "motion/react";
import { Check } from "lucide-react";
import Image from "next/image";
import { useState } from "react";

import { HERO_BLOB_PATH } from "@/components/ui/blob-clip";
import { PawScatter } from "@/components/ui/paw-scatter";
import { SectionCta } from "@/components/ui/section-cta";
import { SectionHeading } from "@/components/ui/section-heading";
import { WaveDivider } from "@/components/ui/wave-divider";
import { ecosystem } from "@/config/site";
import { cn } from "@/lib/utils";

const ECOSYSTEM_BLOB_CLIP = "url(#ecosystem-blob)";

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
    <section id="ecosystem" className="relative overflow-hidden py-10 sm:py-14">
      <svg aria-hidden="true" className="pointer-events-none absolute size-0">
        <defs>
          <clipPath id="ecosystem-blob" clipPathUnits="objectBoundingBox">
            <path d={HERO_BLOB_PATH} />
          </clipPath>
        </defs>
      </svg>

      {/* Ambient gradient wash — warm terracotta top-right, so this section
          doesn't sit on bare body background between the solid stats-banner
          above and the feature-bento below. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 -z-10"
        style={{
          background:
            "radial-gradient(48rem 28rem at 85% 8%, var(--brand-soft), transparent 65%), radial-gradient(36rem 20rem at 10% 90%, var(--trust-soft), transparent 60%)",
        }}
      />

      <PawScatter
        paws={[
          { className: "top-[5%] right-[4%] rotate-[14deg]", size: 50 },
          { className: "bottom-[10%] left-[3%] -rotate-[10deg]", size: 44 },
        ]}
      />

      <WaveDivider color="var(--background)" />
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
          className="mt-12 flex flex-col gap-2 sm:flex-row"
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
                  "relative min-h-11 flex-1 cursor-pointer border px-4 py-3 text-sm font-semibold transition-colors",
                  index % 2 === 0 ? "card-paw" : "card-paw-alt",
                  selected
                    ? "border-transparent text-white"
                    : "border-border bg-card text-ink-soft hover:text-ink",
                )}
              >
                {selected && (
                  <m.span
                    layoutId="eco-pill"
                    className={cn(
                      "absolute inset-0 -z-10 bg-brand",
                      index % 2 === 0 ? "card-paw" : "card-paw-alt",
                    )}
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
          <m.div
            key={current.id}
            initial={reduced ? undefined : { opacity: 0, y: 10 }}
            animate={reduced ? undefined : { opacity: 1, y: 0 }}
            exit={reduced ? undefined : { opacity: 0, y: -8 }}
            transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
            className="mt-8"
          >
            {/* Shape lives on this inner panel, separate from the m.div
                above — Motion's y/opacity animation leaves a resting inline
                `transform: none` once it finishes, which would silently beat
                a CSS `:hover` rule applied to the same element. */}
            <div
              id={`eco-panel-${current.id}`}
              role="tabpanel"
              aria-labelledby={`eco-tab-${current.id}`}
              className="card-paw grid grid-cols-1 gap-8 border border-border bg-card p-6 sm:p-10 md:grid-cols-[1fr_1fr] lg:grid-cols-[220px_1fr_1fr]"
            >
              {/* lg:-only — sm/md keep the existing two-column layout with no
                  gap where this would sit, a deliberate clean degrade rather
                  than a missing-image regression. Blob-clipped like the
                  hero's flip card, not a plain rounded rectangle — the same
                  hand-cut outline the rest of the redesign uses for photos. */}
              <div
                className="relative hidden aspect-[4/5] w-full overflow-hidden lg:block"
                style={{ clipPath: ECOSYSTEM_BLOB_CLIP }}
              >
                <Image src={current.photo.src} alt={current.photo.alt} fill sizes="220px" className="object-cover" />
              </div>
              <div>
                <h3 className="text-2xl leading-snug font-semibold sm:text-3xl">{current.title}</h3>
                <p className="mt-4 leading-relaxed text-ink-soft">{current.body}</p>
              </div>
              <ul className="grid content-start gap-3">
                {current.points.map((point) => (
                  <li
                    key={point}
                    className="flex items-start gap-3 rounded-[1.1rem_0.5rem_1.1rem_0.5rem] bg-secondary/60 px-4 py-3"
                  >
                    <span className="mt-0.5 grid size-6 shrink-0 place-items-center rounded-full bg-brand text-white shadow-soft">
                      <Check className="size-3" aria-hidden="true" />
                    </span>
                    <span className="text-sm leading-relaxed font-medium">{point}</span>
                  </li>
                ))}
              </ul>
            </div>
          </m.div>
        </AnimatePresence>

        <SectionCta text="Whichever one is you, get in early." buttonLabel="Claim your spot" />
      </div>
    </section>
  );
}
