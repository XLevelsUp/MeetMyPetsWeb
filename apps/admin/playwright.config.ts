import { defineConfig, devices } from "@playwright/test";

/**
 * E2E smoke tests for auth + RBAC. Requires a running admin app with real
 * Supabase env (apps/admin/.env.local locally; repo secrets in CI) and the two
 * seeded test users' credentials in E2E_* env vars — global-setup signs each
 * one in and saves a storageState the specs reuse.
 */
export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: "list",
  globalSetup: "./e2e/global-setup.ts",
  use: {
    baseURL: "http://localhost:3001",
    trace: "on-first-retry",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    command: "npm run dev",
    // /login is public (proxy excludes it), so a 200 here means the app is up.
    url: "http://localhost:3001/login",
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
