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

/**
 * Every destructive admin action carries one. The minimum length is
 * deliberate: "spam" is not an audit trail a reviewer can act on months later.
 */
export const reasonSchema = z
  .string()
  .trim()
  .min(10, "Give a reason of at least 10 characters — it goes in the audit log.")
  .max(500);
