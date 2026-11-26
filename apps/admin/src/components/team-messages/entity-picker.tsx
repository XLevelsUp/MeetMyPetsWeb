"use client";

import { useInfiniteQuery } from "@tanstack/react-query";
import { Check, Search, X } from "lucide-react";
import { useEffect, useState } from "react";

import { Spinner } from "@/components/shared/spinner";
import { EntityAvatar } from "@/components/team-messages/entity-avatar";
import { InlineError } from "@/components/team-messages/inline-error";
import { fill } from "@/components/team-messages/team-format";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { copy } from "@/config/admin";
import { queryToSearchParams } from "@/lib/contract-shared";
import { shouldRetry, teamRequest } from "@/lib/team-messages-client";
import {
  accountsQuerySchema,
  accountsResponseSchema,
  petsQuerySchema,
  petsResponseSchema,
} from "@/lib/users-contract";

// `kind` decides the avatar: pets show their photo, people show initials.
export type PickedEntity = { id: string; label: string; meta: string | null; image?: string | null; kind?: "pet" | "person" };

type Kind = "pets" | "people" | "no-pet-people";
export type Order = "newest" | "name";
export type EntityPage = { items: PickedEntity[]; page: number; total: number; pageSize: number };

const text = copy.teamMessages.composer;
const PAGE_SIZE = 20;

// Reuses the Users & Pets endpoints, limited to active records the backend would actually reach.
export async function fetchPage(
  kind: Kind,
  q: string,
  order: Order,
  page: number,
  opts: { speciesId?: string; pageSize?: number } = {},
): Promise<EntityPage> {
  const isPets = kind === "pets";
  const base = {
    q: q.length >= 2 ? q : undefined,
    status: "active",
    dir: order === "name" ? "asc" : "desc",
    page,
    pageSize: opts.pageSize ?? PAGE_SIZE,
  };
  if (isPets) {
    const query = petsQuerySchema.parse({
      ...base,
      sort: order === "name" ? "name" : "created_at",
      speciesId: opts.speciesId ?? "all",
    });
    const res = await teamRequest(`/api/v1/admin/pets?${queryToSearchParams(query)}`, petsResponseSchema);
    return {
      ...res,
      items: res.items.map((pet) => ({
        id: pet.id,
        label: pet.name ?? text.unnamed,
        meta: fill(text.petMeta, { species: pet.species ?? "—", owner: pet.ownerName ?? "—" }),
        image: pet.photoUrl,
        kind: "pet" as const,
      })),
    };
  }
  const query = accountsQuerySchema.parse({
    ...base,
    sort: order === "name" ? "display_name" : "created_at",
    hasPets: kind === "no-pet-people" ? "no" : "all",
  });
  const res = await teamRequest(`/api/v1/admin/users?${queryToSearchParams(query)}`, accountsResponseSchema);
  return {
    ...res,
    items: res.items.map((account) => ({
      id: account.id,
      label: account.displayName ?? account.email ?? text.unnamed,
      meta: account.displayName ? account.email : account.phone,
      kind: "person" as const,
    })),
  };
}

function useEntityPages(kind: Kind, term: string, order: Order) {
  return useInfiniteQuery({
    queryKey: ["team-messages", "picker", kind, term.length < 2 ? "" : term, order],
    initialPageParam: 1,
    queryFn: ({ pageParam }) => fetchPage(kind, term, order, pageParam),
    getNextPageParam: (last) => (last.page * last.pageSize < last.total ? last.page + 1 : undefined),
    retry: shouldRetry,
    staleTime: 30_000,
  });
}

function useDebouncedTerm(input: string) {
  const [term, setTerm] = useState("");
  useEffect(() => {
    const timer = setTimeout(() => setTerm(input.trim()), 300);
    return () => clearTimeout(timer);
  }, [input]);
  return term;
}

