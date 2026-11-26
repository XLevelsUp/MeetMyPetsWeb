"use client";

import { MoreHorizontal, Search, TriangleAlert } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";

import { Pagination } from "@/components/shared/pagination";
import { QueryErrorCard } from "@/components/shared/query-error-card";
import { TeamActionDialog, type TeamDialogAction } from "@/components/team-messages/team-action-dialog";
import { LinkifiedText } from "@/components/team-messages/linkified-text";
import {
  AUDIENCE_TONES,
  SYSTEM_TONE,
  TeamStateBadge,
  ToneIcon,
  countOf,
  describeAudience,
  fill,
  isTeamState,
  readPercent,
  splitDateTime,
} from "@/components/team-messages/team-format";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { FilterSelect } from "@/components/users/filter-select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { copy } from "@/config/admin";
import { useHasFailedMessages, useTeamMessageAction, useTeamMessages } from "@/hooks/use-team-messages";
import { useUrlSyncedQuery } from "@/hooks/use-url-query";
import { useSpeciesOptions } from "@/hooks/use-users";
import { isAdminRole, ROLE_LABELS } from "@/lib/roles";
import { dayLabel, HISTORY_PAGE_SIZE, monthRange, SYSTEM_SENDER } from "@/lib/team-history";
import { TEAM_AUDIENCES, TEAM_STATES, type TeamAudience, type TeamState } from "@/lib/team-messages-constants";
import type { TeamMessage } from "@/lib/team-messages-contract";

const text = copy.teamMessages;
const h = text.history;
const COLUMN_COUNT = 7;
// Scheduled first: it is the only state staff can still change before users see it.
const TAB_ORDER: readonly TeamState[] = ["scheduled", "sent", "failed", "cancelled", "deleted"];
const ALL = "all";
// Not "all": the backend already uses "all" for the Everyone audience, and a clash made Everyone unselectable.
const ANY_AUDIENCE = "any";
export const HISTORY_DEFAULTS = {
  state: "sent" as TeamState,
  from: "",
  to: "",
  sender: ALL,
  audience: ANY_AUDIENCE as TeamAudience | typeof ANY_AUDIENCE,
  q: "",
  page: 1,
  pageSize: HISTORY_PAGE_SIZE,
};
export type HistoryUrlState = typeof HISTORY_DEFAULTS;

