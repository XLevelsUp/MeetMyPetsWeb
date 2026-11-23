"use client";

import { Archive, ArrowLeft, Ban, CircleCheck, Clock, Flag, TriangleAlert, X } from "lucide-react";
import Link from "next/link";
import { useCallback, useState } from "react";
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
import { QuickFilters } from "@/components/users/quick-filters";
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

const quick = copy.users.quick;

export function PetsTable({
  role,
  initialQuery,
  active,
  onBackToUsers,
}: {
  role: AdminRole;
  initialQuery: PetsQuery;
  /** Only the visible tab writes to the URL. */
  active: boolean;
  onBackToUsers?: () => void;
}) {
  const [query, setQuery] = useUrlSyncedQuery(initialQuery, DEFAULT_PETS_QUERY, {
    active,
    // Keeps `?tab=pets` on the URL while this tab owns the query string.
    extraParams: { tab: "pets" },
  });
  const [previewPet, setPreviewPet] = useState<PetSummary | null>(null);

  const pets = usePets(query);
  // The owner's name rides on every pet row, so the chip needs no extra request.
  const ownerName = query.ownerId
    ? (pets.data?.items.find((p) => p.ownerAccountId === query.ownerId)?.ownerName ?? null)
    : null;
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
    Boolean(query.q) ||
    Boolean(query.ownerId);

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

      {query.ownerId ? (
        // Said out loud: a list narrowed to one owner must never look like the whole pet base.
        <div
          role="status"
          className="flex flex-wrap items-center gap-x-3 gap-y-2 rounded-lg border border-trust/30 bg-trust-soft px-3 py-2 text-sm"
        >
          <span className="text-trust-fg">
            {copy.users.ownerFilter.showing}{" "}
            <Link href={`/users/${query.ownerId}`} className="font-semibold underline-offset-4 hover:underline">
              {ownerName || copy.users.ownerFilter.thisUser}
            </Link>
          </span>
          <button
            type="button"
            onClick={() => applyFilters({ ownerId: undefined })}
            className="inline-flex items-center gap-1 rounded-full border border-trust/40 bg-card px-2.5 py-0.5 text-xs font-medium text-trust-fg hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
            aria-label={copy.users.ownerFilter.showAll}
          >
            <X className="size-3" aria-hidden />
            {copy.users.ownerFilter.showAll}
          </button>
          {onBackToUsers ? (
            <button
              type="button"
              onClick={onBackToUsers}
              className="ml-auto inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
            >
              <ArrowLeft className="size-3.5" aria-hidden />
              {copy.users.ownerFilter.back}
            </button>
          ) : null}
        </div>
      ) : null}

      {/* Same chips as the Users tab, mirroring the Status filter plus the trust "needs review" band. */}
      <QuickFilters
        label={quick.label}
        filters={[
          {
            key: "all",
            label: quick.all,
            tone: "neutral",
            active: query.status === "all" && query.trust === "all",
            onSelect: () => applyFilters({ status: "all", trust: "all" }),
          },
          {
            key: "active",
            label: quick.active,
            icon: CircleCheck,
            tone: "approved",
            active: query.status === "active" && query.trust === "all",
            onSelect: () => applyFilters({ status: "active", trust: "all" }),
          },
          {
            key: "needs-review",
            label: quick.needsReview,
            icon: TriangleAlert,
            tone: "waiting",
            active: query.trust === "at_risk" && query.status === "all",
            onSelect: () => applyFilters({ trust: "at_risk", status: "all" }),
          },
          {
            key: "temp-banned",
            label: quick.tempBanned,
            icon: Clock,
            tone: "tempBan",
            active: query.trust === "temporary_banned" && query.status === "all",
            onSelect: () => applyFilters({ trust: "temporary_banned", status: "all" }),
          },
          {
            key: "perm-banned",
            label: quick.permBanned,
            icon: Ban,
            tone: "rejected",
            active: query.trust === "permanently_banned" && query.status === "all",
            onSelect: () => applyFilters({ trust: "permanently_banned", status: "all" }),
          },
          {
            key: "flagged",
            label: quick.flagged,
            icon: Flag,
            tone: "rejected",
            active: query.status === "flagged" && query.trust === "all",
            onSelect: () => applyFilters({ status: "flagged", trust: "all" }),
          },
          {
            key: "archived",
            label: quick.archived,
            icon: Archive,
            tone: "muted",
            active: query.status === "archived" && query.trust === "all",
            onSelect: () => applyFilters({ status: "archived", trust: "all" }),
          },
        ]}
      />

      {pets.isError ? (
        <QueryErrorCard message={pets.error.message} onRetry={() => pets.refetch()} />
      ) : (
        <>
          <FetchingOverlay isFetching={pets.isFetching && !pets.isPending}>
          <div className="rounded-lg border bg-card">
            <Table stackOnMobile className="w-full">
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

              onPageSizeChange={(pageSize) => setQuery((prev) => ({ ...prev, pageSize, page: 1 }))}
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
