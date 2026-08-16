"use client";

import { Search } from "lucide-react";
import { useEffect, useRef, useState, type ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { copy } from "@/config/admin";

type StatusKey = keyof typeof copy.users.statusOptions;

/**
 * Search + status + whatever else the tab needs, shared by Users and Pets.
 *
 * Tab-specific filters come in as `children` rather than as more props, so
 * this file does not have to know that pets have a species and accounts have a
 * joined date. `onClear` follows report-filters.tsx and audit-filters.tsx: the
 * control only appears once there is something to clear, so it is not a
 * permanently dead button.
 */
export function ListToolbar({
  initialSearch,
  onSearchChange,
  status,
  onStatusChange,
  statusOptions,
  children,
  hasFilters = false,
  onClear,
}: {
  /** Read once — the input owns its value from then on. */
  initialSearch: string;
  onSearchChange: (value: string) => void;
  status: string;
  onStatusChange: (value: string) => void;
  statusOptions: readonly string[];
  children?: ReactNode;
  hasFilters?: boolean;
  onClear?: () => void;
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
    <div className="flex flex-col gap-3">
      <div className="relative">
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

      <div className="flex flex-wrap items-end gap-3">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="list-status">{copy.users.statusLabel}</Label>
          {/* Base UI hands back `string | null`; the filter always has a value. */}
          <Select value={status} onValueChange={(value) => onStatusChange(value ?? "all")}>
            <SelectTrigger id="list-status" className="w-40">
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

        {children}

        {hasFilters && onClear ? (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setDraft("");
              committed.current = "";
              onClear();
            }}
          >
            {copy.users.clearFilters}
          </Button>
        ) : null}
      </div>
    </div>
  );
}
