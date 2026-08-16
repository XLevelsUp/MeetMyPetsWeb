/**
 * Chainable fake of the supabase-js query builder for adapter unit tests.
 *
 * The real builder is a thenable: filter methods return `this` and awaiting the
 * chain runs it. This mirrors that shape closely enough to exercise adapter
 * logic without a database.
 *
 * Results are keyed by `schema.table`, optionally narrowed per operation with
 * a `#select` / `#insert` / `#update` suffix — needed when one table is both
 * read and written in a single action (e.g. admin_restrictions).
 *
 * `client.calls` records every operation in order, so tests can assert
 * sequencing (ban → restriction → audit) rather than just end state.
 */

export type TableResult = {
  /** Returned for `select("*", { head: true })` count queries. */
  count?: number;
  /** Returned for ordinary selects and for `.update(...).select(...)`. */
  rows?: unknown[];
  /** Returned for `.maybeSingle()`; `null` means "no row". */
  single?: unknown;
  error?: { message: string };
};

export type MockFilter = { method: string; args: unknown[] };

export type MockCall = {
  op: "select" | "insert" | "update" | "rpc" | "auth.updateUserById";
  key: string;
  values?: unknown;
  /**
   * Filters applied to this call, in order, with their arguments.
   *
   * The builder does not actually filter the fixture rows — it returns whatever
   * is configured for the table. So when an adapter's correctness depends on a
   * filter being present (scoping a uniqueness check to one species, say),
   * assert on this rather than on the returned rows: the rows cannot tell you
   * whether the filter was applied, and a test that reads them would pass just
   * as happily against an adapter that forgot it.
   *
   * Populated by reference — read it after awaiting the call.
   */
  filters?: MockFilter[];
};

const CHAIN_METHODS = [
  "gte",
  "lt",
  "gt",
  "lte",
  "eq",
  "neq",
  "range",
  "order",
  "in",
  "or",
  "ilike",
  "like",
  "is",
  "not",
  "limit",
  "contains",
];

type Resolver = (value: unknown) => unknown;

export type SupabaseMock = ReturnType<typeof makeSupabaseMock>;

export function makeSupabaseMock(
  tables: Record<string, TableResult>,
  rpcs: Record<string, unknown> = {},
) {
  const calls: MockCall[] = [];

  function lookup(key: string, mode: "select" | "insert" | "update"): TableResult {
    return tables[`${key}#${mode}`] ?? tables[key] ?? {};
  }

  function builderFor(key: string) {
    let head = false;
    let mode: "select" | "insert" | "update" = "select";
    /** Shared by reference with whichever call record this chain produces. */
    const filters: MockFilter[] = [];

    const builder: Record<string, unknown> = {};

    const settle = () => {
      const t = lookup(key, mode);
      if (t.error) return { data: null, count: null, error: t.error };
      if (head) return { count: t.count ?? 0, data: null, error: null };
      return { data: t.rows ?? [], count: t.count ?? (t.rows?.length ?? 0), error: null };
    };

    builder.select = (_sel?: string, opts?: { head?: boolean; count?: string }) => {
      if (opts?.head) head = true;
      if (mode === "select") calls.push({ op: "select", key, filters });
      return builder;
    };

    builder.insert = (values: unknown) => {
      mode = "insert";
      calls.push({ op: "insert", key, values, filters });
      return builder;
    };

    builder.update = (values: unknown) => {
      mode = "update";
      calls.push({ op: "update", key, values, filters });
      return builder;
    };

    for (const method of CHAIN_METHODS) {
      builder[method] = (...args: unknown[]) => {
        filters.push({ method, args });
        return builder;
      };
    }

    builder.maybeSingle = () => {
      const t = lookup(key, mode);
      if (t.error) return Promise.resolve({ data: null, error: t.error });
      const single = "single" in t ? t.single : (t.rows?.[0] ?? null);
      return Promise.resolve({ data: single ?? null, error: null });
    };

    builder.then = (onFulfilled: Resolver, onRejected?: Resolver) =>
      Promise.resolve(settle()).then(onFulfilled, onRejected);

    return builder;
  }

  return {
    calls,
    schema: (s: string) => ({ from: (t: string) => builderFor(`${s}.${t}`) }),
    from: (t: string) => builderFor(`public.${t}`),
    rpc: async (name: string) => {
      calls.push({ op: "rpc", key: name });
      return name in rpcs
        ? { data: rpcs[name], error: null }
        : { data: null, error: { message: `rpc ${name} not configured` } };
    },
    auth: {
      admin: {
        updateUserById: async (uid: string, attributes: unknown) => {
          calls.push({ op: "auth.updateUserById", key: uid, values: attributes });
          const failure = tables["auth.admin"]?.error;
          return failure ? { data: null, error: failure } : { data: {}, error: null };
        },
      },
    },
  };
}
