import { expect, test } from "@playwright/test";

import { STORAGE_STATE } from "./global-setup";
import { auditRowsFor, createTargetUser, deleteTargetUser, type SeededTarget } from "./seed";

/**
 * Moderation flow against a throwaway account created and destroyed by this
 * spec. Serial because the tests share one target and the actions are stateful.
 */
test.describe.configure({ mode: "serial" });

let target: SeededTarget;

test.beforeAll(async () => {
  target = await createTargetUser();
});

test.afterAll(async () => {
  if (target) await deleteTargetUser(target);
});

test.describe("support role", () => {
  test.use({ storageState: STORAGE_STATE.support });

  test("can view the users list", async ({ page }) => {
    await page.goto("/users");
    await expect(page.getByRole("heading", { name: "Users & Pets" })).toBeVisible();
  });

  test("is forbidden from acting on an account", async ({ request }) => {
    const res = await request.post(`/api/v1/admin/users/${target.accountId}/actions`, {
      data: { action: "suspend", reason: "Automated e2e attempt", durationHours: 24 },
    });
    expect(res.status()).toBe(403);
  });

  test("lands on /users instead of the analytics dashboard", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveURL(/\/users$/);
  });

  /**
   * Read-only. Filter state lives in the URL so a view can be shared and
   * survive a reload; the failure this guards is the one the feature exists to
   * fix — coming back to the list and finding page 1 of everything.
   */
  test("carries a filter in the URL and restores it on reload", async ({ page }) => {
    await page.goto("/users");

    await page.getByLabel("Email verified").click();
    await page.getByRole("option", { name: "No" }).click();

    await expect(page).toHaveURL(/emailVerified=no/);

    await page.reload();
    // The control is repopulated from the URL, not reset to the default.
    await expect(page.getByLabel("Email verified")).toHaveText(/No/);
  });

  test("opens the pets tab from a link and sorts by trust", async ({ page }) => {
    await page.goto("/users?tab=pets&sort=trust_score&dir=asc");

    const header = page.getByRole("columnheader", { name: /Trust/ });
    // aria-sort is the assertion that matters: it is the only signal a screen
    // reader gets about which column the table is ordered by.
    await expect(header).toHaveAttribute("aria-sort", "ascending");
  });
});

test.describe("moderator role", () => {
  test.use({ storageState: STORAGE_STATE.moderator });

  test("suspends the target through the dialog and records an audit row", async ({ page }) => {
    await page.goto(`/users/${target.accountId}`);

    await page.getByRole("button", { name: "Suspend" }).click();
    await page
      .getByLabel("Reason (recorded in the audit log)")
      .fill("Automated end-to-end moderation check");
    await page.getByRole("button", { name: "Suspend account" }).click();

    await expect(page.getByText("Suspended").first()).toBeVisible();

    const rows = await auditRowsFor(target.accountId);
    expect(rows.map((r) => r.action)).toContain("account.suspend");
    expect(rows[0].reason).toBe("Automated end-to-end moderation check");
  });

  test("cannot ban or restore — those are super_admin only", async ({ request }) => {
    for (const action of ["ban", "restore"] as const) {
      const res = await request.post(`/api/v1/admin/users/${target.accountId}/actions`, {
        data: { action, reason: "Automated e2e attempt" },
      });
      expect(res.status()).toBe(403);
    }
  });

  test("rejects an action whose reason is too short to be useful", async ({ request }) => {
    const res = await request.post(`/api/v1/admin/users/${target.accountId}/actions`, {
      data: { action: "suspend", reason: "spam", durationHours: 24 },
    });
    expect(res.status()).toBe(400);
  });

  test("finds the suspended account through the status filter", async ({ request }) => {
    const res = await request.get("/api/v1/admin/users?status=suspended&pageSize=100");
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.items.some((item: { id: string }) => item.id === target.accountId)).toBe(true);
  });
});
