/**
 * The canonical list of auditable actions.
 *
 * Deliberately its own module rather than living in `lib/audit.ts`: that file
 * is `server-only`, but the filter dropdown is a client component and needs
 * this list. Keeping one source means the writer and the filter can never
 * drift apart.
 *
 * Dot-namespaced as `<target>.<verb>`. Adding one here requires a matching
 * label in `copy.audit.actionLabels`.
 */
export const AUDIT_ACTIONS = [
  "account.suspend",
  "account.ban",
  "account.restore",
  "pet.flag",
  "pet.unflag",
  "report.review",
  "report.action",
  "report.dismiss",
  "certificate.approve",
  "certificate.reject",
  "species.create",
  "species.update",
  "breed.create",
  "breed.update",
  "trust.restore",
  "trust.ban",
] as const;

export type AuditAction = (typeof AUDIT_ACTIONS)[number];
