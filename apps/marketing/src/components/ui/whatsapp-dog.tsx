"use client";

import { useReducedMotion } from "motion/react";
import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";

import { whatsapp } from "@/config/site";
import { cn } from "@/lib/utils";

/** Animated waving clip — 320x480, ~790KB. Fine pointer + no Save-Data only. */
const CLIP = { src: "/dog_wave.webp", w: 320, h: 480 };
/** 8KB still of the same mascot everywhere else. */
const STILL = { src: "/MMP Dog 01.webp", w: 166, h: 93 };

/** Rise starts 0.6s after load, bubble at 1.4s; greeting lasts this long. */
const GREETING_MS = 6000;

function WhatsAppIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
      className={className}
    >
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.82 11.82 0 00-3.48-8.413Z" />
    </svg>
  );
}

/**
 * WhatsApp launcher, as the waving mascot.
 *
 * Replaces both the generic green WhatsApp button and the decorative
 * corner greeter — they were two floating things in two corners doing
 * unrelated jobs. This is one: it greets on arrival, then settles into a
 * peek, and tapping it opens WhatsApp.
 *
 * Unlike the old greeter this is a REAL CONTROL, which changes the rules:
 *   - it is an <a> with an href, so it is keyboard reachable, focusable
 *     and works on middle-click / "open in new tab"
 *   - it is NOT aria-hidden; it carries a descriptive label naming both the
 *     destination and the number
 *   - it renders at every width, because a contact route that disappears on
 *     phones is a lost conversation — and WhatsApp matters most on phones
 *
 * The tuck-to-peek is transform-only and the wave is a WebP animation, so
 * nothing here costs main-thread work per frame.
 */
export function WhatsAppDog() {
  const reduced = useReducedMotion();
  const [rich, setRich] = useState(false);
  const [settled, setSettled] = useState(false);
  const [bubble, setBubble] = useState(true);
  const [run, setRun] = useState(0);
  const settleTimer = useRef(0);

  useEffect(() => {
    const saveData =
      (navigator as Navigator & { connection?: { saveData?: boolean } }).connection?.saveData === true;
    const fine = window.matchMedia("(pointer: fine)").matches;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setRich(fine && !saveData && !reduced);
  }, [reduced]);

  useEffect(() => {
    window.clearTimeout(settleTimer.current);
    settleTimer.current = window.setTimeout(() => {
      setSettled(true);
      setBubble(false);
    }, GREETING_MS);
    return () => window.clearTimeout(settleTimer.current);
  }, [run]);

  /** Bring it back up and replay the wave — on hover, focus, or touch. */
  const wake = useCallback(() => {
    setSettled(false);
    setBubble(true);
    setRun((n) => n + 1);
  }, []);

  const art = rich ? CLIP : STILL;
  const href = `${whatsapp.href}?text=${encodeURIComponent(whatsapp.message)}`;

  return (
    // A landmark, not a bare <div>: this is a fixed launcher that sits
    // outside <main>, so without one its link belongs to no region and is
    // hard to find when navigating by landmark. `aria-label` names it so it
    // is distinguishable from the page's other complementary content.
    <aside
      aria-label="Contact us on WhatsApp"
      className={cn(
        "fixed right-2 z-40 sm:right-4 lg:right-5",
        // The artwork is ~1.8:1, so these widths give a 47/56/66px-tall
        // image; the link below adds padding to clear the 44px minimum
        // touch target at every size.
        "w-[84px] sm:w-[100px] lg:w-[118px]",
        // Sits above the iOS home indicator rather than under it.
        "bottom-[max(0px,env(safe-area-inset-bottom))]",
        "transition-transform duration-500 ease-[cubic-bezier(.22,1,.36,1)]",
        // Tucked leaves the head visible. 44% on phones (not 58%) keeps
        // enough of the dog on screen to stay a legible, tappable target.
        settled ? "translate-y-[44%] sm:translate-y-[52%]" : "translate-y-0",
      )}
      onPointerEnter={(event) => {
        if (event.pointerType === "mouse") wake();
      }}
    >
      {/* Speech bubble. `absolute` so it is not constrained by the wrapper's
          narrow dog-sized width — inside it the text wrapped to a 4-line
          column. Anchored to the wrapper's right edge and allowed to run
          leftwards to its own width instead.

          Hidden from assistive tech: the link's own label already says what
          tapping does, so announcing both would be a duplicate. */}
      <div
        aria-hidden="true"
        className={cn(
          "pointer-events-none absolute right-0 bottom-full mb-2 w-max max-w-[min(15rem,calc(100vw-2rem))] origin-bottom-right transition-all duration-300",
          bubble && !settled ? "scale-100 opacity-100" : "scale-90 opacity-0",
        )}
      >
        <span className="relative block rounded-2xl bg-card px-3.5 py-2 text-left text-[13px] leading-snug font-semibold text-ink shadow-lift ring-1 ring-brand/10 sm:text-sm">
          Woof! Got any questions?{" "}
          <span className="inline-flex items-center gap-1 whitespace-nowrap">
            <WhatsAppIcon className="size-3.5 shrink-0 text-[#25D366] sm:size-4" />
            WhatsApp us!
          </span>
          <span
            className="absolute -bottom-1.5 right-6 size-3 bg-card"
            style={{ clipPath: "polygon(100% 0, 100% 100%, 0 0)" }}
          />
        </span>
      </div>

      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        aria-label={`Chat with MeetMyPets on WhatsApp (${whatsapp.display})`}
        onFocus={wake}
        onTouchStart={() => {
          if (settled) wake();
        }}
        className="block min-h-11 min-w-11 rounded-2xl focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-brand"
      >
        {/* Re-keyed per wake so the WebP animation restarts from frame one. */}
        <Image
          key={run}
          src={art.src}
          alt=""
          width={art.w}
          height={art.h}
          unoptimized={rich}
          sizes="116px"
          draggable={false}
          className="block h-auto w-full drop-shadow-[0_10px_14px_rgba(31,26,23,0.22)]"
        />
      </a>
    </aside>
  );
}
