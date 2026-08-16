import { chromium, type FullConfig } from "@playwright/test";
import { mkdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

/**
 * Signs in each seeded admin role once and saves its storageState for the
 * specs to reuse. Fails loudly if credentials are absent — the e2e CI job is
 * gated on the secrets being present, so a missing var means misconfiguration,
 * not a reason to silently skip.
 */

const authDir = path.join(path.dirname(fileURLToPath(import.meta.url)), ".auth");

export const STORAGE_STATE = {
  moderator: path.join(authDir, "moderator.json"),
  support: path.join(authDir, "support.json"),
} as const;

async function signIn(baseURL: string, email: string, password: string, storagePath: string) {
  const browser = await chromium.launch();
  try {
    const context = await browser.newContext({ baseURL });
    const page = await context.newPage();
    await page.goto("/login");
    await page.fill("#email", email);
    await page.fill("#password", password);
    await Promise.all([
      page.waitForURL((url) => new URL(url).pathname === "/", { timeout: 30_000 }),
      page.click('button[type="submit"]'),
    ]);
    await context.storageState({ path: storagePath });
  } finally {
    await browser.close();
  }
}

export default async function globalSetup(config: FullConfig) {
  const baseURL = config.projects[0]?.use?.baseURL ?? "http://localhost:3001";
  mkdirSync(authDir, { recursive: true });

  const roles = [
    { key: "moderator", email: process.env.E2E_MODERATOR_EMAIL, password: process.env.E2E_MODERATOR_PASSWORD },
    { key: "support", email: process.env.E2E_SUPPORT_EMAIL, password: process.env.E2E_SUPPORT_PASSWORD },
  ] as const;

  for (const role of roles) {
    if (!role.email || !role.password) {
      throw new Error(
        `Missing E2E credentials for ${role.key}: set E2E_${role.key.toUpperCase()}_EMAIL and _PASSWORD.`,
      );
    }
    await signIn(baseURL, role.email, role.password, STORAGE_STATE[role.key]);
  }
}
