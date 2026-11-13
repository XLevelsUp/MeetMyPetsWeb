"use client";

import { useIsFetching, useIsMutating } from "@tanstack/react-query";
import { useEffect, useState } from "react";

/**
 * A thin bar across the top whenever any query or mutation is in flight.
 *
 * Every surface already shows a skeleton on FIRST load, but a background
 * refetch — the dashboard's 60s poll, a filter change, a saved decision — only
 * dimmed the content to 60% opacity, which reads as a rendering glitch rather
 * than "working". One bar covers every page without each one wiring its own.
 *
 * Held for 400ms after the last request settles: a bar that flashes for 80ms
 * is more distracting than no bar at all.
 */
export function QueryProgress() {
  const busy = useIsFetching() + useIsMutating() > 0;
  // `lingering` only ever turns OFF in the effect; the ON state is derived, so
  // nothing is set synchronously during render.
  const [lingering, setLingering] = useState(false);
  const visible = busy || lingering;

  useEffect(() => {
    if (!busy) {
      const timer = setTimeout(() => setLingering(false), 400);
      return () => clearTimeout(timer);
    }
    const raf = requestAnimationFrame(() => setLingering(true));
    return () => cancelAnimationFrame(raf);
  }, [busy]);

  return (
    <div
      aria-hidden="true"
      className={`pointer-events-none fixed inset-x-0 top-0 z-100 h-0.5 transition-opacity duration-200 ${
        visible ? "opacity-100" : "opacity-0"
      }`}
    >
      <div className="h-full w-full origin-left animate-[query-progress_1.4s_ease-in-out_infinite] bg-brand" />
    </div>
  );
}
