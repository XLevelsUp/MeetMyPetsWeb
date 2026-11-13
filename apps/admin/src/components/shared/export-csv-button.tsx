"use client";

import { Download } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { Spinner } from "@/components/shared/spinner";
import { Button } from "@/components/ui/button";
import { copy } from "@/config/admin";
import { MAX_PAGE_SIZE, queryToSearchParams } from "@/lib/contract-shared";
import { csvFilename, downloadCsv, toCsv, type CsvColumn } from "@/lib/csv";

/** Stops a runaway export; 50 pages of 100 is far past what anyone opens in Excel. */
const MAX_PAGES = 50;

/**
 * Exports what the table is currently showing — every matching row, not just
 * the visible page.
 *
 * The list endpoints cap a page at MAX_PAGE_SIZE, so this walks pages until
 * the total is reached. Sequential on purpose: a parallel fan-out of fifty
 * authenticated requests is a self-inflicted rate limit.
 */
export function ExportCsvButton<TQuery extends object, TRow>({
  endpoint,
  query,
  columns,
  filenamePrefix,
  parse,
}: {
  endpoint: string;
  query: TQuery;
  columns: readonly CsvColumn<TRow>[];
  filenamePrefix: string;
  parse: (json: unknown) => { items: TRow[]; total: number };
}) {
  const [busy, setBusy] = useState(false);

  const run = async () => {
    setBusy(true);
    try {
      const rows: TRow[] = [];
      let page = 1;
      let total = 0;

      do {
        const params = queryToSearchParams({ ...query, page, pageSize: MAX_PAGE_SIZE });
        const res = await fetch(`${endpoint}?${params.toString()}`);
        if (!res.ok) throw new Error(`${copy.common.exportFailed} (${res.status})`);

        const parsed = parse(await res.json());
        rows.push(...parsed.items);
        total = parsed.total;
        page += 1;
      } while (rows.length < total && page <= MAX_PAGES);

      if (rows.length === 0) {
        toast.info(copy.common.exportEmpty);
        return;
      }

      downloadCsv(csvFilename(filenamePrefix), toCsv(rows, columns));
      toast.success(copy.common.exportDone.replace("{count}", String(rows.length)));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : copy.common.exportFailed);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Button variant="outline" onClick={run} disabled={busy} nativeButton className="gap-2">
      {busy ? <Spinner /> : <Download className="size-4" aria-hidden="true" />}
      {busy ? copy.common.exporting : copy.common.exportCsv}
    </Button>
  );
}
