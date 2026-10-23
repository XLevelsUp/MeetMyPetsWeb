"use client";

import { AnimatePresence, m, useReducedMotion } from "motion/react";
import {
  BadgeCheck,
  CheckCircle2,
  Heart,
  MapPin,
  MessageCircle,
  PawPrint,
  Radio,
  ShieldCheck,
  Star,
  Users,
  X,
} from "lucide-react";
import Image from "next/image";
import { useState } from "react";

import { Reveal } from "@/components/motion/Reveal";
import { InstallButton } from "@/components/ui/install-button";
import { VipBadge } from "@/components/ui/vip-badge";

/** Sleek Apple Store card reflecting active iOS development */
function AppleStoreButton() {
  return (
    <div
      aria-label="iOS version coming soon"
      className="inline-flex min-h-14 items-center justify-between gap-3.5 rounded-2xl border border-border/80 bg-card/75 px-5 py-3 text-ink-soft select-none backdrop-blur-sm transition-all duration-200 hover:border-brand/30 hover:bg-card"
    >
      <div className="flex items-center gap-3">
        <div className="grid size-9 place-items-center rounded-xl bg-ink/5 text-ink">
          <svg
            viewBox="0 0 24 24"
            fill="currentColor"
            className="size-5 shrink-0"
            aria-hidden="true"
          >
            <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M15.97 6.37c.62-.75 1.04-1.8 1.01-2.87-.91.04-2.02.61-2.67 1.36-.58.67-1.08 1.74-.95 2.78 1.02.08 2.05-.52 2.61-1.27z" />
          </svg>
        </div>
        <span className="text-sm font-bold tracking-tight text-ink sm:text-base whitespace-nowrap">
          Apple App Store
        </span>
      </div>
      <span className="rounded-full bg-trust-soft px-2.5 py-1 text-[11px] font-bold text-trust whitespace-nowrap">
        Soon
      </span>
    </div>
  );
}

