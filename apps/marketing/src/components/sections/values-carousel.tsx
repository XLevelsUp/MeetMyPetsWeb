"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";

import { about } from "@/config/site";
import { cn } from "@/lib/utils";

const ITEMS = about.values.items;

// Three copies so a card always exists either side — the loop wraps through the
// middle one, so neither end of the real list is ever reachable.
const LOOP = [...ITEMS, ...ITEMS, ...ITEMS];
const COUNT = ITEMS.length;

/**
 * Values carousel — one card centred, neighbours peeking in, looping endlessly.
 *
 * Scroll-snap does the moving, so touch swipe, momentum and keyboard scrolling
 * come free and it degrades to a plain horizontal list without JavaScript.
 * Mouse drag is layered on top for pointer users, who otherwise have only the
 * arrows (UX rule 24: horizontal gestures belong in a carousel, not the page).
 */
export function ValuesCarousel() {
  const trackRef = useRef<HTMLUListElement>(null);
  const [active, setActive] = useState(0);
  const [dragging, setDragging] = useState(false);
  // Guards the silent recentre, which would otherwise read as a user scroll.
  const wrapping = useRef(false);
  // Refs, not state: these change every pointermove and must not re-render.
  // `active` mirrors the dragging flag because the pointermove handler closes
  // over the render that created it, where state is still the old value.
  const drag = useRef({ startX: 0, startScroll: 0, active: false });

  // Index into the tripled list whose centre is closest to the viewport centre.
  const nearestIndex = useCallback((track: HTMLUListElement) => {
    const centre = track.scrollLeft + track.clientWidth / 2;
    let nearest = 0;
    let best = Infinity;
    [...track.children].forEach((child, i) => {
      const el = child as HTMLElement;
      const mid = el.offsetLeft + el.offsetWidth / 2;
      const d = Math.abs(mid - centre);
      if (d < best) {
        best = d;
        nearest = i;
      }
    });
    return nearest;
  }, []);

  // Scroll distance that centres a given card, without scrollIntoView — that
  // scrolls ancestors too, which drags the whole page sideways mid-loop.
  const offsetFor = useCallback((track: HTMLUListElement, index: number) => {
    const el = track.children[index] as HTMLElement | undefined;
    if (!el) return track.scrollLeft;
    return el.offsetLeft + el.offsetWidth / 2 - track.clientWidth / 2;
  }, []);

  const goTo = useCallback(
    (index: number, smooth = true) => {
      const track = trackRef.current;
      if (!track) return;
      // Honour prefers-reduced-motion: a smooth scroll is motion the user opted out of.
      const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      track.scrollTo({ left: offsetFor(track, index), behavior: reduced && smooth ? "auto" : smooth ? "smooth" : "auto" });
    },
    [offsetFor],
  );

  // Start centred on the middle copy so there is already a card either side.
  useEffect(() => {
    const track = trackRef.current;
    if (!track) return;
    track.scrollLeft = offsetFor(track, COUNT);
    setActive(0);
  }, [offsetFor]);

  // Derive the active card from scroll position rather than tracking it
  // separately, so drag, swipe and dot clicks can never disagree.
  const handleScroll = useCallback(() => {
    const track = trackRef.current;
    if (!track) return;
    if (wrapping.current) return;
    const i = nearestIndex(track);
    setActive(i % COUNT);

    // Jump a whole copy's width once a neighbouring copy is centred. The card
    // under the viewport is identical, so the teleport is invisible.
    if (i < COUNT || i >= COUNT * 2) {
      wrapping.current = true;
      const target = (i % COUNT) + COUNT;
      track.scrollLeft = offsetFor(track, target);
      requestAnimationFrame(() => {
        wrapping.current = false;
      });
    }
  }, [nearestIndex, offsetFor]);

  function onPointerDown(event: React.PointerEvent) {
    // Mouse only: touch already has native momentum scrolling, and hijacking
    // it would fight the browser rather than help.
    if (event.pointerType !== "mouse") return;
    const track = trackRef.current;
    if (!track) return;
    setDragging(true);
    drag.current = { startX: event.clientX, startScroll: track.scrollLeft, active: true };
    track.setPointerCapture(event.pointerId);
  }

  function onPointerMove(event: React.PointerEvent) {
    // Read the ref, not `dragging`: this handler was created in the render
    // before setDragging(true) landed, so the state here is still false.
    if (!drag.current.active) return;
    const track = trackRef.current;
    if (!track) return;
    track.scrollLeft = drag.current.startScroll - (event.clientX - drag.current.startX);
  }

  const endDrag = useCallback(() => {
    if (!drag.current.active) return;
    drag.current.active = false;
    setDragging(false);
    // Snap to whichever card is nearest once the grab is released.
    const track = trackRef.current;
    if (!track) return;
    goTo(nearestIndex(track));
  }, [goTo, nearestIndex]);

  // Step relative to where the track actually sits, so the move is always to an
  // adjacent card and never jumps across a copy boundary.
  const step = useCallback(
    (delta: number) => {
      const track = trackRef.current;
      if (!track) return;
      goTo(nearestIndex(track) + delta);
    },
    [goTo, nearestIndex],
  );

  // Dots address a value, not a position. Scroll to whichever copy of it is
  // closest, so the travel is never longer than half the loop.
  const goToValue = useCallback(
    (value: number) => {
      const track = trackRef.current;
      if (!track) return;
      const here = nearestIndex(track);
      const candidates = [value, value + COUNT, value + COUNT * 2];
      goTo(candidates.reduce((a, b) => (Math.abs(b - here) < Math.abs(a - here) ? b : a)));
    },
    [goTo, nearestIndex],
  );

  // A drag that ends outside the track still has to release, or the next
  // click anywhere would be swallowed by a stuck dragging state.
  useEffect(() => {
    if (!dragging) return;
    window.addEventListener("pointerup", endDrag);
    window.addEventListener("pointercancel", endDrag);
    return () => {
      window.removeEventListener("pointerup", endDrag);
      window.removeEventListener("pointercancel", endDrag);
    };
  }, [dragging, endDrag]);

  return (
    <div className="relative">
      {/* Never disabled: the track loops, so there is always a card either way. */}
      <button
        type="button"
        onClick={() => step(-1)}
        aria-label="Previous value"
        className="absolute top-1/2 left-2 z-20 hidden size-12 -translate-y-1/2 cursor-pointer place-items-center rounded-full bg-card text-ink-soft shadow-lift transition-colors hover:text-brand-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand lg:grid"
      >
        <ChevronLeft className="size-5" aria-hidden="true" />
      </button>
      <button
        type="button"
        onClick={() => step(1)}
        aria-label="Next value"
        className="absolute top-1/2 right-2 z-20 hidden size-12 -translate-y-1/2 cursor-pointer place-items-center rounded-full bg-card text-ink-soft shadow-lift transition-colors hover:text-brand-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand lg:grid"
      >
        <ChevronRight className="size-5" aria-hidden="true" />
      </button>

      <ul
        ref={trackRef}
        onScroll={handleScroll}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        className={cn(
          // The top padding is load-bearing: each pet overhangs the card and the
          // scroller clips vertically, so too little here beheads them.
          // No side padding: the loop always supplies a real card either side,
          // so the gap that padding used to fill no longer exists.
          "flex snap-x snap-mandatory items-start gap-6 overflow-x-auto pt-28 pb-10 [scrollbar-width:none] sm:gap-10 sm:pt-32 [&::-webkit-scrollbar]:hidden",
          // Grab cursor only where a mouse exists; `select-none` while dragging
          // stops the gesture highlighting the card text.
          dragging ? "cursor-grabbing select-none" : "lg:cursor-grab",
          // Snap fights a drag in progress — re-enabled the moment it ends.
          dragging && "snap-none",
        )}
      >
        {LOOP.map((item, i) => {
          // Only the copy actually centred is "live" — the other two are the
          // duplicates that make the wrap seamless.
          const isActive = i % COUNT === active;
          return (
          <li
            key={`${item.id}-${i}`}
            // Staggered heights, as in the reference: the centred card rides up
            // and its neighbours sit lower. Tied to `active`, so the lift travels.
            className={cn(
              "w-[min(86vw,32rem)] shrink-0 snap-center transition-[margin] duration-500 ease-out",
              isActive ? "sm:mt-0" : "sm:mt-12 lg:mt-16",
            )}
            aria-current={isActive ? "true" : undefined}
            // The duplicates are presentational: a screen reader should hear the
            // five values once, not fifteen.
            aria-hidden={i < COUNT || i >= COUNT * 2 ? "true" : undefined}
          >
            <div
              className={cn(
                // No h-full: cards are staggered, so matching heights would only
                // add dead space under the shorter ones.
                "relative flex flex-col rounded-[1.75rem] bg-card px-7 pt-16 pb-9 text-center transition-[opacity,transform,box-shadow] duration-500 sm:px-10 sm:pt-20",
                isActive ? "opacity-100 shadow-float" : "opacity-50 shadow-soft lg:scale-[0.95]",
              )}
            >
              <Image
                src={item.pet.src}
                alt={item.pet.alt}
                width={220}
                height={420}
                // Pointer-events off so a drag starting on the pet still scrolls.
                className="pointer-events-none absolute -top-24 left-1/2 h-36 w-auto -translate-x-1/2 drop-shadow-lg select-none sm:-top-28 sm:h-40"
              />
              <h3 className="font-heading text-xl font-bold tracking-wide text-ink uppercase sm:text-2xl">
                {item.title}
              </h3>
              <span
                aria-hidden="true"
                className={cn(
                  "mx-auto mt-3 h-1 rounded-full transition-all duration-500",
                  isActive ? "w-14 bg-brand" : "w-8 bg-border",
                )}
              />
              <p className="mt-4 leading-relaxed text-ink-soft">{item.body}</p>
            </div>
          </li>
          );
        })}
      </ul>

      {/* The dot is 8px tall but the button is 44px square — the hit area is
          padding, not the visible mark, so the target meets the touch minimum. */}
      <div className="flex justify-center">
        {ITEMS.map((item, i) => (
          <button
            key={item.id}
            type="button"
            onClick={() => goToValue(i)}
            aria-label={`Show ${item.title}`}
            aria-current={active === i ? "true" : undefined}
            className="group grid size-11 cursor-pointer place-items-center rounded-full focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
          >
            <span
              className={cn(
                "h-2 rounded-full transition-all duration-300",
                active === i ? "w-8 bg-brand" : "w-2 bg-border group-hover:bg-brand/40",
              )}
            />
          </button>
        ))}
      </div>
    </div>
  );
}
