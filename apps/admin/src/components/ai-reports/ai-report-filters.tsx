"use client";

import { Search } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { mediaLabel } from "@/components/ai-reports/ai-report-format";
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
import { AI_CONTENT_TYPES, AI_MEDIA_TYPES } from "@/lib/ai-moderation-constants";
import { AI_REVIEW_FILTERS, type AiDecisionsQuery } from "@/lib/ai-moderation-contract";

/** Review / verdict / media / type / free-text filters. Debounce mirrors ReportFilters. */
export function AiReportFilters({
  query,
  onChange,
}: {
  query: AiDecisionsQuery;
  onChange: (next: Partial<AiDecisionsQuery>) => void;
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

  // "needs_review" is the default, so it is not itself a sign of a filtered
  // view — otherwise the clear button would show on first paint.
  const hasFilters =
    Boolean(query.q) ||
    query.review !== "needs_review" ||
    query.decision !== "all" ||
    query.media !== "all" ||
    query.content !== "all";

  const reviewLabels = copy.aiReports.reviewFilterLabels as Record<string, string>;

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
          placeholder={copy.aiReports.searchPlaceholder}
          aria-label={copy.aiReports.searchPlaceholder}
          className="pl-9"
        />
      </div>

      <div className="flex flex-wrap items-end gap-3">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="ai-review">{copy.aiReports.filters.review}</Label>
          <Select
            value={query.review}
            onValueChange={(value) => onChange({ review: value as AiDecisionsQuery["review"] })}
          >
            <SelectTrigger id="ai-review" className="w-64">
              <SelectValue>
                {(value: string) =>
                  value === "all" ? copy.aiReports.filters.all : reviewLabels[value]
                }
              </SelectValue>
            </SelectTrigger>
            {/* alignItemWithTrigger shifts the popup over its own label; open below instead. */}
            <SelectContent alignItemWithTrigger={false} align="start">
              {AI_REVIEW_FILTERS.map((value) => (
                <SelectItem key={value} value={value}>
                  {value === "all" ? copy.aiReports.filters.all : reviewLabels[value]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* "What the AI decided" is gone: "Show" now covers who decided and what they decided. */}
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="ai-media">{copy.aiReports.filters.media}</Label>
          <Select
            value={query.media}
            onValueChange={(value) => onChange({ media: value as AiDecisionsQuery["media"] })}
          >
            <SelectTrigger id="ai-media" className="w-44">
              {/* Without a formatter Base UI prints the raw value ("pet_profile_photo"). */}
              <SelectValue>
                {(value: string) =>
                  value === "all" ? copy.aiReports.filters.all : mediaLabel(value)
                }
              </SelectValue>
            </SelectTrigger>
            {/* post_media is omitted: it is the same user-facing thing as pet_media and
                holds 1 row to pet_media's 159, so a second "In a post" would read as a bug. */}
            <SelectContent alignItemWithTrigger={false} align="start">
              <SelectItem value="all">{copy.aiReports.filters.all}</SelectItem>
              {AI_MEDIA_TYPES.filter((value) => value !== "post_media").map((value) => (
                <SelectItem key={value} value={value}>
                  {mediaLabel(value)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="ai-content">{copy.aiReports.filters.content}</Label>
          <Select
            value={query.content}
            onValueChange={(value) => onChange({ content: value as AiDecisionsQuery["content"] })}
          >
            <SelectTrigger id="ai-content" className="w-32">
              <SelectValue>
                {(value: string) =>
                  value === "all"
                    ? copy.aiReports.filters.all
                    : value === "image"
                      ? "Photo"
                      : "Video"
                }
              </SelectValue>
            </SelectTrigger>
            <SelectContent alignItemWithTrigger={false} align="start">
              <SelectItem value="all">{copy.aiReports.filters.all}</SelectItem>
              {AI_CONTENT_TYPES.map((value) => (
                <SelectItem key={value} value={value}>
                  {value === "image" ? "Image" : "Video"}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {hasFilters && (
          <Button
            variant="ghost"
            onClick={() => {
              setDraft("");
              committed.current = "";
              onChange({
                q: undefined,
                review: "needs_review",
                decision: "all",
                media: "all",
                content: "all",
              });
            }}
          >
            {copy.aiReports.filters.clear}
          </Button>
        )}
      </div>
    </div>
  );
}
