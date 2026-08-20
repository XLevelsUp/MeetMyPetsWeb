import { z } from "zod";

/**
 * Shared building blocks for the admin API contracts.
 *
 * `api-contract.ts` stays analytics-only (and aggregates-only); feature
 * contracts import the pagination envelope and list-query base from here so
 * every list endpoint speaks the same shape.
 */

export { apiErrorSchema, type ApiError } from "@/lib/api-contract";

export const MAX_PAGE_SIZE = 100;
export const DEFAULT_PAGE_SIZE = 25;

/** `{ items, page, pageSize, total }` around any item schema. */
export function paginated<T extends z.ZodTypeAny>(itemSchema: T) {
  return z.object({
    items: z.array(itemSchema),
    page: z.number().int().min(1),
    pageSize: z.number().int().min(1),
    /** Total matching rows, not the page length — drives the pager. */
    total: z.number().int().min(0),
  });
}

export type Paginated<T> = {
  items: T[];
  page: number;
  pageSize: number;
  total: number;
};

/**
 * Query params every list endpoint accepts. `.catch()` mirrors
 * `timeseriesDaysSchema` — a garbage query string degrades to the default
 * rather than 400-ing an admin out of a page they can otherwise use.
 */
export const listQuerySchema = z.object({
  page: z.coerce.number().int().min(1).catch(1),
  pageSize: z.coerce.number().int().min(1).max(MAX_PAGE_SIZE).catch(DEFAULT_PAGE_SIZE),
  /** Free-text search; the adapter decides which columns it applies to. */
  q: z.string().trim().max(200).optional().catch(undefined),
});

export type ListQuery = z.infer<typeof listQuerySchema>;

/* -------------------------------------------------------------------------
 * URL round-trip
 *
 * Both directions are derived from a schema's own keys. Route handlers and
 * client hooks used to hand-list the params each cared about, which meant a new
 * filter had to be added in three places — and if one was missed, the filter was
 * silently dropped on the way to the database instead of failing. These walk
 * `shape`, so declaring a field wires it end to end.
 *
 * Lives here rather than in one feature's contract because `/users`, the
 * dashboard range filter, and any list surface that follows all need the same
 * pair.
 * ---------------------------------------------------------------------- */

/** Any object schema whose fields all carry a `.catch()`. */
type QuerySchema = z.ZodObject<z.ZodRawShape>;

/** Reads only the keys the schema declares; everything else is parsed away. */
export function searchParamsToQuery<S extends QuerySchema>(
  schema: S,
  params: URLSearchParams,
): z.infer<S> {
  const input: Record<string, string> = {};
  for (const key of Object.keys(schema.shape)) {
    const value = params.get(key);
    // An empty param means "not set" — `?q=` should not search for "".
    if (value !== null && value !== "") input[key] = value;
  }
  return schema.parse(input) as z.infer<S>;
}

/**
 * The inverse. Pass `defaults` to leave unchanged values out — what the address
 * bar wants (`/users` rather than `/users?dir=desc&trust=all&…`). Omit it for a
 * fetch URL, where being explicit costs nothing.
 */
export function queryToSearchParams(
  query: Record<string, unknown>,
  defaults?: Record<string, unknown>,
): URLSearchParams {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value === undefined || value === null || value === "") continue;
    if (defaults && defaults[key] === value) continue;
    params.set(key, String(value));
  }
  return params;
}

/**
 * Every destructive admin action carries one. The minimum length is
 * deliberate: "spam" is not an audit trail a reviewer can act on months later.
 */
export const reasonSchema = z
  .string()
  .trim()
  .min(10, "Give a reason of at least 10 characters — it goes in the audit log.")
  .max(500);
