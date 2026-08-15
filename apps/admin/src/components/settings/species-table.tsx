"use client";

import { Plus } from "lucide-react";
import { useCallback, useState } from "react";
import { toast } from "sonner";

import { Pagination } from "@/components/shared/pagination";
import { QueryErrorCard } from "@/components/shared/query-error-card";
import { TaxonomyDialog, type TaxonomyDraft } from "@/components/settings/taxonomy-dialog";
import { Badge } from "@/components/ui/badge";
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
import type { SpeciesQuery, SpeciesSummary } from "@/lib/taxonomy-contract";

const COLUMN_COUNT = 5;

function statusLabel(status: string): string {
  const labels = copy.settings.statusLabels as Record<string, string>;
  return labels[status] ?? status;
}

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
        <Button className="ml-auto" onClick={() => setCreating(true)}>
          <Plus className="mr-1 size-4" aria-hidden="true" />
          {copy.settings.species.add}
        </Button>
      </div>

      {species.isError ? (
        <QueryErrorCard message={species.error.message} onRetry={() => species.refetch()} />
      ) : (
        <>
          <div className="overflow-x-auto rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{copy.settings.species.columns.name}</TableHead>
                  <TableHead>{copy.settings.species.columns.breeds}</TableHead>
                  <TableHead>{copy.settings.species.columns.pets}</TableHead>
                  <TableHead>{copy.settings.species.columns.status}</TableHead>
                  <TableHead className="sr-only">Actions</TableHead>
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
                        <span className="block text-sm font-medium">{item.name}</span>
                        {item.description ? (
                          <span className="block text-xs text-muted-foreground">
                            {item.description}
                          </span>
                        ) : null}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {item.breedCount}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {item.activePetCount}
                      </TableCell>
                      <TableCell>
                        <Badge variant={item.status === "active" ? "secondary" : "outline"}>
                          {statusLabel(item.status)}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="sm" onClick={() => setEditing(item)}>
                          Edit
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
