"use client";

import Link from "next/link";
import { useState } from "react";

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
import { ACCOUNT_STATUS_FILTERS, type AccountsQuery } from "@/lib/users-contract";

const PAGE_SIZE = 25;

function formatDate(value: string | null): string {
  if (!value) return copy.dashboard.noData;
  return new Date(value).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function UsersTable() {
  const [query, setQuery] = useState<AccountsQuery>({
    page: 1,
    pageSize: PAGE_SIZE,
    q: undefined,
    status: "all",
  });
  const accounts = useAccounts(query);

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
                </TableRow>
              </TableHeader>
              <TableBody>
                {accounts.isPending ? (
                  Array.from({ length: 8 }).map((_, index) => (
                    <TableRow key={index}>
                      {Array.from({ length: 5 }).map((__, cell) => (
                        <TableCell key={cell}>
                          <Skeleton className="h-5 w-full" />
                        </TableCell>
                      ))}
                    </TableRow>
                  ))
                ) : accounts.data.items.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="py-10 text-center text-muted-foreground">
                      {copy.users.empty}
                    </TableCell>
                  </TableRow>
                ) : (
                  accounts.data.items.map((account) => (
                    <TableRow key={account.id}>
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
