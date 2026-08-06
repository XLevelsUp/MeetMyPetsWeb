"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { copy } from "@/config/admin";

/**
 * Soft failure state for a query that returned an error.
 *
 * Query-level failures render inline with a retry rather than throwing to the
 * route error boundary — one broken panel shouldn't blank the whole page.
 */
export function QueryErrorCard({
  message,
  onRetry,
  children,
}: {
  message: string;
  onRetry: () => void;
  /** Optional extra actions rendered next to Retry. */
  children?: React.ReactNode;
}) {
  return (
    <Card>
      <CardContent className="flex flex-col items-start gap-3 pt-6">
        <p className="text-sm text-destructive">{message}</p>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={onRetry}>
            {copy.common.retry}
          </Button>
          {children}
        </div>
      </CardContent>
    </Card>
  );
}