function Toolbar({
  kind,
  input,
  setInput,
  order,
  setOrder,
  listId,
}: {
  kind: Kind;
  input: string;
  setInput: (v: string) => void;
  order: Order;
  setOrder: (v: Order) => void;
  listId: string;
}) {
  const placeholder = kind === "pets" ? text.petSearch : text.peopleSearch;
  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
      <div className="relative min-w-0 flex-1">
        <Search
          className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
          aria-hidden="true"
        />
        <Input
          value={input}
          onChange={(event) => setInput(event.target.value)}
          placeholder={placeholder}
          aria-label={placeholder}
          aria-controls={listId}
          className="pl-9"
        />
      </div>
      <div role="group" aria-label={text.sortLabel} className="inline-flex shrink-0 self-start rounded-lg bg-muted p-0.5">
        {(["newest", "name"] as const).map((value) => (
          <button
            key={value}
            type="button"
            aria-pressed={order === value}
            onClick={() => setOrder(value)}
            className={`rounded-md px-3 py-1 text-xs font-medium transition-colors ${order === value ? "bg-background text-foreground shadow-xs" : "text-muted-foreground hover:text-foreground"}`}
          >
            {value === "newest" ? text.sortNewest : text.sortName}
          </button>
        ))}
      </div>
    </div>
  );
}

function ListFooter({ shown, total, pages }: { shown: number; total: number; pages: ReturnType<typeof useEntityPages> }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
      <span>{fill(text.showing, { shown, total })}</span>
      {pages.hasNextPage ? (
        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={pages.isFetchingNextPage}
          onClick={() => void pages.fetchNextPage()}
        >
          {pages.isFetchingNextPage ? <Spinner size="sm" className="mr-1.5" /> : null}
          {pages.isFetchingNextPage ? text.loadingMore : text.showMore}
        </Button>
      ) : null}
    </div>
  );
}

