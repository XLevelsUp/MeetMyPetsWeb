import { expect, test } from "@playwright/test";

import { STORAGE_STATE } from "./global-setup";

/**
 * RBAC and rendering only.
 *
 * This spec deliberately seeds NO audit rows: the table is append-only by
 * grant (service_role has INSERT+SELECT, no DELETE), so a test could not
 * clean up after itself, and padding a real audit trail with fixtures is the
 * wrong tradeoff. Content mapping is covered in src/lib/audit.test.ts, and
 * moderation.spec.ts produces a genuine row through the real action path.
 */

const AUDIT_API = "/api/v1/admin/audit";

test.describe("support role", () => {
  test.use({ storageState: STORAGE_STATE.support });

  test("is forbidden from the audit API", async ({ request }) => {
    const res = await request.get(AUDIT_API);
    expect(res.status()).toBe(403);
    expect((await res.json()).error).toBe("forbidden");
  });
});

test.describe("moderator role", () => {
  test.use({ storageState: STORAGE_STATE.moderator });

  test("can read the audit API", async ({ request }) => {
    const res = await request.get(AUDIT_API);
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(Array.isArray(body.items)).toBe(true);
    expect(typeof body.total).toBe("number");
  });

  test("renders the audit page with its filters", async ({ page }) => {
    await page.goto("/audit");
    await expect(page.getByRole("heading", { name: "Audit Logs" })).toBeVisible();
    await expect(page.getByLabel("Action")).toBeVisible();
    await expect(page.getByLabel("From")).toBeVisible();
  });

  test("accepts a targetId deep link from a user's moderation history", async ({ page }) => {
    await page.goto("/users");
    await page.goto("/audit?targetId=11111111-1111-1111-1111-111111111111");
    await expect(page.getByRole("heading", { name: "Audit Logs" })).toBeVisible();
  });

  test("degrades a garbage filter to an unfiltered view instead of erroring", async ({ request }) => {
    const res = await request.get(`${AUDIT_API}?action=not-a-real-action&from=nonsense`);
    expect(res.status()).toBe(200);
  });
});
