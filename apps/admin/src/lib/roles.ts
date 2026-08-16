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

/**
 * Read the trust review queue over the app's automated bans.
 *
 * Same value as ANALYTICS_ROLES today, and deliberately a separate constant:
 * "who reviews automated bans" and "who reads the analytics dashboard" are
 * different questions that currently share an answer. Tying them together
 * means a future decision to widen analytics silently widens who can see
 * moderation queues. Restoring or banning is narrower still — that goes
 * through USER_ACTION_ROLES.
 */
export const TRUST_ROLES: readonly AdminRole[] = ["super_admin", "moderator"];

/** Settings and admin-role management. */
export const SETTINGS_ROLES: readonly AdminRole[] = ["super_admin"];

/**
 * Per-action allowlists for the moderation surface. Viewing is separate
 * (USERS_VIEW_ROLES) — support can see who a user is without being able to
 * act on them. Reversal (`restore`) is deliberately narrower than the action
 * it reverses: a moderator can suspend, but only a super_admin can un-ban.
 *
 * The UI hides actions the caller cannot perform; the route enforces this map
 * independently, so a hand-crafted POST is rejected either way.
 */
export const USER_ACTION_ROLES: Record<
  "suspend" | "ban" | "restore" | "flag" | "unflag",
  readonly AdminRole[]
> = {
  suspend: ["super_admin", "moderator"],
  ban: ["super_admin"],
  restore: ["super_admin"],
  flag: ["super_admin", "moderator"],
  unflag: ["super_admin", "moderator"],
};

export type UserAction = keyof typeof USER_ACTION_ROLES;

/**
 * Can this role perform this moderation action?
 *
 * ⚠️ A UX AFFORDANCE, NOT A SECURITY BOUNDARY. The route checks the same map
 * independently (`USER_ACTION_ROLES[action].includes(session.role)`), so a
 * hand-crafted POST is rejected whatever the UI chose to render. Hiding a
 * button only spares someone a 403 they were going to get anyway.
 *
 * Exists so components stop re-deriving it. Three of them used to: two read
 * USER_ACTION_ROLES correctly and one hardcoded `role === "super_admin" ||
 * role === "moderator"`, which silently ignored the allowlist it was meant to
 * mirror. `roles.test.ts` now pins every role×action pair, and a source scan
 * keeps role literals out of `components/`.
 */
export function canAct(role: AdminRole, action: UserAction): boolean {
  return USER_ACTION_ROLES[action].includes(role);
}

/** Human-readable badge labels. */
export const ROLE_LABELS: Record<AdminRole, string> = {
  super_admin: "Super Admin",
  moderator: "Moderator",
  support: "Support",
};
