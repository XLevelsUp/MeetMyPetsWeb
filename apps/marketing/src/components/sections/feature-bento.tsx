"use client";

import { m, useReducedMotion } from "motion/react";
import {
  BadgeCheck,
  Bird,
  Building2,
  Compass,
  MapPin,
  PawPrint,
  Rabbit,
  Scissors,
  ShieldAlert,
  ShieldCheck,
  Stethoscope,
  Turtle,
} from "lucide-react";
import Image from "next/image";
import { useId, useState } from "react";

import { FloatingPetBg } from "@/components/motion/FloatingPetBg";
import { MarqueeRow } from "@/components/motion/MarqueeRow";
import { Reveal } from "@/components/motion/Reveal";
import { SwipeSimulator } from "@/components/motion/SwipeSimulator";
import { PawScatter } from "@/components/ui/paw-scatter";
import { SectionCta } from "@/components/ui/section-cta";
import { SpeciesIcon, type SpeciesKey } from "@/components/ui/species-icon";
import { bentoFeatures, nearbyBusinesses, speciesMarquee } from "@/config/site";
import { cn } from "@/lib/utils";
import { HERO_BLOB_PATH } from "@/components/ui/blob-clip";


const BUSINESS_PHOTOS = [
  { src: "/pet-yorkshire-terrier.webp", alt: "A Yorkshire Terrier at the vet" },
  { src: "/pet-goldendoodle.webp",       alt: "A well-groomed Goldendoodle" },
  { src: "/pet-corgi-puppy.webp",        alt: "A trained Corgi" },
];

/**
 * One bento tile: accent rail, corner colour wash and an icon chip beside
 * the title. `tone` alternates the brand hues so the four read as a set.
 * Hover uses `translate`, not `transform`, so it never fights
 * `.card-paw:hover`'s rotate.
 */
function BentoCard({
  title,
  body,
  children,
  className,
  id,
  paw = "card-paw",
  tone = "brand",
  icon: Icon,
  decoration,
  flush = false,
}: {
  title: string;
  body: string;
  children: React.ReactNode;
  className?: string;
  id?: string;
  paw?: "card-paw" | "card-paw-alt";
  tone?: "brand" | "trust";
  icon?: React.ElementType;
  /** When true the children div does NOT get `mt-auto` — the content
   *  flows naturally right after the body text. Use for list-style cards
   *  (businesses) where `mt-auto` pushes the list to the card's bottom
   *  edge and creates a gap when the card is stretched tall. */
  flush?: boolean;
  decoration?: React.ReactNode;
}) {
  const brand = tone === "brand";
  return (
    <Reveal className={cn("min-w-0", className)} variant="springy">
      <div
        className={cn(
          "group relative flex h-full w-full min-w-0 flex-col gap-6 overflow-hidden border border-border/70 bg-card p-6 shadow-soft transition-[translate,box-shadow] duration-300 hover:-translate-y-1 hover:shadow-lift sm:p-8 lg:p-6 xl:p-8",
          paw,
        )}
      >
        <span
          aria-hidden="true"
          className={cn(
            "pointer-events-none absolute inset-x-0 top-0 h-1 opacity-70 transition-opacity duration-300 group-hover:opacity-100",
            brand
              ? "bg-gradient-to-r from-brand via-brand/60 to-transparent"
              : "bg-gradient-to-r from-trust via-trust/60 to-transparent",
          )}
        />
        <span
          aria-hidden="true"
          className={cn(
            "pointer-events-none absolute -top-20 -right-20 size-56 rounded-full opacity-70 blur-2xl",
            brand ? "bg-brand-soft" : "bg-trust-soft",
          )}
        />

        <div id={id} className="relative scroll-mt-28">
          <div className="flex items-center gap-3">
            {Icon && (
              <span
                className={cn(
                  "grid size-10 shrink-0 place-items-center rounded-xl shadow-soft ring-1",
                  brand ? "bg-brand-soft text-brand-ink ring-brand/10" : "bg-trust-soft text-trust ring-trust/10",
                )}
              >
                <Icon className="size-5" aria-hidden="true" />
              </span>
            )}
            <h3 className="text-xl font-semibold">{title}</h3>
          </div>
          <p className="mt-3 text-sm leading-relaxed text-ink-soft">{body}</p>
        </div>
        {decoration}
        <div className={cn("relative w-full min-w-0", !flush && "mt-auto")}>{children}</div>
      </div>
    </Reveal>
  );
}

