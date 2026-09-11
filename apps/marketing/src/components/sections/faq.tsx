import Image from "next/image";
import { ChevronDown, PawPrint } from "lucide-react";

import { Reveal } from "@/components/motion/Reveal";
import { HERO_BLOB_PATH } from "@/components/ui/blob-clip";
import { PawScatter } from "@/components/ui/paw-scatter";
import { SectionCta } from "@/components/ui/section-cta";
import { SectionHeading } from "@/components/ui/section-heading";
import { faq } from "@/config/site";

const FAQ_BLOB_CLIP = "url(#faq-blob)";

/** FAQ accordion on native <details> — zero JS, works before hydration. */
export function Faq() {
  return (
    <section id="faq" className="relative py-10 sm:py-14">
      {/* SVG defs — blob clip shared with hero/ecosystem/verification panels */}
      <svg aria-hidden="true" className="pointer-events-none absolute size-0">
        <defs>
          <clipPath id="faq-blob" clipPathUnits="objectBoundingBox">
            <path d={HERO_BLOB_PATH} />
          </clipPath>
        </defs>
      </svg>

      <PawScatter
        paws={[
          { className: "top-[8%] left-[5%] rotate-[10deg]", size: 48 },
          { className: "bottom-[10%] right-[6%] -rotate-[14deg]", size: 60 },
        ]}
      />

      {/* Ambient gradient wash — warm terracotta at the top so the FAQ
          doesn't read as an afterthought floating on bare background
          between the waitlist card and the reels section. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 -z-10"
        style={{
          background:
            "radial-gradient(42rem 22rem at 50% 5%, var(--brand-soft), transparent 65%), radial-gradient(36rem 20rem at 85% 80%, var(--trust-soft), transparent 55%)",
        }}
      />
      <div className="section-shell">
        {/* Photo beside the heading at every width — it was lg-only, so
            phones never saw the cat at all. */}
        <div className="grid grid-cols-[5.5rem_1fr] items-center gap-4 sm:grid-cols-[8rem_1fr] sm:gap-6 lg:grid-cols-[220px_1fr] lg:gap-10">
          <Reveal>
            <div
              className="relative aspect-[3/4] w-full overflow-hidden lg:mx-auto lg:w-48"
              style={{ clipPath: FAQ_BLOB_CLIP }}
            >
              <Image
                src="/pet-cat-ginger-longhair.webp"
                alt="A curious ginger cat — the kind of companion whose owner has questions"
                fill
                sizes="(min-width: 1024px) 192px, (min-width: 640px) 128px, 88px"
                className="object-cover object-top"
              />
            </div>
          </Reveal>

          <SectionHeading
            eyebrow="Questions"
            title="Answers before you sign up"
            align="left"
          />
        </div>

        <Reveal className="mx-auto mt-12 max-w-3xl">
          <div className="divide-y divide-border border-y border-border">
            {faq.map((item) => (
              <details key={item.q} name="faq" className="group">
                <summary
                  className={
                    "flex min-h-14 cursor-pointer list-none items-center justify-between gap-4 " +
                    "py-5 text-base font-semibold transition-colors hover:text-brand-ink sm:text-lg " +
                    "[&::-webkit-details-marker]:hidden"
                  }
                >
                  <span className="flex items-center gap-3">
                    <PawPrint
                      aria-hidden="true"
                      className="size-4 shrink-0 text-ink-soft/40 transition-colors duration-200 group-hover:text-brand-ink group-hover:motion-safe:animate-nudge group-open:text-brand-ink"
                    />
                    {item.q}
                  </span>
                  <ChevronDown
                    aria-hidden="true"
                    className="size-5 shrink-0 text-ink-soft transition-transform duration-300 group-hover:translate-y-0.5 group-open:-rotate-180 group-open:group-hover:translate-y-0"
                  />
                </summary>
                <div className="pb-5 pl-7 text-base leading-relaxed text-ink-soft">{item.a}</div>
              </details>
            ))}
          </div>
        </Reveal>

        <SectionCta
          text="Still have questions? Join the waitlist, or drop us a line and a real person will answer."
          withEmail
        />
      </div>
    </section>
  );
}
