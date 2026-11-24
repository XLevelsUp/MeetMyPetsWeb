"use client";

import { useInfiniteQuery, useQueries } from "@tanstack/react-query";
import { MapPin } from "lucide-react";
import { useState } from "react";

import { Spinner } from "@/components/shared/spinner";
import { fetchPage, type PickedEntity } from "@/components/team-messages/entity-picker";
import { EntityAvatar } from "@/components/team-messages/entity-avatar";
import { InlineError } from "@/components/team-messages/inline-error";
import { fill } from "@/components/team-messages/team-format";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { copy } from "@/config/admin";
import { shouldRetry } from "@/lib/team-messages-client";
import type { TeamAudience } from "@/lib/team-messages-constants";

const t = copy.teamMessages.composer.recipients;
const STACK = 5;

// Where each slice of the audience can be listed from. "static" = exactly what staff ticked.
export type RecipientSource =
  | { key: string; title: string; type: "static"; items: PickedEntity[] }
  | { key: string; title: string; type: "remote"; kind: "pets" | "no-pet-people"; speciesId?: string };

export type RecipientPlan = { sources: RecipientSource[]; locationOnly: boolean };

export function planRecipients(
  audience: TeamAudience,
  picked: { pet: PickedEntity[]; pets: PickedEntity[]; people: PickedEntity[]; speciesIds: string[] },
  speciesNames: Map<string, string>,
): RecipientPlan {
  switch (audience) {
    case "all":
      return {
        locationOnly: false,
        sources: [
          { key: "all-pets", title: t.allPets, type: "remote", kind: "pets" },
          { key: "no-pet", title: t.noPetPeople, type: "remote", kind: "no-pet-people" },
        ],
      };
    case "no_pet":
      return { locationOnly: false, sources: [{ key: "no-pet", title: t.noPetPeople, type: "remote", kind: "no-pet-people" }] };
    case "species":
      return {
        locationOnly: false,
        sources: picked.speciesIds.map((id) => ({
          key: `species-${id}`,
          title: fill(t.speciesPets, { species: speciesNames.get(id) ?? id.slice(0, 8) }),
          type: "remote" as const,
          kind: "pets" as const,
          speciesId: id,
        })),
      };
    case "pet":
      return { locationOnly: false, sources: [{ key: "pet", title: t.chosenPets, type: "static", items: picked.pet }] };
    case "pets":
      return { locationOnly: false, sources: [{ key: "pets", title: t.chosenPets, type: "static", items: picked.pets }] };
    case "people":
      return { locationOnly: false, sources: [{ key: "people", title: t.chosenPeople, type: "static", items: picked.people }] };
    default:
      return { locationOnly: true, sources: [] };
  }
}

// First page of every remote source, for the avatar stack and the "N more" line.
export function useRecipientSample(plan: RecipientPlan) {
  const remote = plan.sources.filter((s): s is Extract<RecipientSource, { type: "remote" }> => s.type === "remote");
  const results = useQueries({
    queries: remote.map((s) => ({
      queryKey: ["team-messages", "recipients", s.kind, s.speciesId ?? "all"],
      queryFn: () => fetchPage(s.kind, "", "newest", 1, { speciesId: s.speciesId, pageSize: 8 }),
      retry: shouldRetry,
      staleTime: 60_000,
    })),
  });
  const items: PickedEntity[] = [];
  let total = 0;
  let r = 0;
  for (const s of plan.sources) {
    if (s.type === "static") {
      items.push(...s.items);
      total += s.items.length;
    } else {
      const data = results[r++]?.data;
      if (data) {
        items.push(...data.items);
        total += data.total;
      }
    }
  }
  return {
    items,
    total,
    isLoading: results.some((q) => q.isPending),
    error: results.find((q) => q.isError)?.error ?? null,
    retry: () => results.forEach((q) => q.isError && void q.refetch()),
  };
}


export function AvatarStack({ items, total }: { items: PickedEntity[]; total: number }) {
  const shown = items.slice(0, STACK);
  const rest = Math.max(0, total - shown.length);
  return (
    <div className="flex items-center -space-x-2" aria-hidden="true">
      {shown.map((item) => (
        <EntityAvatar key={item.id} item={item} size="sm" />
      ))}
      {rest > 0 ? (
        <span className="inline-flex h-7 min-w-7 items-center justify-center rounded-full bg-muted px-1.5 text-[10px] font-semibold text-muted-foreground ring-2 ring-background">
          +{rest}
        </span>
      ) : null}
    </div>
  );
}

export function namesSummary(items: PickedEntity[], total: number): string {
  const names = items.slice(0, 3).map((i) => i.label);
  if (names.length === 0) return "";
  const rest = total - names.length;
  return rest > 0 ? fill(t.andMore, { names: names.join(", "), count: rest }) : names.join(", ");
}

