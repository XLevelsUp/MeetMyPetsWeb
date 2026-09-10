"use client";

import { useReducedMotion } from "motion/react";
import { useEffect, useRef } from "react";

const POOL_SIZE = 10;
/** Pointer travel (px) between one print and the next. */
const STRIDE_PX = 44;
/** Sideways offset (px) alternating left/right so prints read as footsteps. */
const STANCE_PX = 7;
const PRINT_PX = 18;

// lucide's paw-print, inlined once. Static markup authored here — never user
// input — so innerHTML is safe.
const PAW_SVG =
  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' +
  '<circle cx="11" cy="4" r="2"/><circle cx="18" cy="8" r="2"/><circle cx="20" cy="16" r="2"/>' +
  '<path d="M9 10a5 5 0 0 1 5 5v3.5a3.5 3.5 0 0 1-6.84 1.045Q6.52 17.48 4.46 16.84A3.5 3.5 0 0 1 5.5 10Z"/></svg>';

/**
 * Paw prints left behind the pointer — a companion to the native cursor, not
 * a replacement: replacing it hides the affordances people rely on (text
 * I-beam, link hand) and does nothing on touch.
 *
 * A fixed pool of DOM nodes recycled in order, positioned straight from the
 * pointer handler, so moving the mouse never triggers a React render. Fine
 * pointers and desktop widths only; nothing under reduced motion.
 */
export function PawCursorTrail() {
  const reduced = useReducedMotion();
  const hostRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (reduced) return;
    if (!window.matchMedia("(pointer: fine)").matches) return;
    const host = hostRef.current;
    if (!host) return;

    const pool: HTMLSpanElement[] = [];
    for (let i = 0; i < POOL_SIZE; i++) {
      const el = document.createElement("span");
      el.className = "paw-step";
      el.innerHTML = PAW_SVG;
      host.appendChild(el);
      pool.push(el);
    }

    let next = 0;
    let lastX = Number.NaN;
    let lastY = Number.NaN;
    let side = 1;

    const onMove = (event: PointerEvent) => {
      if (Number.isNaN(lastX)) {
        lastX = event.clientX;
        lastY = event.clientY;
        return;
      }
      const dx = event.clientX - lastX;
      const dy = event.clientY - lastY;
      const dist = Math.hypot(dx, dy);
      if (dist < STRIDE_PX) return;

      side = -side;
      const heading = (Math.atan2(dy, dx) * 180) / Math.PI + 90;
      const offX = (-dy / dist) * side * STANCE_PX;
      const offY = (dx / dist) * side * STANCE_PX;

      const el = pool[next];
      next = (next + 1) % POOL_SIZE;
      el.style.transform = `translate(${event.clientX + offX - PRINT_PX / 2}px, ${event.clientY + offY - PRINT_PX / 2}px) rotate(${heading}deg)`;
      // Restart the CSS animation on a recycled node.
      el.classList.remove("is-on");
      void el.offsetWidth;
      el.classList.add("is-on");

      lastX = event.clientX;
      lastY = event.clientY;
    };

    window.addEventListener("pointermove", onMove, { passive: true });
    return () => {
      window.removeEventListener("pointermove", onMove);
      pool.forEach((el) => el.remove());
    };
  }, [reduced]);

  return (
    <div
      ref={hostRef}
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 z-30 hidden lg:block"
    />
  );
}
