import { expect, test } from "@playwright/test";

import { STORAGE_STATE } from "./global-setup";

const SUMMARY_API = "/api/v1/admin/analytics/summary";

test.describe("anonymous", () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test("visiting the dashboard redirects to login", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveURL(/\/login/);
  });

  test("the analytics API returns 401", async ({ request }) => {
    const res = await request.get(SUMMARY_API);
    expect(res.status()).toBe(401);
    expect((await res.json()).error).toBe("unauthenticated");
  });
});

test.describe("support role", () => {
  test.use({ storageState: STORAGE_STATE.support });

  test("reaches the dashboard shell", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveURL(/\/$/);
    await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible();
  });

  /**
   * The account menu lives in the dashboard LAYOUT, so this covers every page
   * at once — and a crash there escapes the segment error boundary entirely.
   *
   * This is the test that would have caught the Base UI `Menu.GroupLabel`
   * regression: the menu portals its content and only renders it on the open
   * transition, so nothing is wrong until something clicks the trigger.
   */
  test("the account menu opens without crashing the page", async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));

    await page.goto("/users");
    await page.getByRole("button", { name: "Account menu" }).click();

    await expect(page.getByRole("menuitem", { name: /sign out/i })).toBeVisible();
    await expect(page.getByText("admin.support.test@meetmypets.dev")).toBeVisible();
    expect(errors).toEqual([]);
  });

  test("is forbidden from the analytics API", async ({ request }) => {
    const res = await request.get(SUMMARY_API);
    expect(res.status()).toBe(403);
    expect((await res.json()).error).toBe("forbidden");
  });

  /**
   * The sidebar used to offer support six links that redirected straight back
   * to /users. Nav visibility is derived from the same allowlists the routes
   * enforce, so this asserts the two agree.
   */
  test("is not offered nav it cannot open", async ({ page }) => {
    await page.goto("/users");
    const sidebar = page.getByRole("navigation");

    await expect(sidebar.getByRole("link", { name: "Users & Pets" })).toBeVisible();
    for (const hidden of ["Settings", "Trust Review", "Audit Logs", "Content Reports", "Verifications"]) {
      await expect(sidebar.getByRole("link", { name: hidden })).toHaveCount(0);
    }
  });

  test("but the server still refuses a hidden route by URL", async ({ page }) => {
    // Hiding is UX; requireRole is the boundary. Typing the URL must still bounce.
    await page.goto("/settings");
    await expect(page).not.toHaveURL(/\/settings$/);
  });
});

test.describe("moderator role", () => {
  test.use({ storageState: STORAGE_STATE.moderator });

  test("sees the dashboard with metric data", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible();
    await expect(page.getByText("Total Users")).toBeVisible();
  });

  test("is allowed to call the analytics API", async ({ request }) => {
    const res = await request.get(SUMMARY_API);
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.metrics).toHaveProperty("totalUsers");
  });
});
