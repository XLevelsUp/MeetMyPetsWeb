import { ArrowRight, PawPrint } from "lucide-react";
import type { Metadata } from "next";

import { Reveal } from "@/components/motion/Reveal";
import { WordReveal } from "@/components/motion/WordReveal";
import { PawScatter } from "@/components/ui/paw-scatter";
import { PhotoSlot } from "@/components/ui/photo-slot";
import { WaveDivider } from "@/components/ui/wave-divider";
import { site, team } from "@/config/site";

const DESCRIPTION =
  "Meet the people building MeetMyPets — the founders, the team, and the three pets who supervise all of it.";

export const metadata: Metadata = {
  title: "Our Team",
  description: DESCRIPTION,
  alternates: { canonical: "/team/" },
  openGraph: {
    type: "website",
    url: "/team/",
    title: `Our Team — ${site.name}`,
    description: DESCRIPTION,
    // A page-level `openGraph` REPLACES the root layout's wholesale (see csae-policy/page.tsx).
    siteName: site.name,
    locale: site.locale,
  },
  robots: { index: true, follow: true },
};

type Person = { name: string; role: string; quote: string };

/** Section label with a dotted rule running off to the right. */
function TierLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-4">
      <h2 className="font-heading text-sm font-bold tracking-[0.18em] text-brand-ink uppercase">
        {children}
      </h2>
      <span
        aria-hidden="true"
        className="h-px flex-1 bg-[repeating-linear-gradient(90deg,var(--border)_0_4px,transparent_4px_10px)]"
      />
    </div>
  );
}

/** Name, role, quote — no portrait. The quote is what distinguishes one card from the next. */
function PersonCard({ person, lead = false }: { person: Person; lead?: boolean }) {
  return (
    <div className="group relative h-full rounded-[1.5rem] border border-border bg-card px-6 py-7 text-center transition-shadow duration-300 hover:shadow-lift">
      <span
        aria-hidden="true"
        className="mx-auto grid size-10 place-items-center rounded-xl bg-brand-soft text-brand-ink transition-colors duration-300 group-hover:bg-brand group-hover:text-white"
      >
        <PawPrint className="size-5" />
      </span>
      <h3
        className={
          lead
            ? "mt-4 font-heading text-xl font-bold text-ink sm:text-2xl"
            : "mt-4 font-heading text-lg font-bold text-ink"
        }
      >
        {person.name}
      </h3>
      <p className="mt-1.5 text-sm font-medium text-brand-ink">{person.role}</p>
      <p className="mt-3 text-sm leading-relaxed text-ink-soft">{person.quote}</p>
    </div>
  );
}

