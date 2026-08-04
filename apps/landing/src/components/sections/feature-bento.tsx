"use client";

import { motion, useReducedMotion } from "motion/react";
import { BadgeCheck, MapPin, Scissors, ShieldAlert, Stethoscope } from "lucide-react";
import { useId, useState } from "react";

import { MarqueeRow } from "@/components/motion/MarqueeRow";
import { Reveal } from "@/components/motion/Reveal";
import { SwipeSimulator } from "@/components/motion/SwipeSimulator";
import { SectionHeading } from "@/components/ui/section-heading";
import { SpeciesIcon, type SpeciesKey } from "@/components/ui/species-icon";
import { bentoFeatures, nearbyBusinesses, speciesMarquee } from "@/config/site";
import { cn } from "@/lib/utils";

function BentoCard({
  title,
  body,
  children,
  className,
  id,
}: {
  title: string;
  body: string;
  children: React.ReactNode;
  className?: string;
  id?: string;
}) {
  return (
    <Reveal
      className={cn(
        "flex flex-col gap-6 rounded-3xl border border-border bg-card p-6 shadow-soft sm:p-8",
        className,
      )}
    >
      <div id={id} className="scroll-mt-28">
        <h3 className="text-xl font-semibold">{title}</h3>
        <p className="mt-2 text-sm leading-relaxed text-ink-soft">{body}</p>
      </div>
      <div className="mt-auto">{children}</div>
    </Reveal>
  );
}

/**
 * Verified / unverified comparison.
 *
 * A real checkbox drives it, so it is keyboard operable and announced as a
 * switch. The shimmer is a decorative overlay behind aria-hidden.
 */
function VerificationToggle() {
  const id = useId();
  const [verified, setVerified] = useState(true);
  const reduced = useReducedMotion();

  return (
    <div className="flex flex-col gap-4">
      <div
        className={cn(
          "relative overflow-hidden rounded-2xl border p-4 transition-colors duration-300",
          verified ? "border-verified/30 bg-verified/5" : "border-border bg-secondary/50",
        )}
      >
        {verified && !reduced && (
          <motion.span
            aria-hidden="true"
            className="pointer-events-none absolute inset-y-0 -left-1/3 w-1/3 skew-x-12 bg-gradient-to-r from-transparent via-white/70 to-transparent"
            initial={{ x: 0 }}
            animate={{ x: "420%" }}
            transition={{ duration: 1.8, repeat: Infinity, repeatDelay: 1.6, ease: "easeInOut" }}
          />
        )}
        <div className="flex items-center gap-3">
          <span
            className={cn(
              "grid size-11 shrink-0 place-items-center rounded-xl",
              verified ? "bg-verified/15 text-verified" : "bg-muted text-ink-soft",
            )}
          >
            {verified ? (
              <BadgeCheck className="size-5" aria-hidden="true" />
            ) : (
              <ShieldAlert className="size-5" aria-hidden="true" />
            )}
          </span>
          <div className="min-w-0">
            <p className="truncate font-semibold">{verified ? "Mochi · Verified" : "Mochi · Unverified"}</p>
            <p className="text-xs text-ink-soft">
              {verified
                ? "ID confirmed · Vaccinations current"
                : "No documents on file · Limited matching"}
            </p>
          </div>
        </div>
      </div>

      <label htmlFor={id} className="flex cursor-pointer items-center gap-3 text-sm font-medium">
        <span className="relative inline-flex">
          <input
            id={id}
            type="checkbox"
            role="switch"
            checked={verified}
            onChange={(event) => setVerified(event.target.checked)}
            className="peer size-11 cursor-pointer opacity-0"
          />
          <span
            aria-hidden="true"
            className={cn(
              "pointer-events-none absolute top-1/2 left-0 h-6 w-11 -translate-y-1/2 rounded-full transition-colors duration-200",
              verified ? "bg-verified" : "bg-muted-foreground/40",
            )}
          />
          <span
            aria-hidden="true"
            className={cn(
              "pointer-events-none absolute top-1/2 size-5 -translate-y-1/2 rounded-full bg-white shadow-sm transition-all duration-200",
              verified ? "left-[1.4rem]" : "left-0.5",
            )}
          />
        </span>
        Show verified profile
      </label>
    </div>
  );
}

const BUSINESS_ICONS = [Stethoscope, Scissors, BadgeCheck];

export function FeatureBento() {
  return (
    <section id="features" className="py-20 sm:py-28">
      <div className="section-shell">
        <SectionHeading
          eyebrow="What you get"
          title="Built around how pet owners actually meet"
          body="Discovery, trust, species coverage and local professionals — the four things every other pet app makes you leave to find."
        />

        <div className="mt-14 grid gap-5 lg:grid-cols-6">
          <BentoCard
            title={bentoFeatures.discovery.title}
            body={bentoFeatures.discovery.body}
            className="lg:col-span-2"
          >
            <SwipeSimulator />
          </BentoCard>

          <BentoCard
            title={bentoFeatures.verification.title}
            body={bentoFeatures.verification.body}
            className="lg:col-span-4"
          >
            <VerificationToggle />
          </BentoCard>

          <BentoCard
            title={bentoFeatures.species.title}
            body={bentoFeatures.species.body}
            className="lg:col-span-4"
          >
            <MarqueeRow speed={38}>
              {speciesMarquee.map((pet) => (
                <div
                  key={pet.name}
                  className="flex w-44 shrink-0 items-center gap-3 rounded-2xl border border-border bg-background p-3"
                >
                  <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-brand-soft p-2 text-brand-ink">
                    <SpeciesIcon species={pet.emojiless as SpeciesKey} />
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold">{pet.name}</p>
                    <p className="truncate text-xs text-ink-soft">{pet.species}</p>
                  </div>
                </div>
              ))}
            </MarqueeRow>
          </BentoCard>

          <BentoCard
            id="businesses"
            title={bentoFeatures.businesses.title}
            body={bentoFeatures.businesses.body}
            className="lg:col-span-2"
          >
            <ul className="grid gap-2.5">
              {nearbyBusinesses.map((business, index) => {
                const Icon = BUSINESS_ICONS[index] ?? BadgeCheck;
                return (
                  <li
                    key={business.name}
                    className="group flex items-center gap-3 rounded-2xl border border-border bg-background p-3 transition-colors hover:border-trust/40 hover:bg-trust-soft/50"
                  >
                    <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-trust-soft text-trust">
                      <Icon className="size-4.5" aria-hidden="true" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold">{business.name}</p>
                      <p className="truncate text-xs text-ink-soft">{business.type}</p>
                    </div>
                    <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-secondary px-2 py-1 text-[11px] font-medium text-ink-soft">
                      <MapPin className="size-3" aria-hidden="true" />
                      {business.distance}
                    </span>
                  </li>
                );
              })}
            </ul>
          </BentoCard>
        </div>
      </div>
    </section>
  );
}