// Compact block for the side panel and the review dialog: avatars, names, "View all".
export function RecipientsBlock({ plan, compact = false }: { plan: RecipientPlan; compact?: boolean }) {
  const sample = useRecipientSample(plan);
  const [open, setOpen] = useState(false);

  if (plan.locationOnly) {
    return (
      <p className="flex items-start gap-2 text-xs text-muted-foreground">
        <MapPin className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
        {t.locationNote}
      </p>
    );
  }
  if (plan.sources.length === 0) return <p className="text-xs text-muted-foreground">{t.incomplete}</p>;
  if (sample.total === 0 && !sample.isLoading && !sample.error) {
    return <p className="text-xs text-muted-foreground">{t.none}</p>;
  }
  if (sample.error) return <InlineError message={sample.error.message} onRetry={sample.retry} />;

  return (
    <div className="flex min-w-0 flex-col gap-2">
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-medium text-muted-foreground">{t.title}</span>
        <Button type="button" variant="link" size="sm" className="h-auto p-0 text-xs" onClick={() => setOpen(true)}>
          {t.viewAll}
        </Button>
      </div>
      {sample.isLoading && sample.items.length === 0 ? (
        <p className="flex items-center gap-2 text-xs text-muted-foreground">
          <Spinner size="sm" />
          {t.loading}
        </p>
      ) : (
        <div className={`flex min-w-0 gap-2.5 ${compact ? "items-center" : "flex-col"}`}>
          <AvatarStack items={sample.items} total={sample.total} />
          <p className="min-w-0 truncate text-xs text-muted-foreground" title={namesSummary(sample.items, sample.total)}>
            {namesSummary(sample.items, sample.total)}
          </p>
        </div>
      )}
      <RecipientsSheet open={open} onOpenChange={setOpen} plan={plan} />
    </div>
  );
}

function RecipientRow({ item }: { item: PickedEntity }) {
  return (
    <li className="flex min-w-0 items-center gap-3 px-3 py-2">
      <EntityAvatar item={item} />
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-medium">{item.label}</span>
        {item.meta ? <span className="block truncate text-xs text-muted-foreground">{item.meta}</span> : null}
      </span>
    </li>
  );
}

function RemoteSection({ source }: { source: Extract<RecipientSource, { type: "remote" }> }) {
  const pages = useInfiniteQuery({
    queryKey: ["team-messages", "recipients-all", source.kind, source.speciesId ?? "all"],
    initialPageParam: 1,
    queryFn: ({ pageParam }) => fetchPage(source.kind, "", "name", pageParam, { speciesId: source.speciesId }),
    getNextPageParam: (last) => (last.page * last.pageSize < last.total ? last.page + 1 : undefined),
    retry: shouldRetry,
    staleTime: 60_000,
  });
  const items = pages.data?.pages.flatMap((p) => p.items) ?? [];
  const total = pages.data?.pages[0]?.total ?? 0;
  return (
    <Section title={source.title} count={total}>
      {pages.isPending ? (
        <p className="flex items-center gap-2 p-3 text-xs text-muted-foreground">
          <Spinner size="sm" />
          {t.loading}
        </p>
      ) : pages.isError ? (
        <InlineError message={pages.error.message} onRetry={() => void pages.refetch()} className="p-3" />
      ) : (
        <>
          <ul className="divide-y">
            {items.map((item) => (
              <RecipientRow key={item.id} item={item} />
            ))}
          </ul>
          {pages.hasNextPage ? (
            <div className="border-t p-2">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="w-full"
                disabled={pages.isFetchingNextPage}
                onClick={() => void pages.fetchNextPage()}
              >
                {pages.isFetchingNextPage ? <Spinner size="sm" className="mr-1.5" /> : null}
                {pages.isFetchingNextPage ? copy.teamMessages.composer.loadingMore : copy.teamMessages.composer.showMore}
              </Button>
            </div>
          ) : null}
        </>
      )}
    </Section>
  );
}

function Section({ title, count, children }: { title: string; count: number; children: React.ReactNode }) {
  return (
    <section className="shrink-0 overflow-hidden rounded-lg border">
      <h3 className="flex items-center justify-between bg-muted/50 px-3 py-2 text-xs font-semibold">
        <span>{title}</span>
        <span className="tabular-nums text-muted-foreground">{count}</span>
      </h3>
      {children}
    </section>
  );
}

export function RecipientsSheet({
  open,
  onOpenChange,
  plan,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  plan: RecipientPlan;
}) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="gap-0 p-0 data-[side=right]:w-full data-[side=right]:sm:max-w-lg">
        <SheetHeader className="border-b p-4">
          <SheetTitle>{t.sheetTitle}</SheetTitle>
          <SheetDescription className="text-xs">{t.sheetHint}</SheetDescription>
        </SheetHeader>
        <div className="flex flex-1 flex-col gap-3 overflow-y-auto p-4">
          {open
            ? plan.sources.map((s) =>
                s.type === "static" ? (
                  <Section key={s.key} title={s.title} count={s.items.length}>
                    <ul className="divide-y">
                      {s.items.map((item) => (
                        <RecipientRow key={item.id} item={item} />
                      ))}
                    </ul>
                  </Section>
                ) : (
                  <RemoteSection key={s.key} source={s} />
                ),
              )
            : null}
        </div>
      </SheetContent>
    </Sheet>
  );
}
