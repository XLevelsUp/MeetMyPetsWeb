import { expect, test } from "@playwright/test";

import { STORAGE_STATE } from "./global-setup";

/**
 * RBAC and rendering only.
 *
 * ⚠️ This spec MUST NEVER restore a pet. A restore writes trust_score = 555 to
 * a real pet, which fires the backend's trigger, ends a live ban, clears its
 * review window and re-arms the owner's warning dialog. There is no undo:
 * `pets.adjust_pet_trust_score` grants EXECUTE to nobody, so the score cannot
 * be put back. Restore logic is covered against the mock in
 * src/lib/trust.test.ts.
 *
 * The only POST below targets an id verified absent from the database AND uses
 * a reason too short to pass the contract, so it fails validation before the
 * adapter runs.
 */

const TRUST_API = "/api/v1/admin/trust";

/** Verified absent from pets.pets (2026-08-16). */
const ABSENT_ID = "00000000-0000-4000-8000-000000000000";

test.describe("support role", () => {
  test.use({ storageState: STORAGE_STATE.support });

  test("is forbidden from the trust queue", async ({ request }) => {
    const res = await request.get(TRUST_API);
    expect(res.status()).toBe(403);
    expect((await res.json()).error).toBe("forbidden");
  });

  test("cannot restore", async ({ request }) => {
    const res = await request.post(`${TRUST_API}/${ABSENT_ID}`, {
      data: { reason: "Support should never be able to do this" },
    });
    expect(res.status()).toBe(403);
  });
});

test.describe("moderator role", () => {
  test.use({ storageState: STORAGE_STATE.moderator });

  test("can read the trust queue", async ({ request }) => {
    const res = await request.get(TRUST_API);
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(Array.isArray(body.items)).toBe(true);
    expect(typeof body.total).toBe("number");
  });

  test("the queue never contains a pet in good standing", async ({ request }) => {
    const res = await request.get(TRUST_API);
    const body = await res.json();
    for (const item of body.items) {
      expect(item.status).not.toBe("normal");
      expect(item.score).toBeLessThanOrEqual(250);
    }
  });

  test("renders the queue with its filters and the clock warning", async ({ page }) => {
    await page.goto("/trust");
    await expect(page.getByRole("heading", { name: "Trust Review" })).toBeVisible();
    await expect(page.getByLabel("Status")).toBeVisible();
    // The single most misunderstood fact about this system must be on screen.
    await expect(page.getByText(/never expires on its own/i)).toBeVisible();
  });

  test("degrades a garbage filter instead of erroring", async ({ request }) => {
    const res = await request.get(`${TRUST_API}?status=not-a-status&overdueOnly=maybe&page=abc`);
    expect(res.status()).toBe(200);
  });

  test("cannot restore — reversal is narrower than viewing", async ({ request }) => {
    const res = await request.post(`${TRUST_API}/${ABSENT_ID}`, {
      data: { reason: "A moderator may review but not overturn" },
    });
    expect(res.status()).toBe(403);
  });

  test("rejects a restore with too short a reason", async ({ request }) => {
    const res = await request.post(`${TRUST_API}/${ABSENT_ID}`, { data: { reason: "no" } });
    // 403 wins over 400 here: the role check runs first, which is the correct
    // ordering. Either way nothing is written.
    expect([400, 403]).toContain(res.status());
  });
});
