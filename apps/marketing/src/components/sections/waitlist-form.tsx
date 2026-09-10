"use client";

import { AnimatePresence, m, useReducedMotion } from "motion/react";
import { Apple, Check, Play } from "lucide-react";
import Image from "next/image";
import { useRef, useState } from "react";

import { Reveal } from "@/components/motion/Reveal";
import { DogRunLoader } from "@/components/ui/dog-run-loader";
import { VipBadge } from "@/components/ui/vip-badge";
import { isLaunched, waitlist } from "@/config/site";
import { validateContact } from "@/lib/validation";
import { isWaitlistConfigured, submitWaitlist } from "@/lib/waitlist";
import { cn } from "@/lib/utils";

type Status = "idle" | "submitting" | "success" | "error";

/** Fires confetti, loading the library only at the moment of success. */
async function celebrate() {
  const { default: confetti } = await import("canvas-confetti");
  confetti({
    particleCount: 70,
    spread: 62,
    startVelocity: 32,
    scalar: 0.9,
    origin: { y: 0.7 },
    colors: ["#c2531f", "#2563eb", "#15803d", "#f6e7de"],
    disableForReducedMotion: true,
  });
}

export function WaitlistForm() {
  const [value, setValue] = useState("");
  // Honeypot. Stays empty for every real user; bots fill every field they find.
  const [honeypot, setHoneypot] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [message, setMessage] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const reduced = useReducedMotion();

  const disabled = !isWaitlistConfigured;

  /** Validate on blur, not on keystroke — errors mid-typing are hostile. */
  function handleBlur() {
    if (value.trim() === "" || status === "submitting") return;
    const result = validateContact(value);
    if (!result.valid) {
      setStatus("error");
      setMessage(result.message);
    } else if (status === "error") {
      setStatus("idle");
      setMessage("");
    }
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (status === "submitting") return;

    const result = validateContact(value);
    if (!result.valid) {
      setStatus("error");
      setMessage(result.message);
      inputRef.current?.focus(); // WCAG 3.3.1 — move focus to the problem.
      return;
    }

    setStatus("submitting");
    setMessage("");

    const outcome = await submitWaitlist(value, "waitlist", honeypot);

    if (outcome.ok) {
      setStatus("success");
      if (!reduced) void celebrate();
      return;
    }

    setStatus("error");
    setMessage(outcome.message);
    inputRef.current?.focus();
  }

  return (
    <section id="waitlist" className="relative scroll-mt-24 py-10 sm:py-14">
      {/* Ambient gradient wash — the card has its own internal gradient,
          but the page-level background around it was bare. This terracotta
          wash and trust-blue complement make the card feel grounded in the
          page rather than floating on empty space. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 -z-10"
        style={{
          background:
            "radial-gradient(40rem 22rem at 50% 20%, var(--brand-soft), transparent 60%), radial-gradient(36rem 18rem at 80% 90%, var(--trust-soft), transparent 55%)",
        }}
      />
      <div className="section-shell">
        <Reveal>
          {/* Shape lives here, separate from Reveal's own motion wrapper —
              Reveal's entrance animation leaves a resting inline
              `transform: none` once it finishes, which would silently beat
              a CSS `:hover` rule applied to the same element. This card has
              no hover-tilt (a full-width CTA card tilting on hover would be
              disorienting, not charming), but the split keeps the pattern
              consistent with every other .card-paw usage on the site. */}
          <div className="card-paw card-stitched relative overflow-hidden border border-border bg-card px-6 py-10 shadow-lift sm:px-10 sm:py-12 lg:px-14 lg:py-14">
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-0 -z-10"
              style={{
                background:
                  "radial-gradient(40rem 20rem at 50% 0%, var(--brand-soft), transparent 70%)",
              }}
            />

            {/* Blob clip SVG for the pet photo corners */}
            <svg aria-hidden="true" className="pointer-events-none absolute size-0">
              <defs>
                <clipPath id="waitlist-blob" clipPathUnits="objectBoundingBox">
                  <path d="M 0,0.4 C 0,0.18 0.18,0 0.4,0 L 0.6,0 C 0.82,0 1,0.18 1,0.4 L 1,0.75 C 1,0.92 0.82,1 0.6,0.9 L 0.4,0.82 C 0.18,0.72 0,0.88 0,0.75 Z" />
                </clipPath>
              </defs>
            </svg>

            {/* Dachshund peeking up from the bottom-left corner — the `overflow-
                hidden` on the card clips both photos so they frame the content
                without escaping the card boundary. Semi-transparent so the form
                stays the clear focal point. */}
            <div
              aria-hidden="true"
              className="pointer-events-none absolute -bottom-4 -left-4 hidden h-40 w-32 overflow-hidden opacity-30 lg:block"
              style={{ clipPath: "url(#waitlist-blob)" }}
            >
              <Image
                src="/pet-dachshund-bows.webp"
                alt=""
                fill
                sizes="128px"
                className="object-cover object-top"
              />
            </div>

            {/* Cat peeking from the bottom-right corner, mirrored. */}
            <div
              aria-hidden="true"
              className="pointer-events-none absolute -top-6 -right-6 hidden h-40 w-32 -scale-x-100 overflow-hidden opacity-30 lg:block"
              style={{ clipPath: "url(#waitlist-blob)" }}
            >
              <Image
                src="/pet-cat-grey-shorthair.webp"
                alt=""
                fill
                sizes="128px"
                className="object-cover object-top"
              />
            </div>

              {/* Two columns from lg: the pitch (eyebrow, title, body, VIP
                  offer) on the left, the form in its own inset panel on the
                  right. One centred column stacked everything into a tall
                  strip with the field an arm's length below the headline;
                  side by side, the offer and the action sit at the same eye
                  level and the card is ~40% shorter on desktop. */}
              <div className="relative grid grid-cols-1 items-center gap-10 lg:grid-cols-[1.05fr_1fr] lg:gap-14">
                <div className="text-center lg:text-left">
                  <p className="text-xs font-semibold tracking-[0.14em] text-brand-ink uppercase">
                    {waitlist.eyebrow}
                  </p>
                  <h2 className="mt-3 text-3xl leading-tight font-semibold sm:text-4xl">
                    {waitlist.title}
                  </h2>
                  <p className="mt-4 leading-relaxed text-ink-soft">{waitlist.body}</p>

                  <div className="mt-6 flex justify-center lg:justify-start">
                    <VipBadge variant="spotlight" className="max-w-md text-left" />
                  </div>
                </div>

                <div className="relative rounded-[2rem] border border-border/70 bg-background/85 p-5 shadow-soft ring-1 ring-brand/5 sm:p-7">
                  <span
                    aria-hidden="true"
                    className="pointer-events-none absolute inset-x-6 top-0 h-1 rounded-b-full bg-gradient-to-r from-brand via-brand/60 to-transparent opacity-70"
                  />


                <AnimatePresence mode="wait">
                  {status === "success" ? (
                    <m.div
                      key="success"
                      initial={reduced ? undefined : { opacity: 0, scale: 0.96 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ type: "spring", stiffness: 240, damping: 20 }}
                      className="flex flex-col items-center gap-3 py-6 text-center"
                      role="status"
                    >
                      <m.span
                        className="grid size-14 place-items-center rounded-full bg-verified text-white"
                        initial={reduced ? undefined : { scale: 0.4 }}
                        animate={{ scale: 1 }}
                        transition={{ type: "spring", stiffness: 300, damping: 16, delay: 0.05 }}
                      >
                        <Check className="size-7" aria-hidden="true" strokeWidth={3} />
                      </m.span>
                      <p className="font-heading text-xl font-semibold">{waitlist.successTitle}</p>
                      <p className="text-sm text-ink-soft">{waitlist.successBody}</p>
                    </m.div>
                  ) : (
                    <m.form
                      key="form"
                      onSubmit={handleSubmit}
                      noValidate
                      initial={false}
                      exit={reduced ? undefined : { opacity: 0, y: -8 }}
                      className="text-left"
                    >
                      {/* Honeypot. Hidden from sighted users AND from assistive
                          tech — an off-screen field a screen reader announced
                          would be a trap, not a filter. Deliberately not
                          display:none, which many bots skip over. */}
                      <div
                        aria-hidden="true"
                        className="pointer-events-none absolute h-px w-px overflow-hidden opacity-0"
                        style={{ left: "-9999px" }}
                      >
                        <label htmlFor="waitlist-website">Leave this field empty</label>
                        <input
                          id="waitlist-website"
                          name="website"
                          type="text"
                          tabIndex={-1}
                          autoComplete="off"
                          value={honeypot}
                          onChange={(event) => setHoneypot(event.target.value)}
                        />
                      </div>

                      <label htmlFor="waitlist-contact" className="block text-sm font-semibold">
                        Email address or mobile number
                      </label>

                      <div className="mt-2 flex flex-col gap-3 sm:flex-row">
                        <input
                          ref={inputRef}
                          id="waitlist-contact"
                          name="contact"
                          type="text"
                          inputMode="email"
                          autoComplete="email"
                          disabled={disabled || status === "submitting"}
                          value={value}
                          onChange={(event) => setValue(event.target.value)}
                          onBlur={handleBlur}
                          aria-invalid={status === "error"}
                          aria-describedby="waitlist-help waitlist-error"
                          placeholder="you@example.com or +91 98765 43210"
                          className={cn(
                            "h-12 min-w-0 flex-1 rounded-full border bg-card px-5 text-base shadow-soft transition-[box-shadow,border-color] duration-200",
                            "placeholder:text-ink-soft/70 disabled:cursor-not-allowed disabled:opacity-60",
                            "focus:border-brand/60 focus:ring-4 focus:ring-brand/15 focus:outline-none",
                            status === "error" ? "border-destructive" : "border-input",
                          )}
                          maxLength={64}
                        />
                        <button
                          type="submit"
                          disabled={disabled || status === "submitting"}
                          className={cn(
                            "inline-flex h-12 min-w-11 cursor-pointer items-center justify-center gap-2 rounded-full",
                            "bg-brand px-7 text-sm font-semibold text-white transition-colors",
                            "hover:bg-brand-ink disabled:cursor-not-allowed disabled:opacity-60",
                          )}
                        >
                          {status === "submitting" && (
                            <DogRunLoader className="size-4 text-white" animate={!reduced} />
                          )}
                          {status === "submitting" ? "Joining" : "Join the waitlist"}
                        </button>
                      </div>

                      {/* Errors live in an aria-live region directly below the field
                          so screen readers announce them without a focus jump. */}
                      <p
                        id="waitlist-error"
                        role="alert"
                        aria-live="polite"
                        className={cn(
                          "mt-2 min-h-5 text-sm font-medium text-destructive",
                          status !== "error" && "sr-only",
                        )}
                      >
                        {status === "error" ? message : ""}
                      </p>

                      <p id="waitlist-help" className="mt-3 text-xs leading-relaxed text-ink-soft">
                        {disabled
                          ? "Waitlist storage is not connected yet — see .env.example for the Google Sheet setup."
                          : waitlist.consent}
                      </p>
                    </m.form>
                  )}
                </AnimatePresence>

                {/* Pre-launch: deliberately NOT the official Apple/Google badges.
                    Both stores forbid using their marks unless the badge links to
                    a live listing, which does not exist yet. */}
                <div className="mt-7 flex flex-wrap items-center justify-center gap-3 lg:justify-start">
                  {[
                    { icon: Apple, label: "iOS" },
                    { icon: Play, label: "Android" },
                  ].map(({ icon: Icon, label }) => (
                    <span
                      key={label}
                      className="inline-flex items-center gap-2 rounded-2xl border border-border bg-background px-4 py-2.5 text-sm text-ink-soft"
                    >
                      <Icon className="size-4.5" aria-hidden="true" />
                      <span>
                        <span className="font-semibold text-ink">{label}</span>
                        {isLaunched ? " — available now" : " — coming soon"}
                      </span>
                    </span>
                  ))}
                </div>
                </div>
              </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
