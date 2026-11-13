/**
 * CSV writer for the admin tables' export buttons.
 *
 * Deliberately hand-rolled: a dependency for comma-joining rows is not worth
 * the supply chain, and the two things that actually matter — quoting and
 * formula injection — are a few lines each.
 */

/** Characters Excel and Sheets treat as the start of a formula. */
const FORMULA_PREFIX = /^[=+\-@\t\r]/;

/**
 * One field, escaped.
 *
 * A leading `=`, `+`, `-` or `@` makes a spreadsheet evaluate the cell, so a
 * display name of `=HYPERLINK(...)` would run on open. Prefixing a tab
 * neutralises it while still reading as the original text.
 */
function escapeCell(value: unknown): string {
  if (value === null || value === undefined) return "";
  let text = String(value);
  if (FORMULA_PREFIX.test(text)) text = `'${text}`;
  if (/[",\r\n]/.test(text)) text = `"${text.replace(/"/g, '""')}"`;
  return text;
}

export type CsvColumn<T> = { header: string; value: (row: T) => unknown };

/** Rows plus a header line. CRLF, which is what the CSV spec and Excel expect. */
export function toCsv<T>(rows: readonly T[], columns: readonly CsvColumn<T>[]): string {
  const head = columns.map((column) => escapeCell(column.header)).join(",");
  const body = rows.map((row) =>
    columns.map((column) => escapeCell(column.value(row))).join(","),
  );
  return [head, ...body].join("\r\n");
}

/**
 * Hands the browser a file.
 *
 * The BOM is required: without it Excel reads UTF-8 as the system codepage and
 * mangles every non-ASCII name.
 */
export function downloadCsv(filename: string, csv: string): void {
  const blob = new Blob([`﻿${csv}`], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

/** `users-2026-11-13.csv` — sortable in a folder, unambiguous in an email. */
export function csvFilename(prefix: string): string {
  return `${prefix}-${new Date().toISOString().slice(0, 10)}.csv`;
}