/**
 * Verified / unverified comparison.
 *
 * Was a single toggle switching between one card's two states — content-
 * light next to this bento's other cards (a 3-card swipe stack, a 3-row
 * business list), which left this card mostly empty above the toggle. The
 * section's own copy is literally "never look the same": showing both
 * states side by side makes that claim visible at a glance instead of
 * making a visitor click to compare, and fills the card with real content
 * rather than decoration. The toggle switch controls which side gets the
 * shimmer + emphasis, so it stays interactive rather than becoming a static
 * before/after graphic.
 */
function ProfileCard({ isVerified, reduced }: { isVerified: boolean; reduced: boolean }) {
  return (
    <div
      className={cn(
        "relative flex-1 overflow-hidden rounded-2xl border p-4 transition-all duration-300",
        isVerified
          ? "border-verified/30 bg-verified/5"
          : "border-border bg-secondary/50 opacity-60 grayscale-[0.4]",
      )}
    >
      {isVerified && !reduced && (
        <m.span
          aria-hidden="true"
          className="pointer-events-none absolute inset-y-0 -left-1/3 w-1/3 skew-x-12 bg-gradient-to-r from-transparent via-white/70 to-transparent"
          initial={{ x: 0 }}
          animate={{ x: "420%" }}
          transition={{ duration: 1.8, repeat: Infinity, repeatDelay: 1.6, ease: "easeInOut" }}
        />
      )}
      <span
        className={cn(
          "grid size-11 place-items-center rounded-xl",
          isVerified ? "bg-verified/15 text-verified" : "bg-muted text-ink-soft",
        )}
      >
        {isVerified ? (
          <BadgeCheck className="size-5" aria-hidden="true" />
        ) : (
          <ShieldAlert className="size-5" aria-hidden="true" />
        )}
      </span>
      <p className="mt-3 truncate font-semibold">{isVerified ? "Mochi · Verified" : "Mochi · Unverified"}</p>
      <p className="mt-1 text-xs leading-relaxed text-ink-soft">
        {isVerified
          ? "ID confirmed · Vaccinations current"
          : "No documents on file · Limited matching"}
      </p>
    </div>
  );
}

function VerificationToggle() {
  const id = useId();
  const [verified, setVerified] = useState(true);
  const reduced = useReducedMotion();

  return (
    <div className="flex flex-col gap-4">
      <div className="flex gap-3">
        <ProfileCard isVerified={verified} reduced={Boolean(reduced)} />
        <ProfileCard isVerified={!verified} reduced={Boolean(reduced)} />
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
        Swap which side is verified
      </label>
    </div>
  );
}

const BUSINESS_ICONS = [Stethoscope, Scissors, BadgeCheck];

