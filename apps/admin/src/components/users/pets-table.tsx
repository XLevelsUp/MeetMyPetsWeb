"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

import { Pagination } from "@/components/shared/pagination";
import { QueryErrorCard } from "@/components/shared/query-error-card";
import { ExportCsvButton } from "@/components/shared/export-csv-button";
import { FetchingOverlay } from "@/components/shared/fetching-overlay";
import { SortableHead } from "@/components/shared/sortable-head";
import { PET_CSV_COLUMNS } from "@/components/users/csv-columns";
import { TrustCell } from "@/components/trust/trust-cell";
import { ActionDialog } from "@/components/users/action-dialog";
import { EmptyState } from "@/components/users/list-empty-state";
import { ListToolbar } from "@/components/users/list-toolbar";
import { PetFilters } from "@/components/users/pet-filters";
import { RestrictionBadge } from "@/components/users/restriction-badge";
import { formatDate } from "@/components/users/users-format";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { useUrlSyncedQuery } from "@/hooks/use-url-query";
import { usePetAction, usePets } from "@/hooks/use-users";
import { canAct, type AdminRole } from "@/lib/roles";
import {
  DEFAULT_PETS_QUERY,
  PET_STATUS_FILTERS,
  type PetSummary,
  petsResponseSchema,
  type PetsQuery,
} from "@/lib/users-contract";

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
      triggerClassName={
        isFlagged
          ? "border-yellow-300/80 text-yellow-800 bg-yellow-50 hover:bg-yellow-100 hover:text-yellow-900 dark:border-yellow-700/60 dark:bg-yellow-950/40 dark:text-yellow-300 gap-1.5 font-medium"
          : "border-red-300/80 text-red-800 bg-red-50 hover:bg-red-100 hover:text-red-900 dark:border-red-700/60 dark:bg-red-950/40 dark:text-red-300 gap-1.5 font-medium"
      }
      onConfirm={async ({ reason }) => {
        await action.mutateAsync({ action: isFlagged ? "unflag" : "flag", reason });
        toast.success(isFlagged ? copy.users.toast.unflag : copy.users.toast.flag);
      }}
    />
  );
}

