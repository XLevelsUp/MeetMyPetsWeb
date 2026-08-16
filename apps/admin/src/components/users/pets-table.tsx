"use client";

import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";

import { Pagination } from "@/components/shared/pagination";
import { QueryErrorCard } from "@/components/shared/query-error-card";
import { SortableHead } from "@/components/shared/sortable-head";
import { TrustCell } from "@/components/trust/trust-cell";
import { ActionDialog } from "@/components/users/action-dialog";
import { ListToolbar } from "@/components/users/list-toolbar";
import { RestrictionBadge } from "@/components/users/restriction-badge";
import { formatDate } from "@/components/users/users-format";
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
import { usePetAction, usePets } from "@/hooks/use-users";
import { canAct, type AdminRole } from "@/lib/roles";
import {
  DEFAULT_PETS_QUERY,
  PET_STATUS_FILTERS,
  type PetSummary,
  type PetsQuery,
} from "@/lib/users-contract";

const PAGE_SIZE = 25;

function PetActions({ pet, role }: { pet: PetSummary; role: AdminRole }) {
  const action = usePetAction(pet.id);
  const isFlagged = pet.restriction?.kind === "flagged";

  // `canAct` reads USER_ACTION_ROLES, which the route enforces independently.
  // This previously compared role strings inline and so ignored the allowlist
  // it was meant to mirror — see roles.test.ts and role-literals.test.ts.
  if (!canAct(role, isFlagged ? "unflag" : "flag")) return null;

  return (
    <ActionDialog
      action={isFlagged ? "unflag" : "flag"}
      isPending={action.isPending}
      onConfirm={async ({ reason }) => {
        await action.mutateAsync({ action: isFlagged ? "unflag" : "flag", reason });
        toast.success(isFlagged ? copy.users.toast.unflag : copy.users.toast.flag);
      }}
    />
  );
}

export function PetsTable({ role }: { role: AdminRole }) {
  const [query, setQuery] = useState<PetsQuery>({
    ...DEFAULT_PETS_QUERY,
    pageSize: PAGE_SIZE,
  });
  const pets = usePets(query);
  // Flag and unflag share an allowlist; a row shows whichever applies, so the
  // column is worth rendering if either is permitted.
  const showActions = canAct(role, "flag") || canAct(role, "unflag");
  /**
   * Pet, Species, Owner, Trust, Status, Added — and Actions only for roles that
   * have one.
   */
  const columnCount = showActions ? 7 : 6;

  // Re-sorting returns to page 1, as on the users tab.
  const sortBy = (sort: PetsQuery["sort"], dir: PetsQuery["dir"]) =>
    setQuery((prev) => ({ ...prev, sort, dir, page: 1 }));

  return (
    <div className="flex flex-col gap-4">
      <ListToolbar
        initialSearch={query.q ?? ""}
        onSearchChange={(q) => setQuery((prev) => ({ ...prev, q: q || undefined, page: 1 }))}
        status={query.status}
        onStatusChange={(status) =>
          setQuery((prev) => ({ ...prev, status: status as PetsQuery["status"], page: 1 }))
        }
        statusOptions={PET_STATUS_FILTERS}
      />

      {pets.isError ? (
        <QueryErrorCard message={pets.error.message} onRetry={() => pets.refetch()} />
      ) : (
        <>
          <div className="overflow-x-auto rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <SortableHead
                    column="name"
                    label={copy.users.columns.pet}
                    activeColumn={query.sort}
                    direction={query.dir}
                    onSort={sortBy}
                  />
                  <TableHead>{copy.users.columns.species}</TableHead>
                  <TableHead>{copy.users.columns.owner}</TableHead>
                  <SortableHead
                    column="trust_score"
                    label={copy.users.columns.trust}
                    activeColumn={query.sort}
                    direction={query.dir}
                    // Lowest first: the pets in trouble are the ones worth seeing.
                    defaultDirection="asc"
                    onSort={sortBy}
                  />
                  <TableHead>{copy.users.columns.status}</TableHead>
                  <SortableHead
                    column="created_at"
                    label={copy.users.columns.added}
                    activeColumn={query.sort}
                    direction={query.dir}
                    defaultDirection="desc"
                    onSort={sortBy}
                  />
                  {showActions ? (
                    <TableHead className="text-right">{copy.users.columns.actions}</TableHead>
                  ) : null}
                </TableRow>
              </TableHeader>
              <TableBody>
                {pets.isPending ? (
                  Array.from({ length: 8 }).map((_, index) => (
                    <TableRow key={index}>
                      {Array.from({ length: columnCount }).map((__, cell) => (
                        <TableCell key={cell}>
                          <Skeleton className="h-5 w-full" />
                        </TableCell>
                      ))}
                    </TableRow>
                  ))
                ) : pets.data.items.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={columnCount}
                      className="py-10 text-center text-muted-foreground"
                    >
                      {copy.users.empty}
                    </TableCell>
                  </TableRow>
                ) : (
                  pets.data.items.map((pet) => (
                    <TableRow key={pet.id}>
                      <TableCell className="font-medium">
                        {pet.name || copy.dashboard.noData}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {pet.species || copy.dashboard.noData}
                        {pet.breed ? (
                          <span className="block text-xs">{pet.breed}</span>
                        ) : null}
                      </TableCell>
                      <TableCell>
                        {pet.ownerAccountId ? (
                          <Link
                            href={`/users/${pet.ownerAccountId}`}
                            className="text-sm underline-offset-4 hover:underline"
                          >
                            {copy.users.detail.profile}
                          </Link>
                        ) : (
                          copy.dashboard.noData
                        )}
                      </TableCell>
                      <TableCell>
                        <TrustCell pet={pet} />
                      </TableCell>
                      <TableCell>
                        <RestrictionBadge restriction={pet.restriction} status={pet.status} />
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {formatDate(pet.createdAt)}
                      </TableCell>
                      {showActions ? (
                        <TableCell className="text-right">
                          <PetActions pet={pet} role={role} />
                        </TableCell>
                      ) : null}
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {pets.data ? (
            <Pagination
              page={pets.data.page}
              pageSize={pets.data.pageSize}
              total={pets.data.total}
              onPageChange={(page) => setQuery((prev) => ({ ...prev, page }))}
            />
          ) : null}
        </>
      )}
    </div>
  );
}