export function FeatureBento() {
  return (
    <section id="features" className="relative overflow-hidden py-10 sm:py-14">
      {/* SVG defs for blob clip path used on pet photos inside cards */}
      <svg aria-hidden="true" className="pointer-events-none absolute size-0">
        <defs>
          <clipPath id="bento-blob" clipPathUnits="objectBoundingBox">
            <path d={HERO_BLOB_PATH} />
          </clipPath>
        </defs>
      </svg>

      {/* Gradient wash — anchors the bento grid to the site palette. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 -z-10"
        style={{
          background:
            "radial-gradient(46rem 24rem at 88% 100%, var(--trust-soft), transparent 65%)",
        }}
      />

      {/* Animated ambient layer — drifting paw prints + floating bones.
          Compositor-driven CSS keyframes, zero JS per frame. Falls back
          to the static PawScatter below under prefers-reduced-motion. */}
      <FloatingPetBg />

      {/* Static paw scatter — visible immediately (even before JS hydrates)
          and serves as the reduced-motion fallback for FloatingPetBg. */}
      <PawScatter
        paws={[
          { className: "top-[6%] left-[3%] rotate-[8deg]", size: 46 },
          { className: "bottom-[8%] right-[4%] -rotate-[16deg]", size: 58 },
        ]}
      />
      <div className="section-shell">
        {/* Section heading with a breathing paw accent — draws the eye to
            the section start with the same paw-pulse cadence used on the
            background and discovery card decorations. */}
        <Reveal className="mx-auto max-w-2xl text-center">
          <p className="flex items-center justify-center gap-2 text-xs font-semibold tracking-[0.14em] text-brand-ink uppercase">
            <PawPrint className="size-3.5 motion-safe:animate-paw-pulse" style={{ opacity: 0.7 }} aria-hidden="true" />
            What you get
            <PawPrint className="size-3.5 motion-safe:animate-paw-pulse" style={{ opacity: 0.7, animationDelay: "3s" }} aria-hidden="true" />
          </p>
          <h2 className="mt-3 text-section font-semibold">Built around how pet owners actually meet</h2>
          <p className="mt-4 text-lg leading-relaxed text-ink-soft">Discovery, trust, species coverage and local professionals — the four things every other pet app makes you leave to find.</p>
        </Reveal>

        {/* One column on phones, an even 2x2 on tablets, the 6-col bento at lg.
            At md every card spans one column deliberately: the asymmetric
            2/4/4/2 rhythm needs six columns to read as a bento, and forcing it
            into two produced a 1-2-2-1 stack with a hole beside each narrow
            card. Four equal cards is the honest tablet shape. */}
        {/* `grid-cols-1` is load-bearing, not redundant. Tailwind compiles
            grid-cols-* to `minmax(0, 1fr)`; with NO grid-cols class the implicit
            column is `auto`, whose min-width resolves to min-content. The
            species card contains a `w-max` marquee track (~3066px), so the
            column grew to fit it and the whole page scrolled sideways at
            mobile widths. Measured: documentElement.scrollWidth was 3066 at
            375px. The md/lg tiers never showed it because their explicit
            tracks already clamp the minimum to 0. */}
        <div className="mt-10 grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-6">
          {/* Discovery card — a floating pet photo sits in the right half of the
              card at sm+ as an ambient visual anchor. Blob-clipped so it matches
              the ecosystem panel treatment and doesn't read as a plain rectangle. */}
          <BentoCard
            title={bentoFeatures.discovery.title}
            body={bentoFeatures.discovery.body}
            className="lg:col-span-2"
            paw="card-paw"
            tone="brand"
            icon={Compass}
            decoration={
              /* Breathing paw prints — two ghost prints staggered in delay so
                 they pulse alternately like a heartbeat. Uses the paw-pulse
                 CSS keyframe (compositor thread, zero JS per frame). */
              <>
                <PawPrint
                  aria-hidden="true"
                  className="pointer-events-none absolute right-4 top-[38%] hidden -translate-y-1/2 size-24 -rotate-12 text-brand sm:block motion-safe:animate-paw-pulse"
                  style={{ opacity: 0.06 }}
                />
                <PawPrint
                  aria-hidden="true"
                  className="pointer-events-none absolute right-14 top-[62%] hidden -translate-y-1/2 size-14 rotate-[18deg] text-brand sm:block motion-safe:animate-paw-pulse"
                  style={{ opacity: 0.05, animationDelay: "3s" }}
                />
              </>
            }
          >
            <SwipeSimulator />
          </BentoCard>

          {/* Verification card — a dog cutout hangs off the top-right corner,
              OUTSIDE the card boundary (not clipped inside it like the
              discovery card's ambient photo), the same "sticker peeking over
              the edge" treatment the hero's flip card used to carry. Sized
              to ~1.3x MMP Dog 01.webp's native 166x93px — noticeably bigger
              than the in-card decorations elsewhere in this bento, without
              stretching the illustration soft. `relative` on the wrapper
              className (not the card's own root) since BentoCard's root is
              already `relative overflow-hidden`, and `overflow-hidden`
              would clip anything hanging outside it — the sticker needs its
              own ancestor without that clip. */}
          <div className="relative lg:col-span-4">
            {/* Dog sticker — the existing illustration now gently bobs using
                the CSS `float` keyframe that's already defined in globals.css,
                giving this static decoration the most visible pet-themed
                motion in the section. */}
            <Image
              src="/MMP Dog 01.webp"
              alt=""
              aria-hidden="true"
              width={166}
              height={93}
              className="pointer-events-none absolute -top-8 right-6 z-10 h-auto w-24 object-contain drop-shadow-lg motion-safe:animate-float sm:-top-10 sm:right-8 sm:w-28 lg:-top-12 lg:right-10 lg:w-32"
            />
            <BentoCard
              title={bentoFeatures.verification.title}
              body={bentoFeatures.verification.body}
              paw="card-paw-alt"
              tone="trust"
              icon={ShieldCheck}
            >
              <VerificationToggle />
            </BentoCard>
          </div>

          <BentoCard
            title={bentoFeatures.species.title}
            body={bentoFeatures.species.body}
            className="lg:col-span-4"
            paw="card-paw"
            tone="brand"
            icon={PawPrint}
            decoration={
              // The copy names exactly these three species (rabbits,
              // parrots, reptiles) as the ones other apps treat as an
              // afterthought — scattering their glyphs low-opacity behind
              // the empty middle of the card both fills the dead space
              // this row's taller sibling created and echoes the claim
              // rather than being generic paw-print filler.
              <div
                aria-hidden="true"
                className="pointer-events-none absolute inset-x-0 top-1/2 -z-0 flex -translate-y-1/2 items-center justify-center gap-10 opacity-[0.08]"
              >
                {/* Each ghost animal gets the wiggle-tail CSS keyframe with
                    staggered delays so they sway independently rather than
                    in lockstep — gives the impression of three different
                    critters fidgeting, not one animation on three copies. */}
                <Rabbit className="size-16 -rotate-12 motion-safe:animate-wiggle-tail" strokeWidth={1.4} style={{ animationDelay: "0s" }} />
                <Bird className="size-20 rotate-6 motion-safe:animate-wiggle-tail" strokeWidth={1.4} style={{ animationDelay: "0.8s" }} />
                <Turtle className="size-16 -rotate-6 motion-safe:animate-wiggle-tail" strokeWidth={1.4} style={{ animationDelay: "1.6s" }} />
              </div>
            }
          >
            <MarqueeRow speed={38}>
              {speciesMarquee.map((pet) => (
                <div
                  key={pet.name}
                  className="flex w-44 shrink-0 items-center gap-3 rounded-2xl border border-border bg-background p-3"
                >
                  {/* photo when the entry has a stand-in image (see site.ts's
                      PetPhoto note); species without one (currently
                      bird/rabbit/reptile — no photos exist for those species
                      yet) fall back to the existing icon swatch, never a
                      broken or missing image. */}
                  <span className="relative grid size-10 shrink-0 place-items-center overflow-hidden rounded-xl bg-brand-soft text-brand-ink">
                    {"photo" in pet && pet.photo ? (
                      <Image src={pet.photo.src} alt={pet.photo.alt} fill sizes="40px" className="object-cover" loading="eager" />
                    ) : (
                      <SpeciesIcon species={pet.emojiless as SpeciesKey} className="p-2" />
                    )}
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold">{pet.name}</p>
                    <p className="truncate text-xs text-ink-soft">{pet.species}</p>
                  </div>
                </div>
              ))}
            </MarqueeRow>
          </BentoCard>

          {/* Businesses card — each row now carries a small blob-clipped pet
              photo thumbnail as a visual anchor, turning the plain text list
              into something that reads as a real directory rather than a
              generic bullet list. */}
          <BentoCard
            id="businesses"
            title={bentoFeatures.businesses.title}
            body={bentoFeatures.businesses.body}
            className="lg:col-span-2"
            paw="card-paw-alt"
            tone="trust"
            icon={Building2}
            flush
          >
            {/* Each business row staggers in from the right via Reveal —
                fires once on scroll, no ongoing JS cost after the springs
                settle. The index-based delay creates a cascading entrance
                that draws the eye down the list. */}
            <ul className="flex flex-col gap-2.5 w-full min-w-0">
              {nearbyBusinesses.map((business, index) => {
                const Icon = BUSINESS_ICONS[index] ?? BadgeCheck;
                const photo = BUSINESS_PHOTOS[index];
                return (
                  <Reveal key={business.name} as="li" variant="springy" delay={index * 0.1} y={10}>
                    <div
                      className="group flex w-full min-w-0 items-center gap-2.5 sm:gap-3 rounded-2xl border border-border bg-background p-2.5 sm:p-3 transition-colors hover:border-trust/40 hover:bg-trust-soft/50"
                    >
                      {/* Pet photo thumbnail replaces the generic colour swatch —
                          same slot size and shape, but a real image of a pet
                          that's been to this type of professional. Blob-clip
                          matches the ecosystem panel treatment. */}
                      <span className="relative grid size-9 sm:size-10 shrink-0 place-items-center overflow-hidden rounded-xl bg-trust-soft text-trust">
                        {photo ? (
                          <Image src={photo.src} alt={photo.alt} fill sizes="40px" className="object-cover object-top" />
                        ) : (
                          <Icon className="size-4 sm:size-4.5" aria-hidden="true" />
                        )}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold">{business.name}</p>
                        <p className="flex items-center gap-1 truncate text-xs text-ink-soft">
                          <Icon className="size-3 shrink-0" aria-hidden="true" />
                          {business.type}
                        </p>
                      </div>
                      <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-secondary px-2 py-0.5 sm:py-1 text-[11px] font-medium text-ink-soft">
                        <MapPin className="size-3" aria-hidden="true" />
                        {business.distance}
                      </span>
                    </div>
                  </Reveal>
                );
              })}
            </ul>
          </BentoCard>
        </div>

        <SectionCta text="All of this, before the app even launches." buttonLabel="Get early access" />
      </div>
    </section>
  );
}
