"use client";

import { Button } from "@/components/ui/button";
import { copy } from "@/config/admin";

// Small in-place failure with a retry, for panels too tight for QueryErrorCard.
export function InlineError({
  message,
  onRetry,
  className = "",
}: {
  message: string;
  onRetry: () => void;
  className?: string;
}) {
  return (
    <div role="alert" className={`flex flex-col items-start gap-2 ${className}`}>
      <p className="text-sm text-destructive">{message}</p>
      <Button type="button" size="sm" variant="outline" onClick={onRetry}>
        {copy.teamMessages.errors.retry}
      </Button>
    </div>
  );
}
