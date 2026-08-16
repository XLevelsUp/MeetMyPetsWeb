"use client";

import { Search } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { reasonLabel, scopeLabel, statusLabel } from "@/components/reports/report-format";
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
import { REPORT_REASONS, REPORT_SCOPES, REPORT_STATUSES } from "@/lib/report-constants";
import type { ReportsQuery } from "@/lib/reports-contract";

/** Status / reason / scope / free-text filters. Debounce mirrors AuditFilters. */
export function ReportFilters({
  query,
  onChange,
}: {
  query: ReportsQuery;
  onChange: (next: Partial<ReportsQuery>) => void;
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

  // "pending" is the default, so it is not itself a sign of a filtered view —
  // otherwise the clear button would show on first paint.
  const hasFilters =
    Boolean(query.q) ||
    query.status !== "pending" ||
    query.reason !== "all" ||
    query.scope !== "all";

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
          placeholder={copy.reports.searchPlaceholder}
          aria-label={copy.reports.searchPlaceholder}
          className="pl-9"
        />
      </div>

      <div className="flex flex-wrap items-end gap-3">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="report-status">{copy.reports.filters.status}</Label>
          <Select
            value={query.status}
            onValueChange={(value) =>
              onChange({ status: (value ?? "pending") as ReportsQuery["status"] })
            }
          >
            <SelectTrigger id="report-status" className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{copy.reports.filters.all}</SelectItem>
              {REPORT_STATUSES.map((status) => (
                <SelectItem key={status} value={status}>
                  {statusLabel(status)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="report-reason">{copy.reports.filters.reason}</Label>
          <Select
            value={query.reason}
            onValueChange={(value) =>
              onChange({ reason: (value ?? "all") as ReportsQuery["reason"] })
            }
          >
            <SelectTrigger id="report-reason" className="w-52">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{copy.reports.filters.all}</SelectItem>
              {REPORT_REASONS.map((reason) => (
                <SelectItem key={reason} value={reason}>
                  {reasonLabel(reason)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="report-scope">{copy.reports.filters.scope}</Label>
          <Select
            value={query.scope}
            onValueChange={(value) => onChange({ scope: (value ?? "all") as ReportsQuery["scope"] })}
          >
            <SelectTrigger id="report-scope" className="w-36">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{copy.reports.filters.all}</SelectItem>
              {REPORT_SCOPES.map((scope) => (
                <SelectItem key={scope} value={scope}>
                  {scopeLabel(scope)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {hasFilters ? (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setDraft("");
              committed.current = "";
              onChange({ q: undefined, status: "pending", reason: "all", scope: "all" });
            }}
          >
            {copy.reports.filters.clear}
          </Button>
        ) : null}
      </div>
    </div>
  );
}
