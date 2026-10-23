/**
 * Client-side fetch for the VIP-access counter.
 *
 * Points at apps/admin's one unauthenticated route
 * (`/api/public/vip-count` — see that file's doc comment for why it's safe
 * to expose with no auth: a single COUNT aggregate, never a row, never PII).
 *
 * This module never throws and never fabricates a number: an unset or
 * unreachable endpoint resolves to `null`, and callers must render the
 * static "First 1,000 get VIP access" copy with no live figure in that
 * case — inventing a count would violate the PRE-LAUNCH COPY RULE in
 * config/site.ts just as surely as hardcoding one.
 */

import { vipOffer } from "@/config/site";

const ENDPOINT = process.env.NEXT_PUBLIC_VIP_COUNT_ENDPOINT;

export type VipCount = {
  claimed: number;
  cap: number;
  /** `cap - claimed`, floored at 0 — never shown as negative if claimed ever exceeds cap. */
  remaining: number;
};

// Where the copy flips from momentum to scarcity, as a fraction of the cap.
const SCARCITY_AT = 0.85;
const MOMENTUM_BELOW = 0.4;

/**
 * The badge sentence for a given count.
 *
 * Both numbers are true at every size, but each one only persuades in part of
 * the range: "930 spots left" advertises an empty room at 70 claimed, and "70
 * already in" is no longer the point at 950. So the lead swaps as the count
 * grows, and the weak half is dropped rather than contradicting the strong one.
 *
 * Pure and total — same input, same string, no fabrication. A count the
 * endpoint never returned is the caller's problem (it renders `vipOffer.badge`
 * instead), not something for this function to invent.
 */
export function vipBadgeText({ claimed, cap, remaining }: VipCount): string {
  const n = (value: number) => value.toLocaleString();
  const pets = (value: number) => `${n(value)} ${value === 1 ? "pet" : "pets"}`;
  const spots = (value: number) => `${n(value)} VIP ${value === 1 ? "spot" : "spots"}`;

  // Full. Scarcity framing would promise spots that no longer exist.
  if (remaining <= 0) return `All ${spots(cap)} claimed`;

  // Nothing to be proud of yet, and no scarcity either — fall back to the offer.
  if (claimed <= 0) return vipOffer.badge;

  const filled = cap > 0 ? claimed / cap : 0;

  // Nearly full: the number left is the whole story.
  if (filled >= SCARCITY_AT) return `Only ${spots(remaining)} left`;

  // Early: lead with who is already here and say nothing about the empty rest.
  if (filled < MOMENTUM_BELOW) return `${pets(claimed)} already in — VIP access is live`;

  // Mid-range: both halves are substantial, so both earn their place.
  return `${pets(claimed)} in — ${spots(remaining)} left`;
}

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
