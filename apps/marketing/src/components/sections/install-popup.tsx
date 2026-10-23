"use client";

import { AnimatePresence, m, useReducedMotion } from "motion/react";
import { PawPrint, Sparkles, X } from "lucide-react";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

import { InstallButton } from "@/components/ui/install-button";
import { VipBadge } from "@/components/ui/vip-badge";

const STORAGE_KEY = "mmp-install-popup-seen";
const DELAY_MS = 15_000;

function hasBeenSeen(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEY) === "1";
  } catch {
    return true;
  }
}

function markSeen(): void {
  try {
    localStorage.setItem(STORAGE_KEY, "1");
  } catch {
    // Fail silently
  }
}

/**
 * Timed install prompt modal — landing page only, once per visitor (localStorage).
 */
export function InstallPopup() {
  const reduced = useReducedMotion();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    // Landing page only — never over legal/about pages
    if (pathname !== "/") return;
    if (hasBeenSeen()) return;
    const timer = setTimeout(() => setOpen(true), DELAY_MS);
    return () => clearTimeout(timer);
  }, [pathname]);

  useEffect(() => {
    if (!open) return;
    markSeen();
  }, [open]);

  function close() {
    setOpen(false);
  }

  function handleDialogKeyDown(event: React.KeyboardEvent) {
    if (event.key === "Escape") close();
  }

  return (
    <AnimatePresence>
      {open && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="install-popup-title"
          onKeyDown={handleDialogKeyDown}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6"
        >
          {/* Backdrop */}
          <m.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={close}
            aria-hidden="true"
            className="absolute inset-0 bg-ink/50 backdrop-blur-sm"
          />

          {/* Modal card */}
          <m.div
            initial={reduced ? { opacity: 0 } : { opacity: 0, scale: 0.95, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={reduced ? { opacity: 0 } : { opacity: 0, scale: 0.95, y: 8 }}
            transition={{ type: "spring", stiffness: 320, damping: 24 }}
            className="card-stitched relative w-full max-w-md overflow-hidden rounded-3xl border border-border bg-card p-6 text-center shadow-float sm:p-8"
          >
            {/* Top decorative accent */}
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-0 -z-10"
              style={{
                background:
                  "radial-gradient(24rem 12rem at 50% 0%, var(--brand-soft), transparent 75%)",
              }}
            />

            {/* Close button */}
            <button
              type="button"
              onClick={close}
              aria-label="Close install dialog"
              className="absolute top-4 right-4 grid size-9 place-items-center rounded-full text-ink-soft transition-colors hover:bg-accent hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
            >
              <X className="size-4" aria-hidden="true" />
            </button>

            {/* Badge icon */}
            <div className="mx-auto flex size-12 items-center justify-center rounded-2xl bg-brand text-white shadow-soft">
              <PawPrint className="size-6" aria-hidden="true" />
            </div>

            <span className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-brand-soft px-3 py-1 text-[11px] font-bold tracking-wide text-brand uppercase">
              <Sparkles className="size-3" aria-hidden="true" />
              Now Available
            </span>

            <h2
              id="install-popup-title"
              className="mt-3 font-heading text-2xl font-bold tracking-tight text-ink sm:text-3xl"
            >
              MeetMyPets is Live!
            </h2>

            <p className="mt-2 text-sm leading-relaxed text-ink-soft">
              Install the app on Google Play to claim your founding VIP badge and find friends for your pet.
            </p>

            <div className="mt-4 flex justify-center">
              <VipBadge variant="compact" />
            </div>

            <div className="mt-6 flex flex-col gap-2.5">
              <InstallButton variant="brand" size="lg" className="w-full" />
              <p className="text-[11px] text-ink-soft">
                Android 8.0+ · Free to use · iOS version coming soon
              </p>
            </div>
          </m.div>
        </div>
      )}
    </AnimatePresence>
  );
}
