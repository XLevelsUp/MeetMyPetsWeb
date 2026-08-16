"use client";

import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";

import { queryToSearchParams } from "@/lib/users-contract";

/**
 * List state that lives in the address bar.
 *
 * A filtered view is worth sharing and worth returning to: paste the URL to a
 * colleague, reload after acting on a row, come back from a profile with the
 * browser's Back button and find the same page of the same filtered list.
 *
 * The initial value is parsed SERVER-SIDE and handed in, rather than read here
 * with `useSearchParams` — that hook forces the component into a Suspense
 * boundary and a client-side second render, which is the pattern
 * `reports/page.tsx` and `trust/page.tsx` already avoid.
 *
 * Only the ACTIVE tab writes. The two tabs share one query string (they are
 * mutually exclusive views of the same screen), so two writers would fight over
 * `status` and `sort`. When a tab becomes active it publishes its own state, so
 * switching tabs leaves the URL describing what is actually on screen.
 *
 * `router.replace`, not `push`: typing in a filter should not bury the previous
 * page under twenty history entries. `scroll: false` keeps the viewport where
 * the reader left it.
 */
export function useUrlSyncedQuery<Q extends Record<string, unknown>>(
  initial: Q,
  defaults: Record<string, unknown>,
  { active, extraParams }: { active: boolean; extraParams?: Record<string, string> },
): [Q, (updater: (prev: Q) => Q) => void] {
  const router = useRouter();
  const pathname = usePathname();
  const [query, setQueryState] = useState<Q>(initial);

  // The state updater must stay pure, so navigation happens outside it and the
  // ref carries the current value instead of a stale closure.
  const current = useRef(query);

  const publish = useCallback(
    (next: Q) => {
      const params = queryToSearchParams(next, defaults);
      for (const [key, value] of Object.entries(extraParams ?? {})) params.set(key, value);
      const search = params.toString();
      router.replace(search ? `${pathname}?${search}` : pathname, { scroll: false });
    },
    // `defaults` and `extraParams` are module constants and a one-key object;
    // depending on their identity would republish on every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [pathname, router],
  );

  const setQuery = useCallback(
    (updater: (prev: Q) => Q) => {
      const next = updater(current.current);
      current.current = next;
      setQueryState(next);
      if (active) publish(next);
    },
    [active, publish],
  );

  // Becoming active republishes, so the URL describes the visible tab.
  useEffect(() => {
    if (active) publish(current.current);
  }, [active, publish]);

  return [query, setQuery];
}
