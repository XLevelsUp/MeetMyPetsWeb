import { expect, test } from "@playwright/test";

import { STORAGE_STATE } from "./global-setup";

/**
 * RBAC and rendering only.
 *
 * This spec NEVER resolves a report or creates one. `matching.pet_reports` is
 * owned by the mobile/FastAPI team and its rows are real user-generated
 * reports: resolving one would corrupt their moderation data, and the panel
 * holds no INSERT or DELETE grant to undo it. Resolution logic is covered
 * against the mock in src/lib/reports.test.ts.
 */

const REPORTS_API = "/api/v1/admin/reports";

test.describe("support role", () => {
  test.use({ storageState: STORAGE_STATE.support });

  test("is forbidden from the reports API", async ({ request }) => {
    const res = await request.get(REPORTS_API);
    expect(res.status()).toBe(403);
    expect((await res.json()).error).toBe("forbidden");
  });

  test("cannot resolve a report", async ({ request }) => {
    const res = await request.post(`${REPORTS_API}/11111111-1111-1111-1111-111111111111`, {
      data: { resolution: "dismissed", reason: "Support should never get this far" },
    });
    expect(res.status()).toBe(403);
  });
});

test.describe("moderator role", () => {
  test.use({ storageState: STORAGE_STATE.moderator });

  test("can read the reports API", async ({ request }) => {
    const res = await request.get(REPORTS_API);
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(Array.isArray(body.items)).toBe(true);
    expect(typeof body.total).toBe("number");
  });

  test("renders the queue with its filters", async ({ page }) => {
    await page.goto("/reports");
    await expect(page.getByRole("heading", { name: "Content Reports" })).toBeVisible();
    await expect(page.getByLabel("Status")).toBeVisible();
    await expect(page.getByLabel("Reason")).toBeVisible();
  });

  test("defaults to the pending queue", async ({ request }) => {
    const res = await request.get(REPORTS_API);
    const body = await res.json();
    for (const item of body.items) expect(item.status).toBe("pending");
  });

  test("degrades a garbage filter to the default view instead of erroring", async ({ request }) => {
    const res = await request.get(`${REPORTS_API}?status=not-a-status&reason=nonsense&page=abc`);
    expect(res.status()).toBe(200);
  });

  test("rejects a resolution with too short a reason", async ({ request }) => {
    const res = await request.post(`${REPORTS_API}/11111111-1111-1111-1111-111111111111`, {
      data: { resolution: "dismissed", reason: "nope" },
    });
    // 400 from the contract, before the adapter ever runs — so this never
    // touches a real report even though the id is fabricated.
    expect(res.status()).toBe(400);
    expect((await res.json()).error).toBe("invalid_body");
  });
});
