"use client";

import { AnimatePresence, m, useMotionValueEvent, useScroll } from "motion/react";
import { Menu, PawPrint, X } from "lucide-react";
import { useState } from "react";

import { MagneticButton } from "@/components/motion/MagneticButton";
import { Logo } from "@/components/ui/logo";
import { cta, nav } from "@/config/site";
import { cn } from "@/lib/utils";

/** Sticky header that hides on scroll-down and returns on scroll-up. */
export function Header() {
  const { scrollY } = useScroll();
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useMotionValueEvent(scrollY, "change", (latest) => {
    setScrolled(latest > 12);
  });

  return (
    <header
      className={cn(
        "fixed inset-x-0 top-0 z-50 transition-colors duration-300",
        scrolled ? "glass shadow-soft" : "bg-transparent",
      )}
    >
      <div className="section-shell flex h-16 items-center justify-between gap-4 sm:h-18">
        <a href="#top" className="rounded-lg" aria-label={`${"MeetMyPets"} home`}>
          <Logo />
        </a>

        <nav aria-label="Primary" className="hidden items-center gap-1 lg:flex">
          {nav.map((item) => (
            <a
              key={item.href}
              href={item.href}
              className="group nav-pill flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-ink-soft transition-colors hover:bg-accent hover:text-ink"
            >
              <PawPrint
                aria-hidden="true"
                className="size-3 -translate-x-1 scale-75 text-brand-ink opacity-0 transition-all duration-200 group-hover:translate-x-0 group-hover:scale-100 group-hover:opacity-100"
              />
              {item.label}
            </a>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <MagneticButton href={cta.waitlistHref} className="hidden sm:inline-flex">
            {cta.primary}
          </MagneticButton>

          <button
            type="button"
            onClick={() => setMenuOpen((open) => !open)}
            aria-expanded={menuOpen}
            aria-controls="mobile-nav"
            className="inline-flex size-11 cursor-pointer items-center justify-center rounded-xl border border-border bg-card text-ink lg:hidden"
          >
            {menuOpen ? <X className="size-5" aria-hidden="true" /> : <Menu className="size-5" aria-hidden="true" />}
            <span className="sr-only">{menuOpen ? "Close menu" : "Open menu"}</span>
          </button>
        </div>
      </div>

      <AnimatePresence>
        {menuOpen && (
          <m.div
            id="mobile-nav"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
            className="overflow-hidden border-t border-border bg-card lg:hidden"
            onKeyDown={(event) => {
              if (event.key === "Escape") setMenuOpen(false);
            }}
          >
            <nav aria-label="Mobile" className="section-shell flex flex-col gap-1 py-4">
              {nav.map((item) => (
                <a
                  key={item.href}
                  href={item.href}
                  onClick={() => setMenuOpen(false)}
                  className="flex min-h-11 items-center rounded-xl px-3 text-base font-medium text-ink transition-colors hover:bg-accent"
                >
                  {item.label}
                </a>
              ))}
              <a
                href={cta.waitlistHref}
                onClick={() => setMenuOpen(false)}
                className="mt-2 flex min-h-11 items-center justify-center rounded-full bg-brand px-6 text-sm font-semibold text-white"
              >
                {cta.primary}
              </a>
            </nav>
          </m.div>
        )}
      </AnimatePresence>
    </header>
  );
}
