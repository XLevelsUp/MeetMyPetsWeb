"use client";

import { Plus } from "lucide-react";
import { useCallback, useMemo, useState } from "react";
import { toast } from "sonner";

import { Pagination } from "@/components/shared/pagination";
import { QueryErrorCard } from "@/components/shared/query-error-card";
import { TaxonomyDialog, type TaxonomyDraft } from "@/components/settings/taxonomy-dialog";
import { PetCountChip, TaxonomyStatusBadge } from "@/components/settings/settings-format";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import { useBreeds, useCreateBreed, useSpecies, useUpdateBreed } from "@/hooks/use-taxonomy";
import { DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE } from "@/lib/contract-shared";
import { breedsResponseSchema, type BreedSummary, type BreedsQuery } from "@/lib/taxonomy-contract";
import { ExportCsvButton } from "@/components/shared/export-csv-button";
import { BREED_CSV_COLUMNS } from "@/components/users/csv-columns";

const COLUMN_COUNT = 5;

export function BreedsTable() {
  const [query, setQuery] = useState<BreedsQuery>({
    page: 1,
    pageSize: DEFAULT_PAGE_SIZE,
    q: undefined,
    status: "all",
    speciesId: "all",
  });
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<BreedSummary | null>(null);

  const breeds = useBreeds(query);
  const create = useCreateBreed();
  const update = useUpdateBreed();

  // The species list drives both the filter and the create form's selector.
  // One page is enough: there are six, and the contract caps pageSize anyway.
  const species = useSpecies({
    page: 1,
    pageSize: MAX_PAGE_SIZE,
    q: undefined,
    status: "active",
  });
  const speciesOptions = useMemo(
    () => (species.data?.items ?? []).map((item) => ({ id: item.id, name: item.name })),
    [species.data],
  );

  const handleSearch = useCallback((value: string) => {
    setQuery((prev) => ({ ...prev, q: value || undefined, page: 1 }));
  }, []);

  async function handleCreate(draft: TaxonomyDraft) {
    // Throw rather than return: a bare `return` left the dialog open with the
    // button re-enabled and nothing said, which is indistinguishable from the
    // save having silently failed. TaxonomyDialog catches this into its error
    // line.
    if (!draft.speciesId) throw new Error(copy.settings.form.speciesRequired);
    await create.mutateAsync({
      speciesId: draft.speciesId,
      name: draft.name,
      description: draft.description || null,
      reason: draft.reason,
    });
    toast.success(copy.settings.toast.breedCreated);
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
    toast.success(copy.settings.toast.breedUpdated);
  }

  const isFiltered = Boolean(query.q) || query.status !== "all" || query.speciesId !== "all";

  return (
    <div className="flex flex-col gap-4">
      <div className="filter-row flex flex-wrap items-end gap-3">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="breed-search" className="sr-only">
            {copy.settings.breeds.searchPlaceholder}
          </Label>
          <Input
            id="breed-search"
            value={query.q ?? ""}
            onChange={(event) => handleSearch(event.target.value)}
            placeholder={copy.settings.breeds.searchPlaceholder}
            className="w-64"
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="breed-species">{copy.settings.filters.species}</Label>
          <Select
            value={query.speciesId}
            onValueChange={(value) =>
              setQuery((prev) => ({ ...prev, speciesId: value ?? "all", page: 1 }))
            }
          >
            <SelectTrigger id="breed-species" className="w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{copy.settings.filters.all}</SelectItem>
              {speciesOptions.map((option) => (
                <SelectItem key={option.id} value={option.id}>
                  {option.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="ml-auto flex flex-wrap gap-2 max-sm:w-full">
          {/* Exports every breed matching the current search, status and species, not just this page. */}
          <ExportCsvButton
            endpoint="/api/v1/admin/taxonomy/breeds"
            query={query}
            filenamePrefix="breeds"
            parse={(json) => breedsResponseSchema.parse(json)}
            columns={BREED_CSV_COLUMNS}
          />
          <Button disabled={speciesOptions.length === 0} onClick={() => setCreating(true)} className="max-sm:w-full">
            <Plus className="mr-1 size-4" aria-hidden="true" />
            {copy.settings.breeds.add}
          </Button>
        </div>
      </div>

      {breeds.isError ? (
        <QueryErrorCard message={breeds.error.message} onRetry={() => breeds.refetch()} />
      ) : (
        <>
          <div className="overflow-clip rounded-lg border">
            <Table stackOnMobile>
              <TableHeader>
                <TableRow>
                  <TableHead>{copy.settings.breeds.columns.name}</TableHead>
                  <TableHead>{copy.settings.breeds.columns.species}</TableHead>
                  <TableHead>{copy.settings.breeds.columns.pets}</TableHead>
                  <TableHead>{copy.settings.breeds.columns.status}</TableHead>
                  <TableHead className="sr-only">{copy.settings.actions.column}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {breeds.isPending ? (
                  Array.from({ length: 8 }).map((_, index) => (
                    <TableRow key={index}>
                      {Array.from({ length: COLUMN_COUNT }).map((__, cell) => (
                        <TableCell key={cell}>
                          <Skeleton className="h-5 w-full" />
                        </TableCell>
                      ))}
                    </TableRow>
                  ))
                ) : breeds.data.items.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={COLUMN_COUNT}
                      className="py-10 text-center text-muted-foreground"
                    >
                      {isFiltered ? copy.settings.breeds.emptyFiltered : copy.settings.breeds.empty}
                    </TableCell>
                  </TableRow>
                ) : (
                  breeds.data.items.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell>
                        <span className={`block text-sm font-medium ${item.status === "active" ? "" : "text-muted-foreground"}`}>{item.name}</span>
                        {item.description ? (
                          <span className="block text-xs text-muted-foreground">
                            {item.description}
                          </span>
                        ) : null}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {item.speciesName ?? "—"}
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

          {breeds.data ? (
            <Pagination
              page={breeds.data.page}
              pageSize={breeds.data.pageSize}
              total={breeds.data.total}
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
          title={copy.settings.breeds.addTitle}
          description={copy.settings.breeds.addDescription}
          initial={{
            speciesId: query.speciesId !== "all" ? query.speciesId : speciesOptions[0]?.id,
          }}
          speciesOptions={speciesOptions}
          showStatus={false}
          isPending={create.isPending}
          onSubmit={handleCreate}
        />
      ) : null}

      {editing ? (
        <TaxonomyDialog
          key={editing.id}
          open
          onOpenChange={(open) => setEditing(open ? editing : null)}
          title={copy.settings.breeds.editTitle}
          description={copy.settings.breeds.editDescription}
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
