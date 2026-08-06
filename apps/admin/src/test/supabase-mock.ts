/**
 * Chainable fake of the supabase-js query builder for adapter unit tests.
 *
 * The real builder is a thenable: every filter method returns `this` and the
 * chain is awaited to run. This fake mirrors that — filter methods are no-ops
 * returning the builder, and awaiting resolves to a result decided per
 * `schema.table`. A `select("*", { head: true })` call (the count pattern)
 * resolves to `{ count }`; any other select resolves to `{ data }`. Per-table
 * `error` forces the `query_failed` branch.
 */

export type TableResult = { count?: number; rows?: unknown[]; error?: { message: string } };

type Client = {
  schema: (s: string) => { from: (t: string) => QueryBuilder };
  from: (t: string) => QueryBuilder;
  rpc: (name: string, args?: unknown) => Promise<{ data: unknown; error: { message: string } | null }>;
};

type QueryBuilder = {
  select: (sel?: string, opts?: { head?: boolean; count?: string }) => QueryBuilder;
  then: <R>(onFulfilled: (v: unknown) => R, onRejected?: (e: unknown) => R) => Promise<R>;
} & Record<string, (...args: unknown[]) => QueryBuilder>;

const CHAIN_METHODS = ["gte", "lt", "eq", "range", "order", "in", "or", "ilike", "is", "not", "limit"];

/**
 * @param tables keyed by `schema.table` (e.g. "identity.accounts", "pets.species")
 * @param rpcs   keyed by rpc name → payload (omit a name to make that rpc error)
 */
export function makeSupabaseMock(
  tables: Record<string, TableResult>,
  rpcs: Record<string, unknown> = {},
): Client {
  function builderFor(key: string): QueryBuilder {
    let head = false;
    const builder = {} as QueryBuilder;

    builder.select = (_sel?: string, opts?: { head?: boolean }) => {
      if (opts?.head) head = true;
      return builder;
    };
    for (const m of CHAIN_METHODS) {
      builder[m] = () => builder;
    }
    builder.then = (onFulfilled, onRejected) => {
      const t = tables[key] ?? {};
      const result = t.error
        ? { data: null, count: null, error: t.error }
        : head
          ? { count: t.count ?? 0, error: null }
          : { data: t.rows ?? [], error: null };
      return Promise.resolve(result).then(onFulfilled, onRejected);
    };
    return builder;
  }

  return {
    schema: (s) => ({ from: (t) => builderFor(`${s}.${t}`) }),
    from: (t) => builderFor(`public.${t}`),
    rpc: async (name) =>
      name in rpcs
        ? { data: rpcs[name], error: null }
        : { data: null, error: { message: `rpc ${name} not configured` } },
  };
}
