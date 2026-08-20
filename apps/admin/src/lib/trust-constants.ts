/**
 * The trust vocabulary, shared by the report queue and the trust review queue.
 *
 * Client-safe (the adapters are `server-only`, the filters are client
 * components) — the same split as `report-constants.ts`.
 *
 * ⚠️ EVERYTHING HERE IS A COPY. The authority is `pets.get_pet_trust_status()`
 * in the app team's database, which is the only code in their system that
 * compares a trust score to a number. Their design note: *"moving a threshold
 * is a one-line database change with no app release"* — which is true for their
 * app, and precisely why this file will silently disagree the day they move
 * one. `trust-constants.test.ts` pins every boundary; if the SQL changes, that
 * test is what should fail.
 *
 * We duplicate rather than call the function per row because the queue derives
 * a status for every pet on the page, and an RPC each would be N+1.
 */

export const TRUST_STATUSES = [
  "permanently_banned",
  "temporary_banned",
  "warning",
  "normal",
] as const;
export type TrustStatus = (typeof TRUST_STATUSES)[number];

/**
 * The seed score, and the ONLY value that restores a pet.
 *
 * Their `trust_status_on_score_change` trigger branches on
 * `IF NEW.trust_score = 555` — an exact-equality test. Restoring to 554 or 600
 * skips the branch and leaves `temporary_banned_at` / `temporary_ban_until` /
 * `trust_warning_acknowledged` stale, i.e. a pet that reads unbanned but still
 * carries a ban window. There is no partial restoration.
 */
export const TRUST_RESTORE_SCORE = 555;

/**
 * The score a moderator's permanent ban writes.
 *
 * Their band is `<= 0`, so any non-positive value bans — but `0` is the
 * canonical one. A negative would be indistinguishable in effect while looking
 * like an arithmetic accident to anyone reading the row, and their ladder
 * treats `<= 0` as permanent precisely so a deeply negative score can't be
 * mistaken for a temporary ban.
 *
 * ⚠️ Writing this ALSO stamps a 7-day review window on a pet that had none:
 * their `trust_status_on_score_change` trigger sets `temporary_banned_at` /
 * `temporary_ban_until` for anything `< 100` without distinguishing permanent
 * from temporary. The date is meaningless for a permanent ban, so the UI
 * suppresses it. We cannot clear it ourselves — the grant is column-scoped to
 * `trust_score` — and a trigger fix is an open ask with the app team.
 */
export const TRUST_PERMANENT_BAN_SCORE = 0;

/**
 * Thresholds, mirroring `pets.get_pet_trust_status`.
 *
 * Note `<= 0` rather than `= 0`: their migration documents the deviation from
 * the original spec, because a pet at -400 would otherwise fall through to
 * `< 100` and be treated as merely temporarily banned — i.e. more leniently
 * than a pet at 50.
 */
export function trustStatusFor(score: number | null): TrustStatus | null {
  if (score === null) return null;
  if (score <= 0) return "permanently_banned";
  if (score < 100) return "temporary_banned";
  if (score <= 250) return "warning";
  return "normal";
}

/** True for anything a reviewer should see in the queue. */
export function needsReview(status: TrustStatus | null): boolean {
  return status !== null && status !== "normal";
}

/**
 * The upper bound of the "not normal" band, used to filter server-side.
 * `get_pet_trust_status` is not usable as a PostgREST filter, so the queue
 * selects on the raw score and derives the status in TypeScript.
 */
export const TRUST_REVIEW_SCORE_CEILING = 250;

/**
 * The event vocabulary from `pets.trust_score_delta`, for rendering the ledger.
 *
 * Read-only reference: the panel never computes a delta, it displays the one
 * the database recorded. A reason we don't know about still renders (as its raw
 * value with its stored delta) rather than vanishing from the timeline.
 */
export const TRUST_EVENT_DELTAS: Record<string, number> = {
  like: 5,
  super_like: 150,
  follow: 10,
  match: 30,
  block: -80,
  report: -80,
  /**
   * ⚠️ In the DATA (11 rows at -20) but NOT in the live
   * `pets.trust_score_delta`, whose CASE returns NULL for it — which makes
   * `adjust_pet_trust_score` raise, which makes inserting any post-scoped
   * report fail outright. Verified 2026-08-20; reported as a P1 in
   * docs/admin/app-team-handoff.md. Kept here so the existing rows still
   * render with the delta they were written with.
   */
  post_report: -20,
  certificate_verified: 500,
};

/**
 * What a dismissal credits back, by report scope. The sign is flipped from
 * `TRUST_EVENT_DELTAS` at the point of use — these are the penalties, and a
 * revert adds their magnitude.
 */
export function reportPenaltyFor(scope: "profile" | "post"): number {
  return scope === "post" ? -TRUST_EVENT_DELTAS.post_report : -TRUST_EVENT_DELTAS.report;
}

/** The app's ledger reason for a report penalty, by scope. */
export function reportEventReason(scope: "profile" | "post"): string {
  return scope === "post" ? "post_report" : "report";
}
