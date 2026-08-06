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

/**
 * Per-feature role allowlists. Routes spread these into `requireRole(...)`
 * instead of hardcoding role strings, so the access model lives in one place
 * and drift between a feature's page and its API is impossible. Add a new
 * feature's constant here as it ships (see docs/admin/README.md role matrix).
 */

/** Read the analytics dashboard and its API. */
export const ANALYTICS_ROLES: readonly AdminRole[] = ["super_admin", "moderator"];

/** View the Users & Pets moderation surface (PII visible to all admins). */
export const USERS_VIEW_ROLES: readonly AdminRole[] = ["super_admin", "moderator", "support"];

/** Read the audit log viewer. */
export const AUDIT_ROLES: readonly AdminRole[] = ["super_admin", "moderator"];

/** View and act on the content-report queue. */
export const REPORTS_ROLES: readonly AdminRole[] = ["super_admin", "moderator"];

/** View and act on the verification queues. */
export const VERIFICATION_ROLES: readonly AdminRole[] = ["super_admin", "moderator"];

/** Settings and admin-role management. */
export const SETTINGS_ROLES: readonly AdminRole[] = ["super_admin"];

/** Human-readable badge labels. */
export const ROLE_LABELS: Record<AdminRole, string> = {
  super_admin: "Super Admin",
  moderator: "Moderator",
  support: "Support",
};
