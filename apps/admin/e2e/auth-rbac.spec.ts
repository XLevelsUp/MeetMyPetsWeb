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

  test("is forbidden from the analytics API", async ({ request }) => {
    const res = await request.get(SUMMARY_API);
    expect(res.status()).toBe(403);
    expect((await res.json()).error).toBe("forbidden");
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
