import { createBrowserClient } from "@supabase/ssr";

/**
 * Browser Supabase client — publishable key only. RLS is the security
 * boundary behind this key. One instance per module graph is fine;
 * createBrowserClient dedupes internally.
 */
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
  );
}
