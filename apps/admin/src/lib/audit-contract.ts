import { z } from "zod";

import { listQuerySchema, paginated } from "@/lib/contract-shared";
import { AUDIT_ACTIONS } from "@/lib/audit-actions";

/**
 * Typed contract for the audit log API.
 *
 * These payloads carry an admin's email and the free-text reason they wrote —
 * internal-facing PII, gated by `requireRole(...AUDIT_ROLES)` and never
 * cached. They do NOT carry the moderated user's details; `targetId` is an
 * opaque id the reader can follow to /users/{id} if their role allows it.
 */

export const AUDIT_TARGET_TYPES = ["account", "pet", "report", "certificate"] as const;

export const auditEntrySchema = z.object({
  id: z.string(),
  createdAt: z.string(),
  actorId: z.string(),
  actorEmail: z.string(),
  actorRole: z.string(),
  action: z.string(),
  targetType: z.string(),
  targetId: z.string(),
  reason: z.string(),
  /** Action-specific context (durations, lifted counts) — shape varies. */
  metadata: z.record(z.string(), z.unknown()),
});
export type AuditEntry = z.infer<typeof auditEntrySchema>;

export const auditResponseSchema = paginated(auditEntrySchema);
export type AuditResponse = z.infer<typeof auditResponseSchema>;

/**
 * Filters. Each `.catch()`-defaults so a hand-edited or stale URL degrades to
 * an unfiltered view rather than 400-ing an admin out of the page.
 */
export const auditQuerySchema = listQuerySchema.extend({
  action: z.enum(["all", ...AUDIT_ACTIONS]).catch("all"),
  targetType: z.enum(["all", ...AUDIT_TARGET_TYPES]).catch("all"),
  /** YYYY-MM-DD, inclusive. Empty string means "unset". */
  from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().catch(undefined),
  to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().catch(undefined),
});
export type AuditQuery = z.infer<typeof auditQuerySchema>;
