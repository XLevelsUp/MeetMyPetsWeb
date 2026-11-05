"use client";

import Link from "next/link";

import type { ConsentState } from "@/lib/analytics";

/**
 * Opt-in for Google Analytics cookies. Non-blocking: fixed, so it takes no
 * layout space (no CLS) and the page stays usable behind it. Accept and
 * Decline are the same size, side by side, one tap each — making refusal
 * harder than acceptance would void the consent.
 *
 * Sits above the WhatsApp launcher (z-40) and below the install popup (z-50)
 * and intro curtain (z-100).
 */
export function ConsentBanner({
  current,
  onAnswer,
}: {
  current: ConsentState;
  onAnswer: (answer: "granted" | "denied") => void;
}) {
  return (
    <div
      role="region"
      aria-label="Cookie preferences"
      className="fixed inset-x-4 bottom-4 z-[45] rounded-2xl border border-border bg-card p-4 text-ink shadow-float sm:right-auto sm:left-4 sm:max-w-sm md:bottom-6 md:left-6"
    >
      <p className="text-sm leading-relaxed">
        May we use Google Analytics cookies to see which pages are useful? It&apos;s optional — the site works the
        same either way.{" "}
        <Link href="/privacy/#cookies" className="font-semibold text-brand-ink underline underline-offset-2">
          Privacy Policy
        </Link>
      </p>
      {current && (
        <p className="mt-2 text-xs text-ink-soft">
          Currently: {current === "granted" ? "accepted" : "declined"}.
        </p>
      )}
      <div className="mt-3 grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={() => onAnswer("denied")}
          className="min-h-11 rounded-full border border-border bg-card px-4 text-sm font-semibold text-ink transition-colors hover:bg-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
        >
          Decline
        </button>
        <button
          type="button"
          onClick={() => onAnswer("granted")}
          className="min-h-11 rounded-full bg-brand px-4 text-sm font-semibold text-white transition-colors hover:bg-brand-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
        >
          Accept
        </button>
      </div>
    </div>
  );
}
