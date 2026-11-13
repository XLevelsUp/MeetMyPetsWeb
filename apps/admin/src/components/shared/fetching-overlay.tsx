"use client";

import { Spinner } from "@/components/shared/spinner";
import { copy } from "@/config/admin";

/**
 * Keeps stale rows visible while fresh ones load, instead of flashing empty.
 *
 * React Query's `keepPreviousData` holds the old page during a refetch, which
 * is right — but with no indicator the table looks frozen. The top progress
 * bar says "something is loading"; this says "it is THIS table".
 *
 * Wrap the scrolling container, not the page: the overlay is positioned
 * against its nearest relative ancestor.
 */
export function FetchingOverlay({
  isFetching,
  children,
}: {
  isFetching: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="relative" aria-busy={isFetching}>
      <div
        className={
          isFetching ? "pointer-events-none opacity-40 transition-opacity" : "transition-opacity"
        }
      >
        {children}
      </div>

      {/* A small pill was lost on a full-width table; this veils the rows and
          centres a card the eye cannot miss. */}
      {isFetching && (
        <div className="absolute inset-0 z-10 flex items-center justify-center rounded-lg bg-background/55 backdrop-blur-[1px]">
          <span className="inline-flex items-center gap-3 rounded-xl border bg-card px-5 py-3.5 shadow-lg">
            <Spinner size="lg" className="text-brand" />
            <span className="text-base font-medium">{copy.common.loading}</span>
          </span>
        </div>
      )}
    </div>
  );
}
