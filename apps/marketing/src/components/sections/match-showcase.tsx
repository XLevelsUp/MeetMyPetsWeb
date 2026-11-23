"use client";

import { ArrowRight, Heart, Sparkles } from "lucide-react";
import Image from "next/image";
import { useEffect, useState } from "react";

import { CountUp } from "@/components/motion/CountUp";
import { Reveal } from "@/components/motion/Reveal";
import { SpeciesIcon } from "@/components/ui/species-icon";
import { matchShowcase as copy } from "@/config/site";
import { fetchMatchCount, type MatchCount, type MatchPet } from "@/lib/match-count";

function speciesKey(species: string | null): string {
  const s = (species ?? "").toLowerCase();
  if (s.includes("dog")) return "dog";
  if (s.includes("cat")) return "cat";
  if (s.includes("rabbit") || s.includes("bunny")) return "rabbit";
  if (s.includes("bird") || s.includes("parrot")) return "bird";
  if (s.includes("fish")) return "fish";
  if (s.includes("turtle") || s.includes("reptile")) return "reptile";
  return "paw";
}

// Pet names are typed in the app, often lower-case; capitalise the first letter for display only.
const displayName = (name: string) => name.charAt(0).toUpperCase() + name.slice(1);

const formatDay = (iso: string) =>
  new Date(`${iso}T00:00:00Z`).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });

function Avatar({ pet, tilt }: { pet: MatchPet; tilt: "left" | "right" }) {
  return (
    <span
      className={`relative block size-24 overflow-hidden rounded-full bg-white/20 ring-4 ring-white shadow-lift sm:size-28 lg:size-32 ${tilt === "left" ? "-rotate-6" : "rotate-6"}`}
    >
      {pet.photoUrl ? (
        // unoptimized: the photo host is the app's storage bucket, which the image optimiser may not allow-list.
        <Image src={pet.photoUrl} alt={displayName(pet.name)} fill sizes="128px" unoptimized className="object-cover" />
      ) : (
        <span className="grid size-full place-items-center p-6 text-white">
          <SpeciesIcon species={speciesKey(pet.species)} />
        </span>
      )}
    </span>
  );
}

