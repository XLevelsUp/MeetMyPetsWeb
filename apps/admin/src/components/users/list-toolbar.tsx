"use client";

import { Search } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { copy } from "@/config/admin";

type StatusKey = keyof typeof copy.users.statusOptions;

/** Search box + status filter, shared by the Users and Pets tables. */
export function ListToolbar({
  initialSearch,
  onSearchChange,
  status,
  onStatusChange,
  statusOptions,
}: {
  /** Read once — the input owns its value from then on. */
  initialSearch: string;
  onSearchChange: (value: string) => void;
  status: string;
  onStatusChange: (value: string) => void;
  statusOptions: readonly string[];
}) {
  // The input is the source of truth so typing stays responsive; the parent
  // (and therefore the query) is only updated once typing pauses.
  const [draft, setDraft] = useState(initialSearch);
  const committed = useRef(initialSearch);

  useEffect(() => {
    if (draft === committed.current) return;
    const timer = setTimeout(() => {
      committed.current = draft;
      onSearchChange(draft);
    }, 300);
    return () => clearTimeout(timer);
  }, [draft, onSearchChange]);

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
      <div className="relative flex-1">
        <Search
          className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
          aria-hidden="true"
        />
        <Input
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          placeholder={copy.users.searchPlaceholder}
          aria-label={copy.users.searchPlaceholder}
          className="pl-9"
        />
      </div>

      <div className="flex items-center gap-2">
        <span className="text-sm text-muted-foreground">{copy.users.statusLabel}</span>
        {/* Base UI hands back `string | null`; the filter always has a value. */}
        <Select value={status} onValueChange={(value) => onStatusChange(value ?? "all")}>
          <SelectTrigger className="w-40" aria-label={copy.users.statusLabel}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {statusOptions.map((option) => (
              <SelectItem key={option} value={option}>
                {copy.users.statusOptions[option as StatusKey]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}

