"use client";

import { Plus } from "lucide-react";
import { useCallback, useState } from "react";
import { toast } from "sonner";

import { Pagination } from "@/components/shared/pagination";
import { QueryErrorCard } from "@/components/shared/query-error-card";
import { TaxonomyDialog, type TaxonomyDraft } from "@/components/settings/taxonomy-dialog";
import { BreedCountChip, PetCountChip, TaxonomyStatusBadge } from "@/components/settings/settings-format";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { useCreateSpecies, useSpecies, useUpdateSpecies } from "@/hooks/use-taxonomy";
import { DEFAULT_PAGE_SIZE } from "@/lib/contract-shared";
import { speciesResponseSchema, type SpeciesQuery, type SpeciesSummary } from "@/lib/taxonomy-contract";
import { ExportCsvButton } from "@/components/shared/export-csv-button";
import { SPECIES_CSV_COLUMNS } from "@/components/users/csv-columns";

const COLUMN_COUNT = 5;

export function SpeciesTable() {
  const [query, setQuery] = useState<SpeciesQuery>({
    page: 1,
    pageSize: DEFAULT_PAGE_SIZE,
    q: undefined,
    status: "all",
  });
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<SpeciesSummary | null>(null);

  const species = useSpecies(query);
  const create = useCreateSpecies();
  const update = useUpdateSpecies();

  const handleSearch = useCallback((value: string) => {
    setQuery((prev) => ({ ...prev, q: value || undefined, page: 1 }));
  }, []);

  async function handleCreate(draft: TaxonomyDraft) {
    await create.mutateAsync({
      name: draft.name,
      description: draft.description || null,
      reason: draft.reason,
    });
    toast.success(copy.settings.toast.speciesCreated);
  }

  async function handleUpdate(draft: TaxonomyDraft) {
    if (!editing) return;
    await update.mutateAsync({
      id: editing.id,
      name: draft.name,
      description: draft.description || null,
      status: draft.status,
      reason: draft.reason,
    });
    toast.success(copy.settings.toast.speciesUpdated);
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-2">
        <Input
          value={query.q ?? ""}
          onChange={(event) => handleSearch(event.target.value)}
          placeholder={copy.settings.species.searchPlaceholder}
          aria-label={copy.settings.species.searchPlaceholder}
          className="max-w-xs"
        />
        <div className="ml-auto flex flex-wrap gap-2 max-sm:w-full">
          {/* Exports every species matching the current search and status, not just this page. */}
          <ExportCsvButton
            endpoint="/api/v1/admin/taxonomy/species"
            query={query}
            filenamePrefix="species"
            parse={(json) => speciesResponseSchema.parse(json)}
            columns={SPECIES_CSV_COLUMNS}
          />
          <Button onClick={() => setCreating(true)} className="max-sm:w-full">
            <Plus className="mr-1 size-4" aria-hidden="true" />
            {copy.settings.species.add}
          </Button>
        </div>
      </div>

      {species.isError ? (
        <QueryErrorCard message={species.error.message} onRetry={() => species.refetch()} />
      ) : (
        <>
          <div className="overflow-clip rounded-lg border">
            <Table stackOnMobile>
              <TableHeader>
                <TableRow>
                  <TableHead>{copy.settings.species.columns.name}</TableHead>
                  <TableHead>{copy.settings.species.columns.breeds}</TableHead>
                  <TableHead>{copy.settings.species.columns.pets}</TableHead>
                  <TableHead>{copy.settings.species.columns.status}</TableHead>
                  <TableHead className="sr-only">{copy.settings.actions.column}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {species.isPending ? (
                  Array.from({ length: 6 }).map((_, index) => (
                    <TableRow key={index}>
                      {Array.from({ length: COLUMN_COUNT }).map((__, cell) => (
                        <TableCell key={cell}>
                          <Skeleton className="h-5 w-full" />
                        </TableCell>
                      ))}
                    </TableRow>
                  ))
                ) : species.data.items.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={COLUMN_COUNT}
                      className="py-10 text-center text-muted-foreground"
                    >
                      {query.q || query.status !== "all"
                        ? copy.settings.species.emptyFiltered
                        : copy.settings.species.empty}
                    </TableCell>
                  </TableRow>
                ) : (
                  species.data.items.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell>
                        <span className={`block text-sm font-medium ${item.status === "active" ? "" : "text-muted-foreground"}`}>{item.name}</span>
                        {item.description ? (
                          <span className="block text-xs text-muted-foreground">
                            {item.description}
                          </span>
                        ) : null}
                      </TableCell>
                      <TableCell>
                        <BreedCountChip count={item.breedCount} />
                      </TableCell>
                      <TableCell>
                        <PetCountChip count={item.activePetCount} />
                      </TableCell>
                      <TableCell>
                        <TaxonomyStatusBadge status={item.status} />
                      </TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="sm" onClick={() => setEditing(item)}>
                          {copy.settings.actions.edit}
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {species.data ? (
            <Pagination
              page={species.data.page}
              pageSize={species.data.pageSize}
              total={species.data.total}
              onPageChange={(page) => setQuery((prev) => ({ ...prev, page }))}

              onPageSizeChange={(pageSize) => setQuery((prev) => ({ ...prev, pageSize, page: 1 }))}
            />
          ) : null}
        </>
      )}

      <p className="text-xs text-muted-foreground">{copy.settings.noDeleteNote}</p>

      {creating ? (
        <TaxonomyDialog
          open
          onOpenChange={(open) => setCreating(open)}
          title={copy.settings.species.addTitle}
          description={copy.settings.species.addDescription}
          showStatus={false}
          isPending={create.isPending}
          onSubmit={handleCreate}
        />
      ) : null}

      {editing ? (
        // Keyed by id so switching rows resets the form rather than carrying
        // the previous species' values across.
        <TaxonomyDialog
          key={editing.id}
          open
          onOpenChange={(open) => setEditing(open ? editing : null)}
          title={copy.settings.species.editTitle}
          description={copy.settings.species.editDescription}
          initial={{
            name: editing.name,
            description: editing.description ?? "",
            status: editing.status === "inactive" ? "inactive" : "active",
          }}
          showStatus
          isPending={update.isPending}
          onSubmit={handleUpdate}
        />
      ) : null}
    </div>
  );
}