// Renders nothing until real data arrives, and nothing if it is unavailable or too small to show.
export function MatchShowcase() {
  const [data, setData] = useState<MatchCount | null>(null);

  useEffect(() => {
    let alive = true;
    fetchMatchCount().then((result) => {
      if (alive) setData(result);
    });
    return () => {
      alive = false;
    };
  }, []);

  if (!data || data.pets < copy.minPets) return null;
  const latest = data.latest;

  return (
    <section
      aria-labelledby="match-showcase-title"
      className="relative scroll-mt-24 overflow-hidden bg-gradient-to-br from-brand via-brand to-brand-ink py-12 text-white sm:py-14 md:py-16"
    >
      {/* Decorative hearts: a different texture from the paw pattern the rest of the page uses. */}
      <Heart aria-hidden="true" className="pointer-events-none absolute top-8 left-[5%] size-12 rotate-[-12deg] fill-white/10 text-white/10 md:size-16" />
      <Heart aria-hidden="true" className="pointer-events-none absolute right-[6%] bottom-8 size-14 rotate-[14deg] fill-white/10 text-white/10 md:size-20" />

      {/* Phones: one centred column (heading, pets, text). md and up: pets on the left, all wording on the right. */}
      <div
        className={`section-shell relative grid grid-cols-1 items-center gap-y-8 text-center ${
          latest ? "md:grid-cols-2 md:gap-x-10 md:text-left lg:gap-x-16" : ""
        }`}
      >
        <Reveal className={latest ? "md:col-start-2 md:row-start-1 md:self-end" : ""}>
          <p className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3.5 py-1 text-xs font-semibold tracking-[0.14em] uppercase backdrop-blur">
            <Sparkles className="size-3.5" aria-hidden="true" />
            {copy.eyebrow}
          </p>
          <h2
            id="match-showcase-title"
            // With a match the heading is one line at every width: sized to the full width on phones, to its half column from md.
            className={`mt-4 font-heading leading-[1.05] font-bold tracking-tight ${
              latest
                ? "text-[clamp(1.375rem,6.2vw,1.875rem)] whitespace-nowrap md:text-[clamp(1.375rem,2.9vw,2.75rem)]"
                : "text-[clamp(1.875rem,4.2vw,3rem)] text-balance"
            }`}
          >
            {latest ? copy.title : copy.fallbackTitle}
          </h2>
        </Reveal>

        {latest ? (
          <Reveal variant="springy" className="md:col-start-1 md:row-span-2 md:row-start-1">
            <figure className="flex flex-col items-center md:rounded-3xl md:border md:border-white/20 md:bg-white/10 md:px-6 md:py-10 md:backdrop-blur">
              <div className="flex items-center">
                <Avatar pet={latest.a} tilt="left" />
                {/* The MeetMyPets brand mark joins the pair. */}
                <span className="relative z-10 -mx-4 grid size-12 place-items-center rounded-full bg-white shadow-lift sm:size-14">
                  <Image src="/brand-mark.png" alt="" aria-hidden="true" width={144} height={144} className="size-8 sm:size-9" />
                </span>
                <Avatar pet={latest.b} tilt="right" />
              </div>
              <figcaption className="mt-5 text-center">
                <p className="font-heading text-xl font-bold sm:text-2xl">
                  <span className="font-medium text-white/80">{copy.namesPrefix}</span> {displayName(latest.a.name)}{" "}
                  <span className="text-white/70">&amp;</span> {displayName(latest.b.name)}{" "}
                  <Heart className="inline-block size-[0.85em] -translate-y-[0.05em] fill-current align-middle" aria-hidden="true" />
                </p>
                <p className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-xs font-medium">
                  <Heart className="size-3 fill-current" aria-hidden="true" />
                  {copy.matchedOn.replace("{date}", formatDay(latest.matchedOn))}
                </p>
              </figcaption>
            </figure>
          </Reveal>
        ) : null}

        <div className={latest ? "md:col-start-2 md:row-start-2 md:self-start" : ""}>
          <Reveal delay={0.1}>
            <p className="mx-auto max-w-xl leading-relaxed text-white/85 md:mx-0">{copy.intro}</p>
          </Reveal>

          <dl className={`mt-6 grid w-full max-w-md grid-cols-2 gap-3 ${latest ? "mx-auto md:mx-0" : "mx-auto"}`}>
            {[
              { value: data.matches, label: copy.stats.matches },
              { value: data.pets, label: copy.stats.pets },
            ].map((stat, index) => (
              <Reveal key={stat.label} delay={0.15 + index * 0.08} className="h-full">
                <div className="h-full rounded-2xl border border-white/20 bg-white/10 px-4 py-4 backdrop-blur">
                  <dt className="font-heading text-[clamp(1.75rem,3.6vw,2.5rem)] leading-none font-bold tabular-nums">
                    <CountUp to={stat.value} />
                  </dt>
                  <dd className="mt-1.5 text-sm font-medium text-white/85">{stat.label}</dd>
                </div>
              </Reveal>
            ))}
          </dl>

          <Reveal delay={0.25}>
            <a
              href={copy.ctaHref}
              className="mt-7 inline-flex items-center gap-2 rounded-full bg-white px-6 py-3 font-semibold text-brand-ink shadow-lift transition hover:bg-white/90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
            >
              {copy.cta}
              <ArrowRight className="size-4" aria-hidden="true" />
            </a>
          </Reveal>

          {latest ? <p className="mt-4 max-w-md text-xs text-white/70 md:max-w-none">{copy.note}</p> : null}
        </div>
      </div>
    </section>
  );
}
