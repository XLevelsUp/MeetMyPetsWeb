import {
  Apple,
  BadgeCheck,
  Check,
  Heart,
  Layers,
  MapPin,
  MessageCircle,
  PawPrint,
  ShieldCheck,
  Sparkles,
  Users,
} from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { Reveal } from "@/components/motion/Reveal";
import { WordReveal } from "@/components/motion/WordReveal";
import { AppPreview } from "@/components/ui/app-preview";
import { InstallButton } from "@/components/ui/install-button";
import { PawScatter } from "@/components/ui/paw-scatter";
import { SpeciesIcon } from "@/components/ui/species-icon";
import { WaveDivider } from "@/components/ui/wave-divider";
import { appForPets, appStore, site } from "@/config/site";
import { cn } from "@/lib/utils";

const DESCRIPTION =
  "MeetMyPets is a social app for pets and their parents. Create a profile, find pets nearby, match, chat and plan playdates. Install on Google Play.";

export const metadata: Metadata = {
  title: "App for Pets: Find Playmates & Friends",
  description: DESCRIPTION,
  alternates: { canonical: "/app-for-pets/" },
  openGraph: {
    type: "website",
    url: "/app-for-pets/",
    title: `App for Pets: Find Playmates & Friends — ${site.name}`,
    description: DESCRIPTION,
    // A page-level `openGraph` REPLACES the root layout's wholesale (see csae-policy/page.tsx).
    siteName: site.name,
    locale: site.locale,
  },
  robots: { index: true, follow: true },
};

const WHY_ICONS: Record<string, React.ElementType> = {
  match: Heart,
  chat: MessageCircle,
  one: Layers,
  species: PawPrint,
  local: MapPin,
};

const TRUST_ICONS = [BadgeCheck, ShieldCheck, Sparkles, MapPin];
const AUDIENCE_ICONS = [Users, Heart, BadgeCheck, ShieldCheck];
/** The species strip under "why" — the multi-species promise, shown not stated. */
const SPECIES = ["dog", "cat", "bird", "rabbit", "reptile", "fish"];

/**
 * MobileApplication structured data. Mirrors the visible copy exactly — Google
 * penalises markup describing things a user cannot see on the page.
 */
function AppLd() {
  return (
    <script
      type="application/ld+json"
      // Authored locally in this repo, never user input.
      dangerouslySetInnerHTML={{
        __html: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "MobileApplication",
          name: site.name,
          operatingSystem: "Android",
          applicationCategory: "SocialNetworkingApplication",
          description: DESCRIPTION,
          url: `${site.url}/app-for-pets/`,
          downloadUrl: appStore.android,
          installUrl: appStore.android,
          offers: { "@type": "Offer", price: "0", priceCurrency: "INR" },
          publisher: { "@type": "Organization", name: site.legalEntity },
        }),
      }}
    />
  );
}

