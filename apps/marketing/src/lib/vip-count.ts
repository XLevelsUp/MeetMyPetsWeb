/**
 * Client-side fetch for the VIP-access counter.
 *
 * Points at apps/admin's one unauthenticated route
 * (`/api/public/vip-count` — see that file's doc comment for why it's safe
 * to expose with no auth: a single COUNT aggregate, never a row, never PII).
 *
 * This module never throws and never fabricates a number: an unset or
 * unreachable endpoint resolves to `null`, and callers must render the
 * static "First 10,000 get VIP access" copy with no live figure in that
 * case — inventing a count would violate the PRE-LAUNCH COPY RULE in
 * config/site.ts just as surely as hardcoding one.
 */

const ENDPOINT = process.env.NEXT_PUBLIC_VIP_COUNT_ENDPOINT;

export type VipCount = {
  claimed: number;
  cap: number;
  /** `cap - claimed`, floored at 0 — never shown as negative if claimed ever exceeds cap. */
  remaining: number;
};

export async function fetchVipCount(): Promise<VipCount | null> {
  if (!ENDPOINT) return null;

  try {
    // Called client-side (this is a static export with no server) — the
    // 60s Cache-Control the endpoint itself sets is what keeps repeat loads
    // from hitting the database every time, handled by the browser's own
    // HTTP cache, not a Next.js fetch-cache option (meaningless here).
    const response = await fetch(ENDPOINT);
    if (!response.ok) return null;

    const body: unknown = await response.json();
    if (
      typeof body !== "object" ||
      body === null ||
      typeof (body as { claimed?: unknown }).claimed !== "number" ||
      typeof (body as { cap?: unknown }).cap !== "number"
    ) {
      return null;
    }

    const { claimed, cap } = body as { claimed: number; cap: number };
    return { claimed, cap, remaining: Math.max(0, cap - claimed) };
  } catch {
    return null;
  }
}
