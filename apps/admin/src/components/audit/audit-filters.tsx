"use client";

import { Search } from "lucide-react";
import { useEffect, useRef, useState } from "react";

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
import { AUDIT_ACTIONS } from "@/lib/audit-actions";
import { AUDIT_TARGET_TYPES, type AuditQuery } from "@/lib/audit-contract";

/**
 * Action / target / date-range / free-text filters.
 *
 * Dates use native `<input type="date">` rather than a calendar popover: one
 * fewer dependency, and keyboard and screen-reader support come for free.
 */
export function AuditFilters({
  query,
  onChange,
}: {
  query: AuditQuery;
  onChange: (next: Partial<AuditQuery>) => void;
}) {
  const [draft, setDraft] = useState(query.q ?? "");
  const committed = useRef(query.q ?? "");

  useEffect(() => {
    if (draft === committed.current) return;
    const timer = setTimeout(() => {
      committed.current = draft;
      onChange({ q: draft || undefined });
    }, 300);
    return () => clearTimeout(timer);
  }, [draft, onChange]);

  const hasFilters =
    Boolean(query.q) || query.action !== "all" || query.targetType !== "all" || query.from || query.to;

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
          placeholder={copy.audit.searchPlaceholder}
          aria-label={copy.audit.searchPlaceholder}
          className="pl-9"
        />
      </div>

      <div className="flex flex-wrap items-end gap-3">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="audit-action">{copy.audit.filters.action}</Label>
          <Select
            value={query.action}
            onValueChange={(value) =>
              onChange({ action: (value ?? "all") as AuditQuery["action"] })
            }
          >
            <SelectTrigger id="audit-action" className="w-52">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{copy.audit.filters.all}</SelectItem>
              {AUDIT_ACTIONS.map((action) => (
                <SelectItem key={action} value={action}>
                  {copy.audit.actionLabels[action]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="audit-target">{copy.audit.filters.target}</Label>
          <Select
            value={query.targetType}
            onValueChange={(value) =>
              onChange({ targetType: (value ?? "all") as AuditQuery["targetType"] })
            }
          >
            <SelectTrigger id="audit-target" className="w-36">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{copy.audit.filters.all}</SelectItem>
              {AUDIT_TARGET_TYPES.map((type) => (
                <SelectItem key={type} value={type}>
                  {copy.audit.targetTypes[type]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="audit-from">{copy.audit.filters.from}</Label>
          <Input
            id="audit-from"
            type="date"
            className="w-40"
            value={query.from ?? ""}
            onChange={(event) => onChange({ from: event.target.value || undefined })}
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="audit-to">{copy.audit.filters.to}</Label>
          <Input
            id="audit-to"
            type="date"
            className="w-40"
            value={query.to ?? ""}
            onChange={(event) => onChange({ to: event.target.value || undefined })}
          />
        </div>

        {hasFilters ? (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setDraft("");
              committed.current = "";
              onChange({ q: undefined, action: "all", targetType: "all", from: undefined, to: undefined });
            }}
          >
            {copy.audit.filters.clear}
          </Button>
        ) : null}
      </div>
    </div>
  );
}
