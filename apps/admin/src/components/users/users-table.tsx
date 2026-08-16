"use client";

import { ChevronRight } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type MouseEvent } from "react";

import { Pagination } from "@/components/shared/pagination";
import { QueryErrorCard } from "@/components/shared/query-error-card";
import { ListToolbar } from "@/components/users/list-toolbar";
import { RestrictionBadge } from "@/components/users/restriction-badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { copy } from "@/config/admin";
import { useAccounts } from "@/hooks/use-users";
import {
  ACCOUNT_STATUS_FILTERS,
  DEFAULT_ACCOUNTS_QUERY,
  type AccountsQuery,
} from "@/lib/users-contract";

const PAGE_SIZE = 25;

/**
 * Anywhere inside a row that already handles its own activation. A row click
 * must not hijack a link, a button, or a text selection the user is making.
 */
const INTERACTIVE = "a,button,input,select,textarea,[role='menu'],[role='dialog']";

/** User, Contact, Pets, Status, Joined, View — drives the skeleton and colSpan. */
const COLUMN_COUNT = 6;

function formatDate(value: string | null): string {
  if (!value) return copy.dashboard.noData;
  return new Date(value).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function UsersTable() {
  const router = useRouter();
  const [query, setQuery] = useState<AccountsQuery>({
    ...DEFAULT_ACCOUNTS_QUERY,
    pageSize: PAGE_SIZE,
  });
  const accounts = useAccounts(query);

  /**
   * Pointer convenience only — the row is deliberately NOT a tab stop.
   *
   * A focusable `<tr>` beside the two real links in it would be a third tab
   * stop that announces the entire row's text, which is worse for keyboard and
   * screen-reader users than the links they already have. Both of those links
   * go to the same profile, so nothing is unreachable without a mouse.
   * (verifications-queue.tsx does make its rows focusable, but those rows
   * select rather than navigate and contain no link of their own.)
   */
  const openProfile = (event: MouseEvent<HTMLTableRowElement>, id: string) => {
    if ((event.target as HTMLElement).closest(INTERACTIVE)) return;
    if (window.getSelection()?.toString()) return;
    router.push(`/users/${id}`);
  };

  return (
    <div className="flex flex-col gap-4">
      <ListToolbar
        initialSearch={query.q ?? ""}
        onSearchChange={(q) => setQuery((prev) => ({ ...prev, q: q || undefined, page: 1 }))}
        status={query.status}
        onStatusChange={(status) =>
          setQuery((prev) => ({ ...prev, status: status as AccountsQuery["status"], page: 1 }))
        }
        statusOptions={ACCOUNT_STATUS_FILTERS}
      />

      {accounts.isError ? (
        <QueryErrorCard message={accounts.error.message} onRetry={() => accounts.refetch()} />
      ) : (
        <>
          <div className="overflow-x-auto rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{copy.users.columns.user}</TableHead>
                  <TableHead>{copy.users.columns.contact}</TableHead>
                  <TableHead className="text-right">{copy.users.columns.pets}</TableHead>
                  <TableHead>{copy.users.columns.status}</TableHead>
                  <TableHead>{copy.users.columns.joined}</TableHead>
                  <TableHead className="w-0 text-right">
                    <span className="sr-only">{copy.users.columns.actions}</span>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {accounts.isPending ? (
                  Array.from({ length: 8 }).map((_, index) => (
                    <TableRow key={index}>
                      {Array.from({ length: COLUMN_COUNT }).map((__, cell) => (
                        <TableCell key={cell}>
                          <Skeleton className="h-5 w-full" />
                        </TableCell>
                      ))}
                    </TableRow>
                  ))
                ) : accounts.data.items.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={COLUMN_COUNT}
                      className="py-10 text-center text-muted-foreground"
                    >
                      {copy.users.empty}
                    </TableCell>
                  </TableRow>
                ) : (
                  accounts.data.items.map((account) => (
                    <TableRow
                      key={account.id}
                      onClick={(event) => openProfile(event, account.id)}
                      className="cursor-pointer"
                    >
                      <TableCell>
                        <Link
                          href={`/users/${account.id}`}
                          className="font-medium underline-offset-4 hover:underline"
                        >
                          {account.displayName || copy.dashboard.noData}
                        </Link>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        <span className="block">{account.email || copy.dashboard.noData}</span>
                        {account.phone ? (
                          <span className="block text-xs">{account.phone}</span>
                        ) : null}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">{account.petCount}</TableCell>
                      <TableCell>
                        <RestrictionBadge
                          restriction={account.restriction}
                          status={account.status}
                        />
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {formatDate(account.createdAt)}
                      </TableCell>
                      <TableCell className="text-right">
                        <Link
                          href={`/users/${account.id}`}
                          // Named, because "View" repeated down a column tells a
                          // screen-reader user nothing about which row they are on.
                          aria-label={copy.users.view.aria.replace(
                            "{name}",
                            account.displayName || account.email || copy.users.view.unnamed,
                          )}
                          className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                        >
                          {copy.users.view.label}
                          <ChevronRight className="size-4" aria-hidden="true" />
                        </Link>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {accounts.data ? (
            <Pagination
              page={accounts.data.page}
              pageSize={accounts.data.pageSize}
              total={accounts.data.total}
              onPageChange={(page) => setQuery((prev) => ({ ...prev, page }))}
            />
          ) : null}
        </>
      )}
    </div>
  );
}
