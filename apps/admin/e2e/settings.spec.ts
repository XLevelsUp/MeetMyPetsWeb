import { expect, test } from "@playwright/test";

import { STORAGE_STATE } from "./global-setup";

/**
 * RBAC only — and unusually, this spec can ONLY prove refusals.
 *
 * `/settings` is gated to `SETTINGS_ROLES` = super_admin, while the two seeded
 * test users are `moderator` and `support`. So there is no signed-in role here
 * that can reach the happy path. That is a gap in the fixtures, not in the
 * feature: seed a super_admin test user and the positive cases become
 * assertable. Until then, the read paths are covered by src/lib/taxonomy.test.ts
 * and by live probes against the real database.
 *
 * ⚠️ This spec MUST NEVER create or edit taxonomy rows. The mobile app reads
 * `pets.species` and `pets.breeds` live from PostgREST, so a stray test species
 * would appear in real users' pet-creation flow — and the panel holds no DELETE
 * grant to clean it up afterwards. Every POST below is expected to be refused
 * by the role check before the adapter runs.
 */

const SPECIES_API = "/api/v1/admin/taxonomy/species";
const BREEDS_API = "/api/v1/admin/taxonomy/breeds";

for (const role of ["moderator", "support"] as const) {
  test.describe(`${role} role`, () => {
    test.use({ storageState: STORAGE_STATE[role] });

    test("is forbidden from reading the species API", async ({ request }) => {
      const res = await request.get(SPECIES_API);
      expect(res.status()).toBe(403);
      expect((await res.json()).error).toBe("forbidden");
    });

    test("is forbidden from reading the breeds API", async ({ request }) => {
      const res = await request.get(BREEDS_API);
      expect(res.status()).toBe(403);
    });

    test("cannot create a species", async ({ request }) => {
      const res = await request.post(SPECIES_API, {
        data: { name: "E2E Should Never Exist", reason: "This must be refused by the role check" },
      });
      // 403 before the adapter — nothing is written.
      expect(res.status()).toBe(403);
    });

    test("cannot create a breed", async ({ request }) => {
      const res = await request.post(BREEDS_API, {
        data: {
          speciesId: "00000000-0000-4000-8000-000000000000",
          name: "E2E Should Never Exist",
          reason: "This must be refused by the role check",
        },
      });
      expect(res.status()).toBe(403);
    });

    test("is redirected away from the settings page", async ({ page }) => {
      await page.goto("/settings");
      // requireRole fails → redirect("/") → the dashboard, not the settings UI.
      await expect(page).not.toHaveURL(/\/settings$/);
    });
  });
}