export default function AppForPetsPage() {
  return (
    <>
      <AppLd />

      {/* ── 1. Hero ── */}
      <section className="relative scroll-mt-24 overflow-hidden pt-28 pb-14 sm:pt-36 sm:pb-20">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 -z-10"
          style={{
            background:
              "radial-gradient(48rem 28rem at 50% -8%, var(--brand-soft), transparent 70%)",
          }}
        />
        <PawScatter
          paws={[
            { className: "top-[20%] left-[5%] -rotate-[14deg]", size: 54 },
            { className: "bottom-[16%] right-[6%] rotate-[16deg]", size: 46 },
          ]}
        />

        <div className="section-shell">
          <div className="grid grid-cols-1 items-center gap-12 lg:grid-cols-[1.05fr_0.95fr] lg:gap-16">
            <div className="text-center lg:text-left">
              <Reveal>
                <p className="text-xs font-semibold tracking-[0.14em] text-brand-ink uppercase">
                  {appForPets.eyebrow}
                </p>
                <h1 className="mt-5 font-heading text-[clamp(2.25rem,5.5vw,4rem)] leading-[1.05] font-bold tracking-tight text-balance">
                  {appForPets.title}
                </h1>
              </Reveal>

              <WordReveal
                text={appForPets.intro}
                delay={0.2}
                className="mx-auto mt-6 max-w-xl text-lg leading-relaxed text-ink-soft lg:mx-0 lg:text-xl"
              />

              <Reveal delay={0.1}>
                <div className="mt-8 flex flex-col items-center gap-4 sm:flex-row sm:justify-center lg:justify-start">
                  <InstallButton size="lg" showArrow />
                  {/* iOS was a grey caption that read as fine print. A chip with
                      the platform icon states it as a fact, not a disclaimer. */}
                  <span className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-4 py-2.5 text-sm font-semibold text-ink-soft shadow-soft">
                    <Apple className="size-4" aria-hidden="true" />
                    iOS coming soon
                  </span>
                </div>
                <p className="mt-5 text-sm text-ink-soft">{appForPets.note}</p>
              </Reveal>
            </div>

            <Reveal variant="springy" delay={0.15}>
              <AppPreview />
            </Reveal>
          </div>
        </div>
      </section>

      {/* ── 2. What is the best app — the question the page ranks for ── */}
      <section className="relative scroll-mt-24 py-12 sm:py-16">
        <div className="section-shell">
          <Reveal className="mx-auto max-w-3xl text-center">
            <h2 className="font-heading text-2xl leading-tight font-bold text-balance sm:text-3xl">
              {appForPets.best.title}
            </h2>
            <p className="mt-5 text-lg leading-relaxed text-ink-soft">{appForPets.best.body}</p>
          </Reveal>
        </div>
      </section>

      {/* ── 3. How it works ── */}
      <section className="relative scroll-mt-24 bg-secondary/40 py-14 sm:py-20">
        <PawScatter
          paws={[
            { className: "top-[12%] right-[6%] rotate-[12deg]", size: 46 },
            { className: "bottom-[14%] left-[5%] -rotate-[10deg]", size: 50 },
          ]}
        />
        <div className="section-shell">
          <Reveal className="text-center">
            <h2 className="font-heading text-3xl leading-tight font-bold text-balance sm:text-4xl">
              {appForPets.steps.title}
            </h2>
          </Reveal>

          {/* Vertical timeline: the spine makes the four steps read as one
              sequence, which four separate cards did not. */}
          <ol className="relative mx-auto mt-10 max-w-3xl">
            <span
              aria-hidden="true"
              className="absolute top-6 bottom-6 left-[1.4rem] w-1 rounded-full bg-gradient-to-b from-[#ffc400] via-[#ff7a1a] to-brand"
            />
            {appForPets.steps.items.map((step, i) => (
              <Reveal as="li" key={step.title} delay={i * 0.08} className="relative pb-9 pl-16 last:pb-0">
                <span className="absolute top-0 left-0 grid size-12 place-items-center rounded-full bg-brand font-heading text-base font-black text-white shadow-lift ring-4 ring-background">
                  {i + 1}
                </span>
                <h3 className="pt-2.5 font-heading text-lg font-bold text-ink sm:text-xl">
                  {step.title}
                </h3>
                <p className="mt-1.5 leading-relaxed text-ink-soft">{step.body}</p>
              </Reveal>
            ))}
          </ol>
        </div>

        <WaveDivider flip color="color-mix(in oklab, var(--secondary) 40%, var(--background))" />
        <WaveDivider color="var(--background)" />
      </section>

      {/* ── 4. Why pet parents choose it ── */}
      <section className="relative scroll-mt-24 py-14 sm:py-20">
        <div className="section-shell">
          <Reveal className="text-center">
            <h2 className="font-heading text-3xl leading-tight font-bold text-balance sm:text-4xl">
              {appForPets.why.title}
            </h2>
          </Reveal>

          <div className="mx-auto mt-10 grid max-w-5xl grid-cols-1 gap-4 md:grid-cols-6 lg:gap-5">
            {appForPets.why.items.map((item, i) => {
              const Icon = WHY_ICONS[item.icon] ?? PawPrint;
              const lead = i === 0;
              const species = item.icon === "species";
              return (
                <Reveal
                  key={item.title}
                  delay={i * 0.06}
                  className={cn(
                    lead ? "md:col-span-6" : "md:col-span-3",
                    // Four cards below the lead pair evenly; the species card
                    // takes the wider slot because it carries the glyph strip.
                    species && "md:col-span-6 lg:col-span-3",
                  )}
                >
                  <div
                    className={cn(
                      "group relative h-full overflow-hidden rounded-[1.5rem] border bg-card px-6 py-6 shadow-soft transition-shadow duration-300 hover:shadow-lift",
                      lead ? "border-brand/30 bg-brand-soft/30" : "border-border",
                    )}
                  >
                    <div className={cn("flex items-start gap-4", lead && "sm:items-center")}>
                      <span
                        className={cn(
                          "grid shrink-0 place-items-center rounded-2xl transition-colors duration-300",
                          lead
                            ? "size-13 bg-brand text-white"
                            : "size-11 bg-brand-soft text-brand-ink group-hover:bg-brand group-hover:text-white",
                        )}
                      >
                        <Icon className={lead ? "size-6" : "size-5"} aria-hidden="true" />
                      </span>
                      <div>
                        <h3
                          className={cn(
                            "font-heading font-bold text-ink",
                            lead ? "text-lg sm:text-xl" : "text-base sm:text-lg",
                          )}
                        >
                          {item.title}
                        </h3>
                        <p className="mt-1.5 text-sm leading-relaxed text-ink-soft">{item.body}</p>
                      </div>
                    </div>

                    {/* The "every pet" claim, shown rather than stated. */}
                    {species && (
                      <ul className="mt-5 flex flex-wrap gap-2">
                        {SPECIES.map((sp) => (
                          <li
                            key={sp}
                            className="grid size-10 place-items-center rounded-xl bg-brand-soft/70 text-brand-ink"
                          >
                            <SpeciesIcon species={sp} className="size-5" />
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </Reveal>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── 5. Trust and safety ── */}
      <section className="relative scroll-mt-24 bg-secondary/40 py-14 sm:py-20">
        <PawScatter
          paws={[
            { className: "top-[10%] left-[4%] -rotate-[12deg]", size: 50 },
            { className: "bottom-[12%] right-[5%] rotate-[14deg]", size: 44 },
          ]}
        />
        <div className="section-shell">
          {/* Copy left, badge panel right: the panel shows the three badges a
              user actually sees in the app, so the claim is demonstrated. */}
          <div className="grid grid-cols-1 items-center gap-10 lg:grid-cols-[1.1fr_0.9fr] lg:gap-16">
            <div>
              <Reveal>
                <h2 className="font-heading text-3xl leading-tight font-bold text-balance sm:text-4xl">
                  {appForPets.trust.title}
                </h2>
              </Reveal>

              <ul className="mt-7 space-y-5">
                {appForPets.trust.items.map((item, i) => {
                  const Icon = TRUST_ICONS[i] ?? ShieldCheck;
                  return (
                    <Reveal as="li" key={item.title} delay={i * 0.07}>
                      <div className="flex items-start gap-3.5">
                        <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-trust-soft text-trust">
                          <Icon className="size-4.5" aria-hidden="true" />
                        </span>
                        <p className="leading-relaxed text-ink-soft">
                          <strong className="font-bold text-ink">{item.title}.</strong> {item.body}
                        </p>
                      </div>
                    </Reveal>
                  );
                })}
              </ul>
            </div>

            <Reveal variant="springy" delay={0.1}>
              <div
                aria-hidden="true"
                className="mx-auto w-full max-w-sm rounded-[1.75rem] border-2 border-border bg-card px-6 py-7 shadow-lift"
              >
                <ul className="space-y-5">
                  {[
                    { label: "ID verified", tone: "brand" },
                    { label: "Vaccination verified", tone: "brand" },
                    { label: "Within 1 km", tone: "ink" },
                  ].map((badge) => (
                    <li key={badge.label} className="flex items-center gap-3.5">
                      <span
                        className={cn(
                          "grid size-10 shrink-0 place-items-center rounded-full text-white",
                          badge.tone === "brand" ? "bg-brand" : "bg-ink",
                        )}
                      >
                        {badge.tone === "brand" ? (
                          <Check className="size-5" strokeWidth={3} />
                        ) : (
                          <span className="size-2.5 rounded-full bg-white" />
                        )}
                      </span>
                      <span className="font-heading text-base font-bold text-ink">
                        {badge.label}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            </Reveal>
          </div>
        </div>

        <WaveDivider flip color="color-mix(in oklab, var(--secondary) 40%, var(--background))" />
        <WaveDivider color="var(--background)" />
      </section>

      {/* ── 6. Who it is for ── */}
      <section className="relative scroll-mt-24 py-14 sm:py-20">
        <div className="section-shell">
          <Reveal className="text-center">
            <h2 className="font-heading text-3xl leading-tight font-bold text-balance sm:text-4xl">
              {appForPets.audience.title}
            </h2>
          </Reveal>

          <ul className="mx-auto mt-10 grid max-w-5xl grid-cols-1 gap-4 sm:grid-cols-2 lg:gap-5">
            {appForPets.audience.items.map((item, i) => {
              const Icon = AUDIENCE_ICONS[i] ?? Users;
              return (
                <Reveal as="li" key={item.title} delay={i * 0.07}>
                  <div className="group flex h-full items-start gap-4 rounded-[1.5rem] border border-border bg-card px-6 py-6 shadow-soft transition-shadow duration-300 hover:shadow-lift">
                    <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-brand-soft text-brand-ink transition-colors duration-300 group-hover:bg-brand group-hover:text-white">
                      <Icon className="size-5.5" aria-hidden="true" />
                    </span>
                    <div>
                      <h3 className="font-heading text-base font-bold text-ink sm:text-lg">
                        {item.title}
                      </h3>
                      <p className="mt-1.5 text-sm leading-relaxed text-ink-soft">{item.body}</p>
                    </div>
                  </div>
                </Reveal>
              );
            })}
          </ul>

          <Reveal className="mt-8 text-center">
            <p className="text-ink-soft">
              Have more questions? Read the{" "}
              <Link href="/#faq" className="font-semibold text-brand-ink underline-offset-4 hover:underline">
                frequently asked questions
              </Link>{" "}
              on our homepage.
            </p>
          </Reveal>
        </div>
      </section>

      {/* ── 7. Comparison. Cards below md: a 3-column table at 375px either
             scrolls sideways or crushes to unreadable columns. ── */}
      <section className="relative scroll-mt-24 py-14 sm:py-20">
        <div className="section-shell">
          <Reveal className="text-center">
            <h2 className="font-heading text-3xl leading-tight font-bold text-balance sm:text-4xl">
              {appForPets.compare.title}
            </h2>
          </Reveal>

          <Reveal className="mx-auto mt-10 max-w-4xl">
            <div className="hidden overflow-hidden rounded-[1.5rem] border border-border shadow-soft md:block">
              <table className="w-full border-collapse text-left">
                <thead>
                  <tr className="bg-secondary/60">
                    {appForPets.compare.columns.map((col) => (
                      <th
                        key={col}
                        scope="col"
                        className="px-5 py-4 font-heading text-sm font-bold text-ink"
                      >
                        {col}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {appForPets.compare.rows.map((row) => (
                    <tr
                      key={row.option}
                      className={cn(
                        "border-t border-border",
                        "us" in row && row.us ? "bg-brand-soft/50" : "bg-card",
                      )}
                    >
                      <td
                        className={cn(
                          "px-5 py-4 align-top",
                          "us" in row && row.us ? "font-bold text-brand-ink" : "font-semibold text-ink",
                        )}
                      >
                        {row.option}
                      </td>
                      <td className="px-5 py-4 align-top text-sm text-ink-soft">{row.good}</td>
                      <td className="px-5 py-4 align-top text-sm text-ink-soft">{row.limit}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <ul className="grid grid-cols-1 gap-4 md:hidden">
              {appForPets.compare.rows.map((row) => (
                <li
                  key={row.option}
                  className={cn(
                    "rounded-2xl border px-5 py-5",
                    "us" in row && row.us
                      ? "border-brand bg-brand-soft/50"
                      : "border-border bg-card",
                  )}
                >
                  <p
                    className={cn(
                      "font-heading font-bold",
                      "us" in row && row.us ? "text-brand-ink" : "text-ink",
                    )}
                  >
                    {row.option}
                  </p>
                  <p className="mt-2 flex items-start gap-2 text-sm text-ink-soft">
                    <Check className="mt-0.5 size-4 shrink-0 text-verified" aria-hidden="true" />
                    {row.good}
                  </p>
                  <p className="mt-1.5 text-sm text-ink-soft">{row.limit}</p>
                </li>
              ))}
            </ul>
          </Reveal>
        </div>
      </section>

      {/* ── 8. Closing CTA ── */}
      <section className="relative scroll-mt-24 overflow-hidden bg-brand py-16 text-center sm:py-20">
        <PawScatter
          paws={[
            { className: "top-[16%] left-[8%] -rotate-[18deg]", size: 68 },
            { className: "bottom-[14%] right-[9%] rotate-[14deg]", size: 56 },
          ]}
          opacity={0.12}
        />
        <div className="section-shell">
          <Reveal>
            <h2 className="font-heading text-3xl leading-tight font-bold text-balance text-white sm:text-4xl">
              {appForPets.cta.title}
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-lg leading-relaxed text-white/85">
              {appForPets.cta.body}
            </p>
            <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <InstallButton variant="elevated" size="lg" showArrow />
              <button
                type="button"
                disabled
                aria-label="iOS app coming soon"
                className="inline-flex min-h-14 cursor-not-allowed items-center gap-2.5 rounded-full border-2 border-white/70 bg-white/15 px-5 py-3 text-base font-bold text-white backdrop-blur-sm"
              >
                <Apple className="size-5" aria-hidden="true" />
                <span className="text-left leading-tight">
                  iOS
                  <span className="block text-xs font-semibold text-white/80">Coming soon</span>
                </span>
              </button>
            </div>
          </Reveal>
        </div>
      </section>
    </>
  );
}
