import "server-only";

import { createClient as createSupabaseClient } from "@supabase/supabase-js";

/**
 * Anon-key client for PUBLIC REFERENCE DATA ONLY.
 *
 * `pets.species` and `pets.breeds` are anon-readable by design (the mobile app
 * needs them for dropdowns) while `service_role` has no SELECT on them — the
 * backend granted the service key only the tables the admin panel aggregates.
 * So lookups that turn a `species_id` into "Dog" go through this client.
 *
 * Never use it for anything user-scoped: it carries no session and is subject
 * to RLS as an anonymous caller.
 */
export function createReferenceClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
}

/**
 * True when both the service key and the publishable key are present — every
 * adapter checks this before touching the network so a missing `.env.local`
 * surfaces as a clean `unconfigured` result instead of a crash.
 */
export function isSupabaseConfigured(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
      process.env.SUPABASE_SECRET_KEY &&
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  );
}