export function PetsTable({
  role,
  initialQuery,
  active,
  externalOwnerSearch,
}: {
  role: AdminRole;
  initialQuery: PetsQuery;
  /** Only the visible tab writes to the URL. */
  active: boolean;
  externalOwnerSearch?: { id: string; timestamp: number } | null;
}) {
  const [query, setQuery] = useUrlSyncedQuery(initialQuery, DEFAULT_PETS_QUERY, {
    active,
    // Keeps `?tab=pets` on the URL while this tab owns the query string.
    extraParams: { tab: "pets" },
  });
  const [previewPet, setPreviewPet] = useState<PetSummary | null>(null);

  useEffect(() => {
    if (externalOwnerSearch?.id) {
      setQuery((prev) => ({ ...prev, q: externalOwnerSearch.id, page: 1 }));
    }
  }, [externalOwnerSearch, setQuery]);
  const pets = usePets(query);
  // Flag and unflag share an allowlist; a row shows whichever applies, so the
  // column is worth rendering if either is permitted.
  const showActions = canAct(role, "flag") || canAct(role, "unflag");
  /**
   * Pet, Species, Owner, Trust, Status, Added — and Actions only for roles that
   * have one.
   */
  const columnCount = showActions ? 10 : 9;

  // Re-sorting and re-filtering return to page 1, as on the users tab.
  const sortBy = (sort: PetsQuery["sort"], dir: PetsQuery["dir"]) =>
    setQuery((prev) => ({ ...prev, sort, dir, page: 1 }));

  const applyFilters = useCallback(
    (next: Partial<PetsQuery>) => setQuery((prev) => ({ ...prev, ...next, page: 1 })),
    [setQuery],
  );

  const hasFilters =
    query.status !== DEFAULT_PETS_QUERY.status ||
    query.speciesId !== DEFAULT_PETS_QUERY.speciesId ||
    query.trust !== DEFAULT_PETS_QUERY.trust ||
    Boolean(query.q);

  const clearFilters = () =>
    setQuery((prev) => ({
      ...DEFAULT_PETS_QUERY,
      pageSize: prev.pageSize,
      sort: prev.sort,
      dir: prev.dir,
    }));

  return (
    <div className="flex flex-col gap-4">
      <ListToolbar
        initialSearch={query.q ?? ""}
        onSearchChange={(q) => setQuery((prev) => ({ ...prev, q: q || undefined, page: 1 }))}
        status={query.status}
        onStatusChange={(status) => applyFilters({ status: status as PetsQuery["status"] })}
        statusOptions={PET_STATUS_FILTERS}
        hasFilters={hasFilters}
        onClear={clearFilters}
      >
        <PetFilters query={query} onChange={applyFilters} />
        <ExportCsvButton
          endpoint="/api/v1/admin/pets"
          query={query}
          filenamePrefix="pets"
          parse={(json) => petsResponseSchema.parse(json)}
          columns={PET_CSV_COLUMNS}
        />
      </ListToolbar>

      {/* Quick Filter Chips for 1-click triage */}
      <div className="flex flex-wrap items-center gap-2 text-xs">
        <span className="font-medium text-muted-foreground">Quick filter:</span>
        <button
          type="button"
          onClick={() => applyFilters({ trust: "all", status: "all" })}
          className={`rounded-full border px-2.5 py-1 font-medium transition-colors ${
            (!query.trust || query.trust === "all") && (!query.status || query.status === "all")
              ? "border-primary bg-primary text-primary-foreground"
              : "border-border bg-muted/40 text-muted-foreground hover:bg-muted"
          }`}
        >
          All
        </button>
        <button
          type="button"
          onClick={() => applyFilters({ trust: "at_risk", status: "all" })}
          className={`rounded-full border px-2.5 py-1 font-medium transition-colors ${
            query.trust === "at_risk"
              ? "border-amber-400 bg-amber-100 text-amber-900 dark:border-amber-700 dark:bg-amber-950/70 dark:text-amber-200"
              : "border-amber-200/70 bg-amber-50/70 text-amber-800 hover:bg-amber-100 dark:border-amber-800/40 dark:bg-amber-950/30 dark:text-amber-300"
          }`}
        >
          ⚠️ Needs Review
        </button>
        <button
          type="button"
          onClick={() => applyFilters({ status: "flagged", trust: "all" })}
          className={`rounded-full border px-2.5 py-1 font-medium transition-colors ${
            query.status === "flagged"
              ? "border-red-400 bg-red-100 text-red-900 dark:border-red-700 dark:bg-red-950/70 dark:text-red-200"
              : "border-red-200/70 bg-red-50/70 text-red-800 hover:bg-red-100 dark:border-red-800/40 dark:bg-red-950/30 dark:text-red-300"
          }`}
        >
          🚩 Flagged
        </button>
        <button
          type="button"
          onClick={() => applyFilters({ status: "active", trust: "all" })}
          className={`rounded-full border px-2.5 py-1 font-medium transition-colors ${
            query.status === "active" && (!query.trust || query.trust === "all")
              ? "border-emerald-400 bg-emerald-100 text-emerald-900 dark:border-emerald-700 dark:bg-emerald-950/70 dark:text-emerald-200"
              : "border-emerald-200/70 bg-emerald-50/70 text-emerald-800 hover:bg-emerald-100 dark:border-emerald-800/40 dark:bg-emerald-950/30 dark:text-emerald-300"
          }`}
        >
          ✓ Active
        </button>
      </div>

      {pets.isError ? (
        <QueryErrorCard message={pets.error.message} onRetry={() => pets.refetch()} />
      ) : (
        <>
          <FetchingOverlay isFetching={pets.isFetching && !pets.isPending}>
          <div className="rounded-lg border bg-card">
            <Table className="w-full">
              <TableHeader>
                <TableRow>
                  <SortableHead
                    column="name"
                    className="w-48 max-w-[12rem]"
                    label={copy.users.columns.pet}
                    activeColumn={query.sort}
                    direction={query.dir}
                    onSort={sortBy}
                  />
                  <TableHead className="w-36 max-w-[10rem]">{copy.users.columns.species}</TableHead>
                  <TableHead className="w-32">{copy.users.columns.owner}</TableHead>
                  {/* One column, three sorts: whichever is active fills the cell. */}
                  <SortableHead
                    column="followers"
                    className="w-24"
                    align="end"
                    label={copy.users.columns.followers}
                    activeColumn={query.sort}
                    direction={query.dir}
                    defaultDirection="desc"
                    onSort={sortBy}
                  />
                  <SortableHead
                    column="likes"
                    className="w-20"
                    align="end"
                    label={copy.users.columns.likes}
                    activeColumn={query.sort}
                    direction={query.dir}
                    defaultDirection="desc"
                    onSort={sortBy}
                  />
                  <SortableHead
                    column="matches"
                    className="w-24"
                    align="end"
                    label={copy.users.columns.matches}
                    activeColumn={query.sort}
                    direction={query.dir}
                    defaultDirection="desc"
                    onSort={sortBy}
                  />
                  <SortableHead
                    column="trust_score"
                    className="w-24"
                    label={copy.users.columns.trust}
                    activeColumn={query.sort}
                    direction={query.dir}
                    defaultDirection="asc"
                    onSort={sortBy}
                  />
                  <TableHead className="w-28 min-w-[7rem]">{copy.users.columns.status}</TableHead>
                  <SortableHead
                    column="created_at"
                    className="w-28"
                    label={copy.users.columns.added}
                    activeColumn={query.sort}
                    direction={query.dir}
                    defaultDirection="desc"
                    onSort={sortBy}
                  />
                  {showActions ? (
                    <TableHead className="w-20 text-right">{copy.users.columns.actions}</TableHead>
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
                    <TableCell colSpan={columnCount} className="py-10 text-center">
                      <EmptyState hasFilters={hasFilters} onClear={clearFilters} />
                    </TableCell>
                  </TableRow>
                ) : (
                  pets.data.items.map((pet) => (
                    <TableRow key={pet.id}>
                      <TableCell className="max-w-[14rem]">
                        <div className="flex items-center gap-2.5 min-w-0">
                          {pet.photoUrl ? (
                            <button
                              type="button"
                              onClick={() => setPreviewPet(pet)}
                              className="group relative size-8 shrink-0 rounded-full focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-1"
                              title={`Click to view ${pet.name || "pet"}'s photo`}
                            >
                              <img
                                src={pet.photoUrl}
                                alt={pet.name || "Pet"}
                                className="size-8 rounded-full object-cover border border-border/60 shrink-0 bg-muted transition-transform group-hover:scale-110"
                                loading="lazy"
                              />
                            </button>
                          ) : (
                            <div className="size-8 rounded-full bg-muted flex items-center justify-center text-xs font-semibold text-muted-foreground shrink-0 border border-border/40">
                              {pet.name ? pet.name.charAt(0).toUpperCase() : "🐾"}
                            </div>
                          )}
                          <span className="font-medium truncate" title={pet.name ?? undefined}>
                            {pet.name || copy.dashboard.noData}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="text-muted-foreground max-w-[10rem] truncate">
                        <span className="block truncate" title={pet.species ?? undefined}>
                          {pet.species || copy.dashboard.noData}
                        </span>
                        {pet.breed ? (
                          <span className="block truncate text-xs" title={pet.breed}>
                            {pet.breed}
                          </span>
                        ) : null}
                      </TableCell>
                      <TableCell className="max-w-[9rem] truncate">
                        {pet.ownerAccountId ? (
                          <Link
                            href={`/users/${pet.ownerAccountId}`}
                            className="text-sm underline-offset-4 hover:underline truncate block"
                            title={pet.ownerName ?? undefined}
                          >
                            {pet.ownerName || copy.users.detail.profile}
                          </Link>
                        ) : (
                          copy.dashboard.noData
                        )}
                      </TableCell>
                      {/* A dash, not 0: the count is only computed for the active sort. */}
                      <TableCell className="text-right font-mono text-sm tabular-nums">
                        {pet.followers ?? "—"}
                      </TableCell>
                      <TableCell className="text-right font-mono text-sm tabular-nums">
                        {pet.likes ?? "—"}
                      </TableCell>
                      <TableCell className="text-right font-mono text-sm tabular-nums">
                        {pet.matches ?? "—"}
                      </TableCell>
                      <TableCell>
                        <TrustCell pet={pet} />
                      </TableCell>
                      <TableCell className="w-28 min-w-[7rem]">
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
          </FetchingOverlay>

          {pets.data ? (
            <Pagination
              page={pets.data.page}
              pageSize={pets.data.pageSize}
              total={pets.data.total}
              onPageChange={(page) => setQuery((prev) => ({ ...prev, page }))}
            />
          ) : null}

          {/* Pet Photo Lightbox Modal */}
          <Dialog open={Boolean(previewPet)} onOpenChange={(open) => !open && setPreviewPet(null)}>
            <DialogContent className="max-w-md sm:max-w-lg overflow-hidden p-6">
              <DialogHeader className="pr-8 min-w-0">
                <DialogTitle className="flex items-center gap-2 min-w-0">
                  <span className="truncate block font-medium" title={previewPet?.name || undefined}>
                    {previewPet?.name || "Pet Photo"}
                  </span>
                  {previewPet?.species ? (
                    <span className="text-xs font-normal text-muted-foreground shrink-0">
                      ({previewPet.species}{previewPet.breed ? ` · ${previewPet.breed}` : ""})
                    </span>
                  ) : null}
                </DialogTitle>
              </DialogHeader>

              {previewPet?.photoUrl ? (
                <div className="relative flex flex-col items-center justify-center overflow-hidden rounded-lg bg-muted/40 p-2 border border-border/40">
                  <img
                    src={previewPet.photoUrl}
                    alt={previewPet.name || "Pet"}
                    className="max-h-[65vh] w-auto max-w-full rounded-md object-contain shadow-sm"
                  />
                  <div className="mt-3 flex w-full items-center justify-between text-xs text-muted-foreground px-1">
                    <div>
                      {previewPet.ownerAccountId ? (
                        <span>
                          Owner:{" "}
                          <Link
                            href={`/users/${previewPet.ownerAccountId}`}
                            className="font-medium text-foreground underline-offset-4 hover:underline"
                            onClick={() => setPreviewPet(null)}
                          >
                            {previewPet.ownerName || "View Owner Profile"}
                          </Link>
                        </span>
                      ) : null}
                    </div>
                    <a
                      href={previewPet.photoUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary font-medium underline-offset-4 hover:underline"
                    >
                      Open original ↗
                    </a>
                  </div>
                </div>
              ) : null}
            </DialogContent>
          </Dialog>
        </>
      )}
    </div>
  );
}