export default function TeamPage() {
  const { groupPhoto, founders, people, pets, cta } = team;

  return (
    <>
      {/* ── 1. Hero ── */}
      <section className="relative scroll-mt-24 overflow-hidden pt-28 pb-12 sm:pt-36 sm:pb-16">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 -z-10"
          style={{
            background:
              "radial-gradient(46rem 28rem at 50% -10%, var(--brand-soft), transparent 70%)",
          }}
        />
        <PawScatter
          paws={[
            { className: "top-[18%] left-[4%] -rotate-[14deg]", size: 56 },
            { className: "bottom-[14%] right-[5%] rotate-[16deg]", size: 48 },
          ]}
        />

        <div className="section-shell text-center">
          <Reveal>
            <p className="text-xs font-semibold tracking-[0.14em] text-brand-ink uppercase">
              {team.eyebrow}
            </p>
            <h1 className="mx-auto mt-5 max-w-4xl font-heading text-[clamp(2.25rem,6vw,4rem)] leading-[1.05] font-bold tracking-tight text-balance">
              {team.title}
            </h1>
          </Reveal>
          <WordReveal
            text={team.intro}
            delay={0.2}
            className="mx-auto mt-7 max-w-2xl text-lg leading-relaxed text-balance text-ink-soft sm:text-xl"
          />
        </div>
      </section>

      {/* ── 2. Group photo ── */}
      <section className="relative scroll-mt-24 pb-14 sm:pb-20">
        <div className="section-shell">
          <Reveal variant="springy">
            <PhotoSlot
              alt={groupPhoto.alt}
              brief={groupPhoto.brief}
              aspect="aspect-[16/9]"
              className="mx-auto w-full max-w-4xl"
            />
          </Reveal>
        </div>
      </section>

      {/* ── 3. Founders — three across, slightly larger than the team tier ── */}
      <section className="relative scroll-mt-24 py-12 sm:py-16">
        <div className="section-shell">
          <Reveal>
            <TierLabel>{founders.label}</TierLabel>
          </Reveal>
          {/* Three across from md: at 768 a 2-col grid left the third card stranded. */}
          <ul className="mt-8 grid grid-cols-1 gap-5 sm:grid-cols-2 md:grid-cols-3 lg:gap-6">
            {founders.members.map((member, i) => (
              <Reveal as="li" key={member.name} delay={i * 0.08}>
                <PersonCard person={member} lead />
              </Reveal>
            ))}
          </ul>
        </div>
      </section>

      {/* ── 4. The team — same card, two rows of three ── */}
      <section className="relative scroll-mt-24 py-12 sm:py-16">
        <div className="section-shell">
          <Reveal>
            <TierLabel>{people.label}</TierLabel>
          </Reveal>
          <ul className="mt-8 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 lg:gap-6">
            {people.members.map((member, i) => (
              <Reveal as="li" key={member.name} delay={i * 0.06}>
                <PersonCard person={member} />
              </Reveal>
            ))}
          </ul>
        </div>
      </section>

      {/* ── 5. The pets — the only tier with photos, so it reads as the payoff ── */}
      <section className="relative scroll-mt-24 overflow-hidden bg-secondary/40 py-14 sm:py-20">
        <PawScatter
          paws={[
            { className: "top-[8%] right-[5%] rotate-[14deg]", size: 52 },
            { className: "bottom-[10%] left-[4%] -rotate-[12deg]", size: 58 },
          ]}
        />
        <div className="section-shell">
          <Reveal className="text-center">
            <h2 className="font-heading text-3xl font-bold tracking-tight uppercase sm:text-4xl">
              <span className="text-ink">And The </span>
              <span className="text-brand">Real Bosses</span>
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-lg text-ink-soft">{pets.lede}</p>
          </Reveal>

          {/* Three across from md, as above — one boss per column, none left over. */}
          <ul className="mt-10 grid grid-cols-1 gap-8 sm:grid-cols-2 md:grid-cols-3 lg:gap-10">
            {pets.members.map((pet, i) => (
              <Reveal as="li" key={pet.name} delay={i * 0.1} variant="springy">
                <div className="h-full text-center">
                  <PhotoSlot
                    src={pet.photo.src}
                    alt={pet.photo.alt}
                    className="w-full"
                  />
                  <h3 className="mt-5 font-heading text-xl font-bold text-ink sm:text-2xl">
                    {pet.name}
                  </h3>
                  <p className="mt-1.5 text-sm font-semibold text-brand-ink">
                    {pet.role} <span className="text-ink-soft">({pet.abbr})</span>
                  </p>
                  <p className="mt-3 leading-relaxed text-ink-soft">{pet.body}</p>
                </div>
              </Reveal>
            ))}
          </ul>
        </div>

        <WaveDivider flip color="color-mix(in oklab, var(--secondary) 40%, var(--background))" />
        <WaveDivider color="var(--background)" />
      </section>

      {/* ── 6. Closing CTA ── */}
      <section className="relative scroll-mt-24 py-14 text-center sm:py-20">
        <div className="section-shell">
          <Reveal>
            <h2 className="font-heading text-3xl leading-tight font-bold text-balance sm:text-4xl">
              {cta.title}
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-lg leading-relaxed text-ink-soft">
              {cta.body}
            </p>
            <a
              href={cta.href}
              className="group mt-8 inline-flex min-h-12 items-center gap-2 rounded-full bg-brand px-8 py-3.5 text-sm font-bold text-white shadow-lift transition-all duration-200 hover:bg-brand-ink hover:shadow-float focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
            >
              {cta.label}
              <ArrowRight
                className="size-4 transition-transform duration-200 group-hover:translate-x-0.5"
                aria-hidden="true"
              />
            </a>
          </Reveal>
        </div>
      </section>
    </>
  );
}