export function TeamHistory({ initial }: { initial: HistoryUrlState }) {
  const [query, setQuery] = useUrlSyncedQuery<HistoryUrlState>(initial, HISTORY_DEFAULTS, { active: true });
  const [pending, setPending] = useState<{ message: TeamMessage; action: TeamDialogAction } | null>(null);

  // The box owns what's typed; the search runs once typing pauses, not on every key.
  const [search, setSearch] = useState(initial.q);
  const committed = useRef(initial.q);
  useEffect(() => {
    if (search.trim() === committed.current) return;
    const timer = setTimeout(() => {
      committed.current = search.trim();
      setQuery((prev) => ({ ...prev, q: search.trim(), page: 1 }));
    }, 300);
    return () => clearTimeout(timer);
  }, [search, setQuery]);

  const list = useTeamMessages({
    state: query.state,
    from: query.from || undefined,
    to: query.to || undefined,
    sender: query.sender === ALL ? undefined : query.sender,
    audience: query.audience === ANY_AUDIENCE ? undefined : query.audience,
    q: query.q || undefined,
    page: query.page,
    pageSize: query.pageSize,
  });

  // A sender picked on another tab stays listed (with no count) so the dropdown never shows a blank value.
  const senders = useMemo(() => {
    const options = list.data?.senders ?? [];
    return query.sender !== ALL && !options.some((s) => s.value === query.sender)
      ? [{ value: query.sender, email: query.sender === SYSTEM_SENDER ? null : query.sender, role: null, count: 0 }, ...options]
      : options;
  }, [list.data?.senders, query.sender]);

  const anyFilter = query.from !== "" || query.to !== "" || query.sender !== ALL || query.audience !== ANY_AUDIENCE || query.q !== "";
  function clearFilters() {
    setSearch("");
    committed.current = "";
    setQuery((prev) => ({ ...prev, from: "", to: "", sender: ALL, audience: ANY_AUDIENCE, q: "", page: 1 }));
  }
  function setRange(offset: number) {
    setQuery((prev) => ({ ...prev, ...monthRange(offset), page: 1 }));
  }
  const isRange = (offset: number) => {
    const r = monthRange(offset);
    return query.from === r.from && query.to === r.to;
  };
  const hasFailed = useHasFailedMessages();
  const species = useSpeciesOptions();
  const act = useTeamMessageAction();

  const speciesNames = useMemo(
    () => new Map((species.data?.items ?? []).map((s) => [s.id, s.name] as const)),
    [species.data],
  );
  const items = list.data?.items ?? [];
  const onlyDates = query.from !== "" && query.to !== "" && query.sender === ALL && query.audience === ANY_AUDIENCE && query.q === "";

  async function confirm(input: { body?: string; sendAt?: string; reason: string }) {
    if (!pending) return;
    const { message, action } = pending;
    const result =
      action === "edit"
        ? await act.mutateAsync({ id: message.id, action: "edit", body: input.body, sendAt: input.sendAt, reason: input.reason })
        : await act.mutateAsync({ id: message.id, action: "delete", reason: input.reason });
    const done = text.actions.toast;
    toast.success(action === "edit" ? done.edited : result.state === "cancelled" ? done.cancelled : done.deleted);
  }

  return (
    <div className="flex min-w-0 flex-col gap-4">
      {hasFailed.data && query.state !== "failed" ? (
        <div
          role="alert"
          className="flex flex-wrap items-center gap-3 rounded-lg border border-red-300/80 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-700/60 dark:bg-red-950/40 dark:text-red-300"
        >
          <TriangleAlert className="size-4 shrink-0" aria-hidden="true" />
          <span className="flex-1">{h.failedBanner}</span>
          <Button size="sm" variant="outline" onClick={() => setQuery((prev) => ({ ...prev, state: "failed", page: 1 }))}>
            {h.failedBannerAction}
          </Button>
        </div>
      ) : null}

      <div className="flex flex-col gap-3">
        <Tabs
          value={query.state}
          onValueChange={(value) => {
            if ((TEAM_STATES as readonly string[]).includes(value as string)) {
              // Dates and the other filters carry over between tabs.
              setQuery((prev) => ({ ...prev, state: value as TeamState, page: 1 }));
            }
          }}
        >
          {/* Wraps rather than scrolls on phones, so no tab hides off-screen. */}
          <TabsList aria-label={h.tabsLabel} className="flex-wrap justify-start group-data-horizontal/tabs:h-auto">
            {TAB_ORDER.map((state) => (
              <TabsTrigger key={state} value={state} className="h-7 flex-none px-3">
                {text.states[state]}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
        <div className="filter-row flex flex-wrap items-end gap-3">
          {/* Native date inputs: a calendar in every browser, keyboard and screen readers for free (as on Audit Logs). */}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="team-history-from">{h.fromLabel}</Label>
            <Input
              id="team-history-from"
              type="date"
              className="w-40"
              value={query.from}
              max={query.to || undefined}
              onChange={(event) => setQuery((prev) => ({ ...prev, from: event.target.value, page: 1 }))}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="team-history-to">{h.toLabel}</Label>
            <Input
              id="team-history-to"
              type="date"
              className="w-40"
              value={query.to}
              min={query.from || undefined}
              onChange={(event) => setQuery((prev) => ({ ...prev, to: event.target.value, page: 1 }))}
            />
          </div>
          <FilterSelect
            id="team-history-sender"
            label={h.senderLabel}
            value={query.sender}
            className="w-64"
            options={[
              { value: ALL, label: h.allSenders },
              ...senders.map((s) => {
                const who = s.value === SYSTEM_SENDER ? h.systemSender : (s.email ?? s.value);
                return { value: s.value, label: s.count > 0 ? fill(h.senderOption, { who, count: s.count }) : who };
              }),
            ]}
            onChange={(sender) => setQuery((prev) => ({ ...prev, sender, page: 1 }))}
          />
          <FilterSelect
            id="team-history-audience"
            label={h.audienceLabel}
            value={query.audience}
            className="w-52"
            options={[
              { value: ANY_AUDIENCE, label: h.allAudiences },
              ...TEAM_AUDIENCES.map((a) => ({ value: a, label: text.audiences[a] })),
            ]}
            onChange={(audience) => setQuery((prev) => ({ ...prev, audience, page: 1 }))}
          />
          <div className="flex min-w-56 flex-1 flex-col gap-1.5" data-filter-wide>
            <Label htmlFor="team-history-search">{h.searchLabel}</Label>
            <div className="relative">
              <Search
                className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
                aria-hidden="true"
              />
              <Input
                id="team-history-search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder={h.searchPlaceholder}
                className="pl-9"
              />
            </div>
          </div>
          {anyFilter ? (
            <Button variant="ghost" size="sm" onClick={clearFilters}>
              {h.clearFilters}
            </Button>
          ) : null}
        </div>
        <div role="group" aria-label={h.quickRangesLabel} className="flex flex-wrap gap-1.5">
          {([
            [-1, h.quickRanges.lastMonth],
            [0, h.quickRanges.thisMonth],
            [1, h.quickRanges.nextMonth],
          ] as const).map(([offset, label]) => (
            <Button
              key={offset}
              type="button"
              size="sm"
              variant={isRange(offset) ? "default" : "outline"}
              aria-pressed={isRange(offset)}
              className="h-7"
              onClick={() => setRange(offset)}
            >
              {label}
            </Button>
          ))}
        </div>
      </div>

      {list.data?.truncated ? <p className="text-xs text-muted-foreground">{h.truncated}</p> : null}

      {list.isError ? (
        <QueryErrorCard message={list.error.message} onRetry={() => list.refetch()} />
      ) : (
        <>
          <div
            className={`overflow-clip rounded-lg border transition-opacity ${list.isPlaceholderData ? "opacity-60" : ""}`}
            aria-busy={list.isFetching}
          >
            <Table stackOnMobile>
              <TableHeader>
                <TableRow>
                  <TableHead className="min-w-56">{h.columns.message}</TableHead>
                  <TableHead>{h.columns.state}</TableHead>
                  <TableHead className="min-w-40">{h.columns.audience}</TableHead>
                  <TableHead>{h.columns.reach}</TableHead>
                  <TableHead>{h.columns.sentBy}</TableHead>
                  <TableHead>{h.columns.when}</TableHead>
                  <TableHead className="text-right">
                    <span className="sr-only">{h.columns.actions}</span>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {list.isPending ? (
                  Array.from({ length: 5 }).map((_, index) => (
                    <TableRow key={index}>
                      {Array.from({ length: COLUMN_COUNT }).map((__, cell) => (
                        <TableCell key={cell}>
                          <Skeleton className="h-5 w-full" />
                        </TableCell>
                      ))}
                    </TableRow>
                  ))
                ) : items.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={COLUMN_COUNT} className="py-10 text-center text-muted-foreground">
                      {onlyDates
                        ? fill(h.emptyRange, { from: dayLabel(query.from), to: dayLabel(query.to) })
                        : anyFilter
                          ? h.emptyFiltered
                          : h.empty[query.state]}
                    </TableCell>
                  </TableRow>
                ) : (
                  items.map((message) => (
                    <MessageRow
                      key={message.id}
                      message={message}
                      speciesNames={speciesNames}
                      onAction={(action) => setPending({ message, action })}
                    />
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {list.data && list.data.total > 0 ? (
            <Pagination
              page={list.data.page}
              pageSize={list.data.pageSize}
              total={list.data.total}
              onPageChange={(page) => setQuery((prev) => ({ ...prev, page }))}
              onPageSizeChange={(pageSize) => setQuery((prev) => ({ ...prev, pageSize, page: 1 }))}
            />
          ) : null}
        </>
      )}

      {pending ? (
        <TeamActionDialog
          key={`${pending.message.id}-${pending.action}`}
          message={pending.message}
          action={pending.action}
          isPending={act.isPending}
          onConfirm={confirm}
          onOpenChange={(open) => (open ? null : setPending(null))}
        />
      ) : null}
    </div>
  );
}

function When({ message }: { message: TeamMessage }) {
  const state: TeamState = isTeamState(message.state) ? message.state : "sent";
  const iso =
    state === "scheduled" || state === "failed"
      ? message.sendAt
      : state === "deleted"
        ? message.deletedAt
        : state === "cancelled"
          ? message.createdAt
          : (message.sentAt ?? message.createdAt);
  const parts = splitDateTime(iso);
  return (
    <>
      <span className="block text-xs">{h.when[state]}</span>
      <span className="block text-foreground">{parts?.date ?? "—"}</span>
      {parts ? <span className="block text-xs">{parts.time}</span> : null}
    </>
  );
}

function MessageRow({
  message,
  speciesNames,
  onAction,
}: {
  message: TeamMessage;
  speciesNames: Map<string, string>;
  onAction: (action: TeamDialogAction) => void;
}) {
  const audience = describeAudience(message, speciesNames);
  const role = message.createdByRole;
  const hasActions = message.canEdit || message.canDelete;

  return (
    <TableRow>
      <TableCell className="max-w-md align-top">
        <p className="line-clamp-3 text-sm break-words whitespace-pre-wrap">
          <LinkifiedText text={message.body} />
        </p>
        {message.editedAt ? <span className="text-xs text-muted-foreground italic">{h.edited}</span> : null}
      </TableCell>
      <TableCell className="align-top">
        <TeamStateBadge state={message.state} />
        {message.state === "failed" && message.failedReason ? (
          <p className="mt-1 max-w-56 text-xs text-destructive">{fill(h.failedReason, { reason: message.failedReason })}</p>
        ) : null}
      </TableCell>
      <TableCell className="align-top text-sm">
        <span className="flex min-w-0 items-start gap-2">
          <ToneIcon tone={message.audience ? AUDIENCE_TONES[message.audience] : SYSTEM_TONE} size="sm" />
          <span className="min-w-0">
            <span className="block font-medium">{audience.label}</span>
            {audience.detail ? (
              <span className="block max-w-56 truncate text-xs text-muted-foreground" title={audience.detail}>
                {audience.detail}
              </span>
            ) : null}
          </span>
        </span>
      </TableCell>
      <TableCell className="align-top text-sm whitespace-nowrap">
        {message.state === "scheduled" ? (
          <span className="text-xs text-muted-foreground">{h.estimate}</span>
        ) : (
          <>
            <span className="block">
              {fill(h.reach, { pets: countOf(message.pets, "pet"), accounts: countOf(message.accounts, "person") })}
            </span>
            <span className="block text-xs text-muted-foreground">
              {fill(h.read, { read: message.readCount, percent: readPercent(message) })}
            </span>
          </>
        )}
      </TableCell>
      <TableCell className="align-top text-sm">
        <span className="block max-w-40 truncate" title={message.createdByEmail ?? undefined}>
          {message.createdByEmail ?? h.system}
        </span>
        {role ? (
          <span className="block text-xs text-muted-foreground">{isAdminRole(role) ? ROLE_LABELS[role] : role}</span>
        ) : null}
      </TableCell>
      <TableCell className="align-top text-sm whitespace-nowrap text-muted-foreground">
        <When message={message} />
      </TableCell>
      <TableCell className="text-right align-top">
        {hasActions ? (
          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <Button variant="ghost" size="icon" aria-label={h.rowMenu}>
                  <MoreHorizontal className="size-4" aria-hidden="true" />
                </Button>
              }
            />
            <DropdownMenuContent align="end" className="min-w-44">
              <DropdownMenuGroup>
                {message.canEdit ? (
                  <DropdownMenuItem onClick={() => onAction("edit")}>{h.edit}</DropdownMenuItem>
                ) : null}
                {message.canDelete ? (
                  <DropdownMenuItem variant="destructive" onClick={() => onAction("delete")}>
                    {message.state === "sent" ? h.delete : h.cancel}
                  </DropdownMenuItem>
                ) : null}
              </DropdownMenuGroup>
            </DropdownMenuContent>
          </DropdownMenu>
        ) : null}
      </TableCell>
    </TableRow>
  );
}
