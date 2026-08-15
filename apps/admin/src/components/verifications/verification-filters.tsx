"use client";

import { Search } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { statusLabel, typeLabel } from "@/components/verifications/verification-format";
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
import { CERTIFICATE_STATUSES, CERTIFICATE_TYPES } from "@/lib/certificate-constants";
import type { CertificatesQuery } from "@/lib/verifications-contract";

/** Status / type / free-text filters. Debounce mirrors the other queues. */
export function VerificationFilters({
  query,
  onChange,
}: {
  query: CertificatesQuery;
  onChange: (next: Partial<CertificatesQuery>) => void;
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

  // "pending" is the default, so it is not itself evidence of a filtered view.
  const hasFilters =
    Boolean(query.q) || query.status !== "pending" || query.certificateType !== "all";

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
          placeholder={copy.verifications.searchPlaceholder}
          aria-label={copy.verifications.searchPlaceholder}
          className="pl-9"
        />
      </div>

      <div className="flex flex-wrap items-end gap-3">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="verification-status">{copy.verifications.filters.status}</Label>
          <Select
            value={query.status}
            onValueChange={(value) =>
              onChange({ status: (value ?? "pending") as CertificatesQuery["status"] })
            }
          >
            <SelectTrigger id="verification-status" className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{copy.verifications.filters.all}</SelectItem>
              {CERTIFICATE_STATUSES.map((status) => (
                <SelectItem key={status} value={status}>
                  {statusLabel(status)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="verification-type">{copy.verifications.filters.type}</Label>
          <Select
            value={query.certificateType}
            onValueChange={(value) =>
              onChange({
                certificateType: (value ?? "all") as CertificatesQuery["certificateType"],
              })
            }
          >
            <SelectTrigger id="verification-type" className="w-44">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{copy.verifications.filters.all}</SelectItem>
              {CERTIFICATE_TYPES.map((type) => (
                <SelectItem key={type} value={type}>
                  {typeLabel(type)}
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
              onChange({ q: undefined, status: "pending", certificateType: "all" });
            }}
          >
            {copy.verifications.filters.clear}
          </Button>
        ) : null}
      </div>
    </div>
  );
}
