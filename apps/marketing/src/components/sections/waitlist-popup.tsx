"use client";

import { AnimatePresence, m, useReducedMotion } from "motion/react";
import { Check, PawPrint, X } from "lucide-react";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { DogRunLoader } from "@/components/ui/dog-run-loader";
import { isWaitlistConfigured, submitWaitlist } from "@/lib/waitlist";
import { validateContact } from "@/lib/validation";
import { waitlistPopup } from "@/config/site";
import { cn } from "@/lib/utils";

const STORAGE_KEY = "mmp-waitlist-popup-seen";
const DELAY_MS = 15_000;

type Status = "idle" | "submitting" | "success" | "error";

function hasBeenSeen(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEY) === "1";
  } catch {
    // Private browsing / storage blocked: fail open (never shows) rather
    // than risk a popup on every single page load for that visitor.
    return true;
  }
}

function markSeen(): void {
  try {
    localStorage.setItem(STORAGE_KEY, "1");
  } catch {
    // Nothing to fall back to — worst case the popup reappears next visit.
  }
}

/** Timed waitlist nudge — landing page only, once per person (localStorage). */
export function WaitlistPopup() {
  const reduced = useReducedMotion();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState("");
  const [honeypot, setHoneypot] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [message, setMessage] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const disabled = !isWaitlistConfigured;

  useEffect(() => {
    // Landing page only — never over the legal pages, which people reach deliberately.
    if (pathname !== "/") return;
    if (hasBeenSeen()) return;
    const timer = setTimeout(() => setOpen(true), DELAY_MS);
    return () => clearTimeout(timer);
  }, [pathname]);

  useEffect(() => {
    if (!open) return;
    markSeen();
    // Autofocus the field, not the dialog — this is a one-field form, so the
    // fastest path to "type and submit" is the honest default.
    inputRef.current?.focus();
  }, [open]);

  function close() {
    setOpen(false);
  }

  // Synthetic handler, not a document listener — the effect version raced the opening keypress.
  function handleDialogKeyDown(event: React.KeyboardEvent) {
    if (event.key === "Escape") close();
  }

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
      inputRef.current?.focus();
      return;
    }

    setStatus("submitting");
    setMessage("");

    const outcome = await submitWaitlist(value, "popup", honeypot);

    if (outcome.ok) {
      setStatus("success");
      return;
    }

    setStatus("error");
    setMessage(outcome.message);
    inputRef.current?.focus();
  }

  return (
    <AnimatePresence>
      {open && (
        <div
          className="fixed inset-0 z-100 grid place-items-center p-4"
          onKeyDown={handleDialogKeyDown}
        >
          <m.div
            aria-hidden="true"
            onClick={close}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
          />

          <m.div
            role="dialog"
            aria-modal="true"
            aria-labelledby="waitlist-popup-title"
            initial={reduced ? { opacity: 0 } : { opacity: 0, scale: 0.94, y: 16 }}
            animate={reduced ? { opacity: 1 } : { opacity: 1, scale: 1, y: 0 }}
            exit={reduced ? { opacity: 0 } : { opacity: 0, scale: 0.96, y: 8 }}
            transition={{ type: "spring", stiffness: 300, damping: 26 }}
            className="card-paw relative w-full max-w-md overflow-hidden border border-border bg-card p-6 shadow-float sm:p-8"
          >
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-0 -z-10"
              style={{
                background:
                  "radial-gradient(30rem 16rem at 100% 0%, var(--brand-soft), transparent 70%)",
              }}
            />

            <button
              type="button"
              onClick={close}
              aria-label="Close"
              className="absolute top-4 right-4 grid size-9 cursor-pointer place-items-center rounded-full text-ink-soft transition-colors hover:bg-accent hover:text-ink"
            >
              <X className="size-4.5" aria-hidden="true" />
            </button>

            <span className="glass inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold tracking-wide text-brand-ink uppercase">
              <PawPrint className="size-3.5" aria-hidden="true" />
              {waitlistPopup.eyebrow}
            </span>

            <AnimatePresence mode="wait">
              {status === "success" ? (
                <m.div
                  key="success"
                  initial={reduced ? undefined : { opacity: 0, scale: 0.96 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ type: "spring", stiffness: 240, damping: 20 }}
                  className="mt-6 flex flex-col items-center gap-3 py-4 text-center"
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
                  <p className="font-heading text-xl font-semibold">You are on the list</p>
                  <p className="text-sm text-ink-soft">
                    We will reach out the moment MeetMyPets is ready.
                  </p>
                </m.div>
              ) : (
                <m.form key="form" onSubmit={handleSubmit} noValidate initial={false}>
                  <h2 id="waitlist-popup-title" className="mt-4 text-2xl leading-tight font-semibold">
                    {waitlistPopup.title}
                  </h2>
                  <p className="mt-2 text-sm leading-relaxed text-ink-soft">{waitlistPopup.body}</p>

                  {/* Honeypot — same pattern as WaitlistForm: invisible to
                      sighted users and skipped by assistive tech. */}
                  <div
                    aria-hidden="true"
                    className="pointer-events-none absolute h-px w-px overflow-hidden opacity-0"
                    style={{ left: "-9999px" }}
                  >
                    <label htmlFor="waitlist-popup-website">Leave this field empty</label>
                    <input
                      id="waitlist-popup-website"
                      name="website"
                      type="text"
                      tabIndex={-1}
                      autoComplete="off"
                      value={honeypot}
                      onChange={(event) => setHoneypot(event.target.value)}
                    />
                  </div>

                  <label htmlFor="waitlist-popup-contact" className="sr-only">
                    Email address or mobile number
                  </label>
                  <input
                    ref={inputRef}
                    id="waitlist-popup-contact"
                    name="contact"
                    type="text"
                    inputMode="email"
                    autoComplete="email"
                    disabled={disabled || status === "submitting"}
                    value={value}
                    onChange={(event) => setValue(event.target.value)}
                    onBlur={handleBlur}
                    aria-invalid={status === "error"}
                    aria-describedby="waitlist-popup-error"
                    placeholder="you@example.com or +91 98765 43210"
                    className={cn(
                      "mt-5 h-12 w-full min-w-0 rounded-full border bg-background px-5 text-base",
                      "placeholder:text-ink-soft/70 disabled:cursor-not-allowed disabled:opacity-60",
                      status === "error" ? "border-destructive" : "border-input",
                    )}
                    maxLength={64}
                  />

                  <p
                    id="waitlist-popup-error"
                    role="alert"
                    aria-live="polite"
                    className={cn(
                      "mt-2 min-h-5 text-sm font-medium text-destructive",
                      status !== "error" && "sr-only",
                    )}
                  >
                    {status === "error" ? message : ""}
                  </p>

                  <button
                    type="submit"
                    disabled={disabled || status === "submitting"}
                    className={cn(
                      "mt-3 inline-flex h-12 w-full cursor-pointer items-center justify-center gap-2 rounded-full",
                      "bg-brand text-sm font-semibold text-white transition-colors",
                      "hover:bg-brand-ink disabled:cursor-not-allowed disabled:opacity-60",
                    )}
                  >
                    {status === "submitting" && (
                      <DogRunLoader className="size-4 text-white" animate={!reduced} />
                    )}
                    {status === "submitting" ? "Joining" : "Join the waitlist"}
                  </button>

                  <p className="mt-3 text-center text-xs leading-relaxed text-ink-soft">
                    We will contact you once, when the app is ready. No spam, ever.
                  </p>
                </m.form>
              )}
            </AnimatePresence>
          </m.div>
        </div>
      )}
    </AnimatePresence>
  );
}
