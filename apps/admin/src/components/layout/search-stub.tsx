"use client";

import { Search } from "lucide-react";

import { Input } from "@/components/ui/input";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { copy } from "@/config/admin";

/**
 * Global search — UI stub in Phase 1. Disabled input under a tooltip; the
 * command palette arrives with the moderation tables it will search over.
 */
export function SearchStub() {
  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <div className="relative hidden w-full max-w-sm md:block">
            <Search
              aria-hidden
              className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
            />
            <Input
              type="search"
              disabled
              placeholder={copy.searchPlaceholder}
              className="pl-8"
              aria-label="Global search (coming soon)"
            />
          </div>
        }
      />
      <TooltipContent>{copy.comingSoon}</TooltipContent>
    </Tooltip>
  );
}
