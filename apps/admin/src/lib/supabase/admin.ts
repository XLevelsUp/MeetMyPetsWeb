// Build-time guard: importing this module from any code reachable by the
// browser fails the build. The secret key bypasses RLS entirely.
import "server-only";

import { createClient as createSupabaseClient } from "@supabase/supabase-js";

/**
 * Service client — SUPABASE_SECRET_KEY, RLS bypassed. Only the analytics
 * adapter and (later) admin mutations may use this. No session handling:
 * this client authenticates as the service, not as the signed-in admin.
 */
export function createAdminClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SECRET_KEY!,
    {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    },
  );
}
