"use client";

import { Button } from "@/components/ui/button";

/**
 * Hard error boundary for the dashboard group. Query-level failures are
 * handled inline by MetricGrid; this catches render-time crashes.
 *
 * Next 16.2: the retry prop is `unstable_retry` (renamed from `reset`).
 */
export default function DashboardError({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string };
  unstable_retry: () => void;
}) {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-4 p-6 text-center">
      <h1 className="text-xl font-semibold">Something went wrong</h1>
      <p className="max-w-md text-sm text-muted-foreground">
        {error.digest ? `Error reference: ${error.digest}` : error.message}
      </p>
      <Button variant="outline" onClick={() => unstable_retry()}>
        Try again
      </Button>
    </main>
  );
}
