import { Compass, MessageCircleHeart, PawPrint, Users } from "lucide-react";
import Image from "next/image";

import { Reveal } from "@/components/motion/Reveal";
import { HERO_BLOB_PATH } from "@/components/ui/blob-clip";
import { PawScatter } from "@/components/ui/paw-scatter";
import { SectionCta } from "@/components/ui/section-cta";
import { SectionHeading } from "@/components/ui/section-heading";
import { WaveDivider } from "@/components/ui/wave-divider";
import { howItWorks, howItWorksPhotos } from "@/config/site";
import { cn } from "@/lib/utils";

const STEP_BLOB_CLIP = "url(#step-blob)";

// One icon per step — build profile, discover nearby, match & chat, join
// community.
const STEP_ICONS = [PawPrint, Compass, MessageCircleHeart, Users];

/**
 * Four steps as a photo-card grid.
 *
 * This was a sticky-pinned scroll sequence, which needed each step to be
 * ~70vh tall and manufactured ~2,300px of near-empty scroll track. A grid says
 * the same thing in one screen, and the section is now a Server Component.
 */
export function HowItWorks() {
  return (
    <section id="how-it-works" className="relative py-10 sm:py-14">
      <svg aria-hidden="true" className="pointer-events-none absolute size-0">
        <defs>
          <clipPath id="step-blob" clipPathUnits="objectBoundingBox">
            <path d={HERO_BLOB_PATH} />
          </clipPath>
        </defs>
      </svg>
      <PawScatter
        paws={[
          { className: "top-[8%] left-[4%] -rotate-[8deg]", size: 52 },
          { className: "bottom-[6%] right-[5%] rotate-[18deg]", size: 60 },
        ]}
      />

      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 -z-10"
        style={{
          background:
            "radial-gradient(44rem 26rem at 12% 85%, var(--trust-soft), transparent 60%), radial-gradient(40rem 22rem at 88% 15%, var(--brand-soft), transparent 65%)",
        }}
      />
      <div className="section-shell">
        <SectionHeading
          eyebrow="How it works"
          title="From empty profile to local community in four steps"
        />

        {/* 1 / 2 / 4 columns. xl (not lg) for the 4-up: at 1024px four cards
            each carrying a photo would drop below ~230px wide and the titles
            would start wrapping mid-word. */}
        <ol className="mt-10 grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-4">
          {howItWorks.map((item, index) => {
            const StepIcon = STEP_ICONS[index] ?? PawPrint;
            const photo = howItWorksPhotos[index];
            return (
              <Reveal as="li" key={item.step} delay={index * 0.08} variant="springy" className="min-w-0">
                <div
                  className={cn(
                    "group relative flex h-full flex-col overflow-hidden border border-border bg-card p-6 shadow-soft transition-shadow duration-300 hover:shadow-lift",
                    index % 2 === 0 ? "card-paw" : "card-paw-alt",
                  )}
                >
                  <span
                    aria-hidden="true"
                    className="pointer-events-none absolute -top-5 -right-1 font-heading text-[7rem] leading-none font-bold text-ink/[0.05] select-none"
                  >
                    {item.step.slice(-1)}
                  </span>

                  {/* sm+ only: on phones these added ~750px of scroll for
                      illustration the icon and title already carry. */}
                  {photo && (
                    <div
                      className="relative mb-5 hidden h-36 w-full overflow-hidden sm:block"
                      style={{ clipPath: STEP_BLOB_CLIP }}
                    >
                      <Image
                        src={photo.src}
                        alt=""
                        fill
                        sizes="(min-width: 1280px) 280px, (min-width: 768px) 45vw, 90vw"
                        className="object-cover transition-transform duration-500 group-hover:scale-105"
                        style={{ objectPosition: photo.objectPosition ?? "top" }}
                      />
                    </div>
                  )}

                  <div className="relative flex items-center gap-3">
                    <span
                      className="grid size-9 shrink-0 place-items-center bg-brand-soft text-brand-ink"
                      style={{ clipPath: STEP_BLOB_CLIP }}
                    >
                      <StepIcon className="size-4.5" aria-hidden="true" />
                    </span>
                    <span className="font-heading text-sm font-semibold text-brand-ink">{item.step}</span>
                  </div>
                  <h3 className="relative mt-3 text-xl font-semibold">{item.title}</h3>
                  <p className="relative mt-2 text-sm leading-relaxed text-ink-soft">{item.body}</p>
                </div>
              </Reveal>
            );
          })}
        </ol>

        <SectionCta text="Four steps, one signup away." buttonLabel="Save my spot" />
      </div>

      <WaveDivider color="color-mix(in oklab, var(--secondary) 40%, var(--background))" />
    </section>
  );
}
