import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import { isSupabaseConfigured } from "@/lib/supabase/reference";

/**
 * Backs the ONE unauthenticated route in this app: GET /api/public/vip-count
 * (see that route file, and the proxy.ts exemption for /api/public).
 *
 * Deliberately kept OUT of analytics.ts: that adapter's whole surface is
 * role-gated (requireRole() in every route that calls it), and this file's
 * job is the opposite — expose the smallest possible fact to literally
 * anyone, including a signed-out marketing-site visitor. Mixing the two
 * would make it too easy for a future analytics query to get copy-pasted
 * into a public response.
 *
 * SCHEMA: `identity.accounts` — same table analytics.ts's `totalUsers`
 * metric reads (see docs/admin/schema-notes.md). The service key has full
 * CRUD grants on all of `identity`, but this file selects nothing except a
 * `head: true` exact count: no row, no column, no PII ever leaves this
 * function. That is what makes it safe to serve with no auth at all, on the
 * same production database that currently has RLS disabled and an open P0
 * on that schema (see schema-notes.md "Security findings" #1) — a row-level
 * read would inherit that exposure, a count does not.
 */
export type PublicStatsResult<T> =
  | { ok: true; data: T }
  | { ok: false; reason: "unconfigured" | "query_failed"; message: string };

export type VipCountPayload = {
  /** Total registered accounts right now (identity.accounts row count). */
  claimed: number;
  /** The promised cap — see vipOffer in the marketing site's config/site.ts. */
  cap: number;
};

const VIP_CAP = 10_000;

export async function fetchVipCount(): Promise<PublicStatsResult<VipCountPayload>> {
  if (!isSupabaseConfigured()) {
    return { ok: false, reason: "unconfigured", message: "Supabase env vars are not set." };
  }

  try {
    const supabase = createAdminClient();
    // head: true — no rows transferred, only the exact count header.
    const { count, error } = await supabase
      .schema("identity")
      .from("accounts")
      .select("*", { count: "exact", head: true });

    if (error) throw new Error(`identity.accounts: ${error.message}`);

    return { ok: true, data: { claimed: count ?? 0, cap: VIP_CAP } };
  } catch (error) {
    return {
      ok: false,
      reason: "query_failed",
      message: error instanceof Error ? error.message : "Unknown query failure.",
    };
  }
}
