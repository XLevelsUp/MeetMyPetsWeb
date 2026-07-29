"use client";

import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { Apple, Check, LoaderCircle, Play } from "lucide-react";
import { useRef, useState } from "react";

import { Reveal } from "@/components/motion/Reveal";
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
    <section id="waitlist" className="scroll-mt-24 py-20 sm:py-28">
      <div className="section-shell">
        <Reveal className="relative overflow-hidden rounded-[2rem] border border-border bg-card px-6 py-14 shadow-lift sm:px-12 sm:py-20">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 -z-10"
            style={{
              background:
                "radial-gradient(40rem 20rem at 50% 0%, var(--brand-soft), transparent 70%)",
            }}
          />

          <div className="mx-auto max-w-xl text-center">
            <p className="text-xs font-semibold tracking-[0.14em] text-brand-ink uppercase">
              {waitlist.eyebrow}
            </p>
            <h2 className="mt-3 text-3xl leading-tight font-semibold sm:text-4xl">
              {waitlist.title}
            </h2>
            <p className="mt-4 leading-relaxed text-ink-soft">{waitlist.body}</p>

            <AnimatePresence mode="wait">
              {status === "success" ? (
                <motion.div
                  key="success"
                  initial={reduced ? undefined : { opacity: 0, scale: 0.96 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ type: "spring", stiffness: 240, damping: 20 }}
                  className="mt-10 flex flex-col items-center gap-3"
                  role="status"
                >
                  <motion.span
                    className="grid size-14 place-items-center rounded-full bg-verified text-white"
                    initial={reduced ? undefined : { scale: 0.4 }}
                    animate={{ scale: 1 }}
                    transition={{ type: "spring", stiffness: 300, damping: 16, delay: 0.05 }}
                  >
                    <Check className="size-7" aria-hidden="true" strokeWidth={3} />
                  </motion.span>
                  <p className="font-heading text-xl font-semibold">{waitlist.successTitle}</p>
                  <p className="text-sm text-ink-soft">{waitlist.successBody}</p>
                </motion.div>
              ) : (
                <motion.form
                  key="form"
                  onSubmit={handleSubmit}
                  noValidate
                  initial={false}
                  exit={reduced ? undefined : { opacity: 0, y: -8 }}
                  className="mt-10 text-left"
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
                        "h-12 min-w-0 flex-1 rounded-full border bg-background px-5 text-base",
                        "placeholder:text-ink-soft/70 disabled:cursor-not-allowed disabled:opacity-60",
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
                        <LoaderCircle className="size-4 animate-spin" aria-hidden="true" />
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
                </motion.form>
              )}
            </AnimatePresence>

            {/* Pre-launch: deliberately NOT the official Apple/Google badges.
                Both stores forbid using their marks unless the badge links to
                a live listing, which does not exist yet. */}
            <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
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
        </Reveal>
      </div>
    </section>
  );
}
