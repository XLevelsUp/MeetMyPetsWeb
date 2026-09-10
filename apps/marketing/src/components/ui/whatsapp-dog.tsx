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
 * WhatsApp launcher, as the waving mascot — replaces both the generic green
 * button and the decorative corner greeter. Greets on arrival, tucks to a
 * peek, and opens WhatsApp on tap.
 *
 * A real control, so unlike the old greeter it is a focusable <a> with a
 * descriptive label, and it renders at every width — a contact route that
 * disappears on phones is a lost conversation.
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
    // A landmark: this sits outside <main>, so without one the link
    // belongs to no region and is hard to find by landmark navigation.
    <aside
      aria-label="Contact us on WhatsApp"
      className={cn(
        "fixed right-2 z-40 sm:right-4 lg:right-5",
        // ~1.8:1 artwork; the link below clears the 44px touch minimum.
        "w-[84px] sm:w-[100px] lg:w-[118px]",
        // Sits above the iOS home indicator rather than under it.
        "bottom-[max(0px,env(safe-area-inset-bottom))]",
        "transition-transform duration-500 ease-[cubic-bezier(.22,1,.36,1)]",
        // Tucked leaves the head visible and still tappable.
        settled ? "translate-y-[44%] sm:translate-y-[52%]" : "translate-y-0",
      )}
      onPointerEnter={(event) => {
        if (event.pointerType === "mouse") wake();
      }}
    >
      {/* `absolute` so the text is not squeezed by the dog-width wrapper.
          aria-hidden — the link's own label already says what tapping does. */}
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
