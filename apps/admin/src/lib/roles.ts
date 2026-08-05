/**
 * Admin role model. Roles live in Supabase `app_metadata` (set server-side
 * via the Auth admin API) — NEVER `user_metadata`, which end users can edit
 * themselves and is therefore worthless for authorization.
 */

export const ADMIN_ROLES = ["super_admin", "moderator", "support"] as const;

export type AdminRole = (typeof ADMIN_ROLES)[number];

export function isAdminRole(value: unknown): value is AdminRole {
  return typeof value === "string" && (ADMIN_ROLES as readonly string[]).includes(value);
}

/** Roles allowed to read the analytics dashboard and its API. */
export const ANALYTICS_ROLES: readonly AdminRole[] = ["super_admin", "moderator"];

/** Human-readable badge labels. */
export const ROLE_LABELS: Record<AdminRole, string> = {
  super_admin: "Super Admin",
  moderator: "Moderator",
  support: "Support",
};
