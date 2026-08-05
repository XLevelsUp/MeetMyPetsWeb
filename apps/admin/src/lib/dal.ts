import "server-only";

import { cache } from "react";

import { isAdminRole, type AdminRole } from "@/lib/roles";
import { createClient } from "@/lib/supabase/server";

/**
 * Data Access Layer — the AUTHORITATIVE authorization boundary.
 *
 * proxy.ts only does an optimistic JWT check for UX (redirect before paint);
 * every server-side read of "who is this and what may they do" happens here,
 * next to the data access, per the Next 16 auth guidance.
 *
 * House adapter pattern (see apps/landing/src/lib/waitlist.ts): results are
 * discriminated unions, this module never throws.
 *
 * SCHEMA ASSUMPTION (docs/admin/schema-notes.md #1): the role is a single
 * string at `app_metadata.role`. If introspection finds a roles table
 * instead, only this file changes — nothing else reads roles.
 */

export type SessionResult =
  | { ok: true; userId: string; email: string; role: AdminRole }
  | { ok: false; reason: "unauthenticated" | "forbidden"; message: string };

/**
 * Server-verified session + role. `auth.getUser()` round-trips to Supabase —
 * deliberately NOT `getSession()`, which trusts the cookie unverified.
 * React.cache dedupes across layout + page + handlers within one request.
 */
export const verifySession = cache(async (): Promise<SessionResult> => {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();

    if (error || !user) {
      return {
        ok: false,
        reason: "unauthenticated",
        message: "No verified session.",
      };
    }

    const role: unknown = user.app_metadata?.role;
    if (!isAdminRole(role)) {
      // Valid Supabase account, but not an admin — ordinary app users land
      // here if they somehow reach the admin origin with a session.
      return {
        ok: false,
        reason: "forbidden",
        message: "This account has no admin role.",
      };
    }

    return { ok: true, userId: user.id, email: user.email ?? "", role };
  } catch {
    // Network failure talking to Supabase Auth — treat as unauthenticated
    // rather than leaking a 500 from every gated page.
    return {
      ok: false,
      reason: "unauthenticated",
      message: "Could not verify the session.",
    };
  }
});

/**
 * Session + role allowlist in one call. `forbidden` covers both "not an
 * admin at all" and "admin, but the wrong role for this resource".
 */
export async function requireRole(...allowed: AdminRole[]): Promise<SessionResult> {
  const session = await verifySession();
  if (!session.ok) return session;

  if (!allowed.includes(session.role)) {
    return {
      ok: false,
      reason: "forbidden",
      message: `Requires one of: ${allowed.join(", ")}.`,
    };
  }

  return session;
}
