"use client";

import { useCallback, useSyncExternalStore } from "react";

export const TIME_CHART_TYPES = ["area", "line", "bar"] as const;
export type TimeChartType = (typeof TIME_CHART_TYPES)[number];

export const CATEGORY_CHART_TYPES = ["bar", "horizontal", "donut"] as const;
export type CategoryChartType = (typeof CATEGORY_CHART_TYPES)[number];

const PREFIX = "mmp-admin:chart-type:";
const CHANGED = "mmp-admin:chart-type-changed";

// In-memory copy so the choice still works this session when storage is blocked (private mode).
const memory = new Map<string, string>();

function read(key: string): string | null {
  if (memory.has(key)) return memory.get(key) ?? null;
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function subscribe(onChange: () => void) {
  window.addEventListener("storage", onChange);
  window.addEventListener(CHANGED, onChange);
  return () => {
    window.removeEventListener("storage", onChange);
    window.removeEventListener(CHANGED, onChange);
  };
}

/** One viewer's chosen chart type for one chart, remembered in this browser. */
export function useChartType<T extends string>(chartId: string, allowed: readonly T[], fallback: T) {
  const key = PREFIX + chartId;
  const stored = useSyncExternalStore(subscribe, () => read(key), () => null);
  const type = stored !== null && (allowed as readonly string[]).includes(stored) ? (stored as T) : fallback;

  const setType = useCallback(
    (next: T) => {
      memory.set(key, next);
      try {
        window.localStorage.setItem(key, next);
      } catch {
        // Blocked storage: the in-memory copy above still carries the choice.
      }
      window.dispatchEvent(new Event(CHANGED));
    },
    [key],
  );

  return [type, setType] as const;
}