/** Interactive Mobile App Phone Mockup showcasing the live pet matching experience */
function PhoneAppShowcase() {
  const reduced = useReducedMotion();
  const [liked, setLiked] = useState(false);

  return (
    <div className="relative mx-auto w-full max-w-[320px] sm:max-w-[340px] lg:max-w-[360px]">
      {/* Outer ambient glow behind phone */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -inset-6 -z-10 rounded-[3rem] bg-gradient-to-tr from-brand/20 via-brand-soft to-trust/20 blur-2xl"
      />

      {/* Floating Pill: Nearby Radar */}
      <m.div
        initial={reduced ? undefined : { opacity: 0, x: -20, y: 10 }}
        animate={reduced ? undefined : { opacity: 1, x: 0, y: 0 }}
        transition={{ delay: 0.3, duration: 0.6 }}
        className="absolute -top-4 -left-4 z-20 hidden items-center gap-2 rounded-2xl border border-white/80 bg-card/90 px-3.5 py-2 shadow-float backdrop-blur-md sm:flex"
      >
        <span className="relative flex size-3">
          <span className="absolute inline-flex size-full animate-ping rounded-full bg-verified opacity-75" />
          <span className="relative inline-flex size-3 rounded-full bg-verified" />
        </span>
        <span className="text-xs font-bold text-ink">12 Pets Nearby</span>
      </m.div>

      {/* Floating Pill: Rating Badge */}
      <m.div
        initial={reduced ? undefined : { opacity: 0, x: 20, y: -10 }}
        animate={reduced ? undefined : { opacity: 1, x: 0, y: 0 }}
        transition={{ delay: 0.45, duration: 0.6 }}
        className="absolute -top-3 -right-3 z-20 hidden items-center gap-1.5 rounded-2xl border border-white/80 bg-card/90 px-3.5 py-2 shadow-float backdrop-blur-md sm:flex"
      >
        <Star className="size-4 fill-amber-400 text-amber-400" />
        <span className="text-xs font-bold text-ink">4.9</span>
        <span className="text-[11px] text-ink-soft">(Google Play)</span>
      </m.div>

      {/* The Phone Device Frame */}
      <div className="relative overflow-hidden rounded-[2.5rem] border-[6px] border-ink/90 bg-ink shadow-[0_25px_60px_-15px_rgba(0,0,0,0.3)]">
        {/* Notch / Dynamic Island */}
        <div className="absolute top-2 left-1/2 z-30 h-4 w-28 -translate-x-1/2 rounded-full bg-ink">
          <div className="mx-auto mt-1 size-2 rounded-full bg-ink-soft/40" />
        </div>

        {/* Screen Content Container */}
        <div className="relative flex h-[540px] flex-col justify-between overflow-hidden bg-background pt-7 pb-4">
          {/* In-app Header */}
          <div className="flex items-center justify-between px-4 pb-2.5">
            <div className="flex items-center gap-1.5">
              <span className="grid size-7 place-items-center rounded-lg bg-brand text-white">
                <PawPrint className="size-4" />
              </span>
              <span className="font-heading text-sm font-bold text-ink">MeetMyPets</span>
            </div>
            <div className="flex items-center gap-1 rounded-full bg-secondary px-2.5 py-1 text-[11px] font-semibold text-ink-soft">
              <MapPin className="size-3 text-brand" />
              <span>1.2 km away</span>
            </div>
          </div>

          {/* Profile Card Inside App */}
          <div className="relative mx-3.5 flex-1 overflow-hidden rounded-2xl border border-border shadow-soft">
            <Image
              src="/pet-golden-retriever.webp"
              alt="Mochi the Golden Retriever"
              fill
              sizes="320px"
              className="object-cover object-center"
            />
            {/* Gradient Overlay for copy legibility */}
            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-ink/90 via-ink/40 to-transparent p-4 pt-16 text-white">
              <div className="flex items-center gap-2">
                <h4 className="font-heading text-xl font-bold tracking-tight">Mochi, 2 yrs</h4>
                <BadgeCheck className="size-5 fill-verified text-white" />
              </div>
              <p className="text-xs text-white/80">Golden Retriever · Playful & Social</p>

              <div className="mt-2.5 flex flex-wrap gap-1.5">
                <span className="rounded-md bg-white/20 px-2 py-0.5 text-[10px] font-medium backdrop-blur-xs">
                  🎾 Loves Tennis Balls
                </span>
                <span className="rounded-md bg-white/20 px-2 py-0.5 text-[10px] font-medium backdrop-blur-xs">
                  💉 Vaccinated
                </span>
              </div>
            </div>

            {/* Interactive "It's a Match!" celebration banner */}
            <AnimatePresence>
              {liked && (
                <m.div
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-brand/90 p-4 text-center text-white backdrop-blur-xs"
                >
                  <m.div
                    animate={{ scale: [1, 1.25, 1] }}
                    transition={{ repeat: Infinity, duration: 1.2 }}
                    className="grid size-14 place-items-center rounded-full bg-white text-brand shadow-lift"
                  >
                    <Heart className="size-8 fill-brand text-brand" />
                  </m.div>
                  <p className="mt-3 font-heading text-xl font-bold">Playdate Match! 🐾</p>
                  <p className="mt-1 text-xs text-white/90">
                    Mochi&apos;s parent accepted your playdate invitation.
                  </p>
                  <button
                    type="button"
                    onClick={() => setLiked(false)}
                    className="mt-3.5 rounded-full bg-white px-4 py-1.5 text-xs font-bold text-brand shadow-soft"
                  >
                    Keep Exploring
                  </button>
                </m.div>
              )}
            </AnimatePresence>
          </div>

          {/* Action Buttons: Pass & Playdate Match */}
          <div className="mt-3 flex items-center justify-center gap-5 px-4">
            <button
              type="button"
              onClick={() => setLiked(false)}
              aria-label="Skip profile"
              className="grid size-11 place-items-center rounded-full border border-border bg-card text-ink-soft shadow-soft transition-transform active:scale-95"
            >
              <X className="size-5" />
            </button>

            <button
              type="button"
              onClick={() => setLiked(true)}
              aria-label="Send playdate request"
              className="grid size-13 place-items-center rounded-full bg-gradient-to-r from-brand via-[#FF5252] to-brand-ink text-white shadow-lift transition-transform hover:scale-105 active:scale-95"
            >
              <Heart className="size-6 fill-white" />
            </button>

            <button
              type="button"
              onClick={() => setLiked(true)}
              aria-label="Chat with pet parent"
              className="grid size-11 place-items-center rounded-full border border-border bg-card text-brand-ink shadow-soft transition-transform active:scale-95"
            >
              <MessageCircle className="size-5" />
            </button>
          </div>

          {/* Bottom App Tab Bar */}
          <div className="mt-3 flex items-center justify-around border-t border-border/60 pt-2 px-3 text-[10px] text-ink-soft">
            <span className="flex flex-col items-center gap-0.5 text-brand font-semibold">
              <PawPrint className="size-4" />
              <span>Explore</span>
            </span>
            <span className="flex flex-col items-center gap-0.5">
              <Radio className="size-4 opacity-60" />
              <span>Nearby</span>
            </span>
            <span className="flex flex-col items-center gap-0.5">
              <MessageCircle className="size-4 opacity-60" />
              <span>Chats</span>
            </span>
            <span className="flex flex-col items-center gap-0.5">
              <Users className="size-4 opacity-60" />
              <span>Pack</span>
            </span>
          </div>
        </div>
      </div>

      {/* Floating Bottom Trust Chip */}
      <m.div
        initial={reduced ? undefined : { opacity: 0, y: 15 }}
        animate={reduced ? undefined : { opacity: 1, y: 0 }}
        transition={{ delay: 0.6, duration: 0.6 }}
        className="absolute -bottom-4 left-1/2 z-20 flex -translate-x-1/2 items-center gap-2 rounded-full border border-border bg-card/95 px-4 py-2 shadow-float backdrop-blur-md"
      >
        <ShieldCheck className="size-4 text-verified" />
        <span className="text-xs font-semibold whitespace-nowrap text-ink">
          100% ID &amp; Vaccination Verified
        </span>
      </m.div>
    </div>
  );
}

/**
 * Revamped App Download Section.
 * Features heroic showcase, interactive live app mockup, and prominent Google Play install CTA.
 */
export function AppDownload() {
  return (
    <section id="get-the-app" className="relative scroll-mt-24 py-16 sm:py-20 md:py-24 lg:py-28">
      {/* Compatibility anchor so #waitlist URLs still scroll here */}
      <span id="waitlist" className="sr-only" aria-hidden="true" />

      {/* Ambient background light fields */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 -z-10"
        style={{
          background:
            "radial-gradient(55rem 32rem at 15% 30%, var(--brand-soft), transparent 70%), radial-gradient(45rem 28rem at 85% 70%, var(--trust-soft), transparent 65%)",
        }}
      />

      <div className="section-shell">
        <Reveal>
          {/* Main Showcase Stage */}
          <div className="relative overflow-hidden rounded-[2.5rem] border border-border/80 bg-gradient-to-b from-card via-card/95 to-background p-7 shadow-float sm:p-10 md:p-14 lg:p-16">
            {/* Top gradient highlight strip */}
            <span
              aria-hidden="true"
              className="pointer-events-none absolute inset-x-12 top-0 h-1.5 rounded-b-full bg-gradient-to-r from-brand via-[#FF5252] to-brand-ink opacity-90"
            />

            {/* Background paw watermark */}
            <PawPrint
              aria-hidden="true"
              className="pointer-events-none absolute -bottom-10 -right-10 size-72 -rotate-12 text-brand/5"
            />

            <div className="grid grid-cols-1 items-center gap-10 md:gap-12 lg:grid-cols-12 lg:gap-14">
              {/* Left Column: Copy, VIP Spotlight, Download CTAs */}
              <div className="text-center lg:col-span-7 lg:text-left">
                {/* Live Pill */}
                <div className="inline-flex items-center gap-2 rounded-full border border-brand/20 bg-brand-soft/80 px-3.5 py-1.5 text-xs font-bold text-brand shadow-xs">
                  <span className="relative flex size-2">
                    <span className="absolute inline-flex size-full animate-ping rounded-full bg-brand opacity-75" />
                    <span className="relative inline-flex size-2 rounded-full bg-brand" />
                  </span>
                  <span>NOW LIVE ON GOOGLE PLAY</span>
                </div>

                <h2 className="mt-5 font-heading text-[clamp(2.2rem,5vw,3.75rem)] leading-[1.08] font-bold tracking-tight text-ink text-balance">
                  Your Pet&apos;s Social Life{" "}
                  <span className="bg-gradient-to-r from-brand via-[#FF5252] to-brand-ink bg-clip-text text-transparent">
                    Starts Here.
                  </span>
                </h2>

                <p className="mt-5 max-w-xl text-base leading-relaxed text-ink-soft sm:text-lg">
                  Create a profile for your pet, find friendly companions nearby, connect with
                  loving pet parents, and discover trusted pet services — all in one safe, verified place.
                </p>

                {/* Live VIP Scarcity Badge */}
                <div className="mt-7 flex justify-center lg:justify-start">
                  <VipBadge variant="spotlight" className="w-full max-w-lg text-left" />
                </div>

                {/* Primary & Secondary Action CTAs */}
                <div className="mt-8 flex flex-col gap-3.5 sm:flex-row sm:items-center sm:justify-center lg:justify-start">
                  <InstallButton
                    size="lg"
                    variant="play"
                    className="shadow-lift"
                  />
                  <AppleStoreButton />
                </div>

                {/* Value Checkpoints */}
                <div className="mt-8 flex flex-wrap items-center justify-center gap-x-6 gap-y-2.5 border-t border-border/70 pt-6 text-xs font-semibold text-ink-soft sm:text-sm lg:justify-start">
                  <span className="flex items-center gap-2">
                    <CheckCircle2 className="size-4 text-verified" />
                    100% Free &amp; Ad-Free
                  </span>
                  <span className="flex items-center gap-2">
                    <CheckCircle2 className="size-4 text-verified" />
                    Verified Pet Profiles
                  </span>
                  <span className="flex items-center gap-2">
                    <CheckCircle2 className="size-4 text-verified" />
                    All Companion Species
                  </span>
                </div>
              </div>

              {/* Right Column: Live App Mockup */}
              <div className="flex justify-center lg:col-span-5">
                <PhoneAppShowcase />
              </div>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
