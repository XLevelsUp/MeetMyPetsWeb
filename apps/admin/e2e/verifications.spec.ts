import { expect, test } from "@playwright/test";

import { STORAGE_STATE } from "./global-setup";

/**
 * RBAC and rendering only.
 *
 * ⚠️ This spec MUST NEVER approve a certificate. Approving writes
 * `status = 'approved'`, which fires the backend's trust trigger and awards
 * +500 to a real pet — verified live. The panel holds no path to reverse it
 * (no UPDATE on pets.pets, and adjust_pet_trust_score grants EXECUTE to
 * nobody), so a test that approved something would permanently corrupt their
 * trust data. Decision logic is covered against the mock in
 * src/lib/verifications.test.ts.
 *
 * Every POST below is deliberately shaped to be rejected by the contract, so
 * it returns 400 before the adapter ever runs.
 */

const VERIFICATIONS_API = "/api/v1/admin/verifications";

/**
 * Verified absent from pet_certificates, pets and pet_reports (2026-08-15).
 * Deliberately NOT the obvious `1111…` pattern — a real seeded pet already
 * holds that id, and pointing write tests at a live row is how an accident
 * happens later.
 */
const ABSENT_ID = "00000000-0000-4000-8000-000000000000";

test.describe("support role", () => {
  test.use({ storageState: STORAGE_STATE.support });

  test("is forbidden from the verifications API", async ({ request }) => {
    const res = await request.get(VERIFICATIONS_API);
    expect(res.status()).toBe(403);
    expect((await res.json()).error).toBe("forbidden");
  });

  test("cannot mint a document URL", async ({ request }) => {
    const res = await request.get(`${VERIFICATIONS_API}/${ABSENT_ID}/document`);
    expect(res.status()).toBe(403);
  });

  test("cannot decide a certificate", async ({ request }) => {
    const res = await request.post(`${VERIFICATIONS_API}/${ABSENT_ID}`, {
      data: { decision: "approve", reason: "Support should never get this far" },
    });
    expect(res.status()).toBe(403);
  });
});

test.describe("moderator role", () => {
  test.use({ storageState: STORAGE_STATE.moderator });

  test("can read the verifications API", async ({ request }) => {
    const res = await request.get(VERIFICATIONS_API);
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(Array.isArray(body.items)).toBe(true);
    expect(typeof body.total).toBe("number");
  });

  test("never exposes the storage path in the list payload", async ({ request }) => {
    const res = await request.get(VERIFICATIONS_API);
    const body = await res.json();
    for (const item of body.items) {
      expect(item).not.toHaveProperty("filePath");
      expect(item).not.toHaveProperty("file_path");
    }
  });

  test("defaults to the pending queue", async ({ request }) => {
    const res = await request.get(VERIFICATIONS_API);
    const body = await res.json();
    for (const item of body.items) expect(item.status).toBe("pending");
  });

  test("renders the queue with its filters", async ({ page }) => {
    await page.goto("/verifications");
    await expect(page.getByRole("heading", { name: "Verifications" })).toBeVisible();
    await expect(page.getByLabel("Status")).toBeVisible();
    await expect(page.getByLabel("Type")).toBeVisible();
  });

  test("degrades a garbage filter to the default view instead of erroring", async ({ request }) => {
    const res = await request.get(
      `${VERIFICATIONS_API}?status=not-a-status&certificateType=nonsense&page=abc`,
    );
    expect(res.status()).toBe(200);
  });

  test("rejects a decision whose reason is too short", async ({ request }) => {
    const res = await request.post(`${VERIFICATIONS_API}/${ABSENT_ID}`, {
      data: { decision: "approve", reason: "ok" },
    });
    // 400 from the contract, before the adapter runs.
    expect(res.status()).toBe(400);
    expect((await res.json()).error).toBe("invalid_body");
  });

  test("rejects a rejection with no structured reason", async ({ request }) => {
    const res = await request.post(`${VERIFICATIONS_API}/${ABSENT_ID}`, {
      data: { decision: "reject", reason: "This scan cannot be read at all" },
    });
    expect(res.status()).toBe(400);
  });
});
