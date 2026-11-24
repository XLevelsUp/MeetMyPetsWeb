"use client";

import { MoreHorizontal, TriangleAlert } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import { Spinner } from "@/components/shared/spinner";
import { QueryErrorCard } from "@/components/shared/query-error-card";
import { TeamActionDialog, type TeamDialogAction } from "@/components/team-messages/team-action-dialog";
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
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { copy } from "@/config/admin";
import { useHasFailedMessages, useTeamMessageAction, useTeamMessages } from "@/hooks/use-team-messages";
import { useUrlSyncedQuery } from "@/hooks/use-url-query";
import { useSpeciesOptions } from "@/hooks/use-users";
import { isAdminRole, ROLE_LABELS } from "@/lib/roles";
import { TEAM_STATES, type TeamState } from "@/lib/team-messages-constants";
import type { TeamMessage } from "@/lib/team-messages-contract";

const text = copy.teamMessages;
const h = text.history;
const COLUMN_COUNT = 7;
// Scheduled first: it is the only state staff can still change before users see it.
const TAB_ORDER: readonly TeamState[] = ["scheduled", "sent", "failed", "cancelled", "deleted"];
export const HISTORY_DEFAULTS = { state: "sent" as TeamState };

export function TeamHistory({ initialState }: { initialState: TeamState }) {
  const [query, setQuery] = useUrlSyncedQuery({ state: initialState }, HISTORY_DEFAULTS, { active: true });
  const [pending, setPending] = useState<{ message: TeamMessage; action: TeamDialogAction } | null>(null);

  const list = useTeamMessages(query.state);
  const hasFailed = useHasFailedMessages();
  const species = useSpeciesOptions();
  const act = useTeamMessageAction();

  const speciesNames = useMemo(
    () => new Map((species.data?.items ?? []).map((s) => [s.id, s.name] as const)),
    [species.data],
  );
  const items = list.data?.pages.flatMap((page) => page.items) ?? [];

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
          <Button size="sm" variant="outline" onClick={() => setQuery((prev) => ({ ...prev, state: "failed" }))}>
            {h.failedBannerAction}
          </Button>
        </div>
      ) : null}

      <Tabs
        value={query.state}
        onValueChange={(value) => {
          if ((TEAM_STATES as readonly string[]).includes(value as string)) {
            setQuery((prev) => ({ ...prev, state: value as TeamState }));
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

      {list.isError ? (
        <QueryErrorCard message={list.error.message} onRetry={() => list.refetch()} />
      ) : (
        <>
          <div className="overflow-x-auto rounded-lg border">
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
                      {h.empty[query.state]}
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

          {list.hasNextPage ? (
            <Button
              variant="outline"
              className="self-center"
              disabled={list.isFetchingNextPage}
              onClick={() => void list.fetchNextPage()}
            >
              {list.isFetchingNextPage ? <Spinner size="sm" className="mr-1.5" /> : null}
              {list.isFetchingNextPage ? h.loadingMore : h.loadMore}
            </Button>
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
        <p className="line-clamp-3 text-sm break-words whitespace-pre-wrap">{message.body}</p>
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