export function EntityPicker({
  kind,
  single = false,
  max,
  selected,
  onChange,
}: {
  kind: "pets" | "people";
  single?: boolean;
  max: number;
  selected: PickedEntity[];
  onChange: (next: PickedEntity[]) => void;
}) {
  const [input, setInput] = useState("");
  const [order, setOrder] = useState<Order>("newest");
  const term = useDebouncedTerm(input);
  const pages = useEntityPages(kind, term, order);

  const items = pages.data?.pages.flatMap((p) => p.items) ?? [];
  const total = pages.data?.pages[0]?.total ?? 0;
  const chosen = new Set(selected.map((item) => item.id));
  const full = !single && selected.length >= max;

  function toggle(item: PickedEntity) {
    if (chosen.has(item.id)) return onChange(selected.filter((s) => s.id !== item.id));
    if (single) return onChange([item]);
    if (!full) onChange([...selected, item]);
  }

  const listId = `team-picker-${kind}`;

  return (
    <div className="flex min-w-0 flex-col gap-2">
      {selected.length > 0 ? (
        <div className="flex flex-wrap gap-1.5">
          {selected.map((item) => (
            <span
              key={item.id}
              className="inline-flex max-w-full items-center gap-1 rounded-full border border-sky-200 bg-sky-50 py-0.5 pr-1 pl-2.5 text-xs text-sky-900 dark:border-sky-800 dark:bg-sky-950/40 dark:text-sky-200"
            >
              <span className="truncate">{item.label}</span>
              <button
                type="button"
                className="rounded-full p-0.5 hover:bg-sky-100 dark:hover:bg-sky-900"
                aria-label={fill(text.remove, { name: item.label })}
                onClick={() => toggle(item)}
              >
                <X className="size-3" aria-hidden="true" />
              </button>
            </span>
          ))}
        </div>
      ) : null}
      {!single ? (
        <span className="text-xs text-muted-foreground">{fill(text.selected, { count: selected.length })}</span>
      ) : null}

      <Toolbar kind={kind} input={input} setInput={setInput} order={order} setOrder={setOrder} listId={listId} />

      <p className="text-xs font-medium text-muted-foreground">
        {term.length < 2 ? (kind === "pets" ? text.recentPets : text.recentPeople) : fill(text.matchesFor, { term })}
      </p>
      <div id={listId} className="max-h-80 overflow-y-auto rounded-md border" aria-live="polite">
        {pages.isPending ? (
          <p className="flex items-center gap-2 p-3 text-sm text-muted-foreground">
            <Spinner size="sm" />
            {text.searching}
          </p>
        ) : pages.isError ? (
          <InlineError message={pages.error.message} onRetry={() => void pages.refetch()} className="p-3" />
        ) : items.length === 0 ? (
          <p className="p-3 text-sm text-muted-foreground">{text.noResults}</p>
        ) : (
          <ul className="divide-y">
            {items.map((item) => {
              const isChosen = chosen.has(item.id);
              return (
                <li key={item.id}>
                  <button
                    type="button"
                    aria-pressed={isChosen}
                    disabled={!isChosen && full}
                    onClick={() => toggle(item)}
                    className={`flex w-full min-w-0 items-center gap-3 px-3 py-2 text-left text-sm transition-colors disabled:opacity-50 ${isChosen ? "bg-sky-50/70 dark:bg-sky-950/30" : "hover:bg-muted/60"}`}
                  >
                    <span
                      className={`flex size-4 shrink-0 items-center justify-center border ${single ? "rounded-full" : "rounded-sm"} ${isChosen ? "border-primary bg-primary text-primary-foreground" : ""}`}
                    >
                      {isChosen ? <Check className="size-3" aria-hidden="true" /> : null}
                    </span>
                    <EntityAvatar item={item} size="sm" />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-medium">{item.label}</span>
                      {item.meta ? <span className="block truncate text-xs text-muted-foreground">{item.meta}</span> : null}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
      {items.length > 0 ? <ListFooter shown={items.length} total={total} pages={pages} /> : null}
    </div>
  );
}

// "People without a pet" takes no ids — the backend sends to all of them — so this is a read-only preview of who that is.
export function NoPetPeopleList() {
  const [input, setInput] = useState("");
  const [order, setOrder] = useState<Order>("newest");
  const term = useDebouncedTerm(input);
  const pages = useEntityPages("no-pet-people", term, order);
  const items = pages.data?.pages.flatMap((p) => p.items) ?? [];
  const total = pages.data?.pages[0]?.total ?? 0;
  const listId = "team-no-pet-list";

  return (
    <div className="flex min-w-0 flex-col gap-2 rounded-lg border border-amber-200 bg-amber-50/40 p-3 dark:border-amber-900/60 dark:bg-amber-950/20">
      <div>
        <p className="text-sm font-medium">{text.noPetList.title}</p>
        <p className="text-xs text-muted-foreground">{text.noPetList.hint}</p>
      </div>
      <Toolbar kind="no-pet-people" input={input} setInput={setInput} order={order} setOrder={setOrder} listId={listId} />
      <div id={listId} className="max-h-80 overflow-y-auto rounded-md border bg-background" aria-live="polite">
        {pages.isPending ? (
          <p className="flex items-center gap-2 p-3 text-sm text-muted-foreground">
            <Spinner size="sm" />
            {text.searching}
          </p>
        ) : pages.isError ? (
          <InlineError message={pages.error.message} onRetry={() => void pages.refetch()} className="p-3" />
        ) : items.length === 0 ? (
          <p className="p-3 text-sm text-muted-foreground">{term.length >= 2 ? text.noResults : text.noPetList.empty}</p>
        ) : (
          <ul className="divide-y">
            {items.map((item) => (
              <li key={item.id} className="flex min-w-0 items-center gap-3 px-3 py-2 text-sm">
                <EntityAvatar item={item} size="sm" />
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-medium">{item.label}</span>
                  {item.meta ? <span className="block truncate text-xs text-muted-foreground">{item.meta}</span> : null}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
      {items.length > 0 ? <ListFooter shown={items.length} total={total} pages={pages} /> : null}
    </div>
  );
}
