import { fileURLToPath } from "node:url";

import { defineConfig } from "vitest/config";

/**
 * Unit tests for the server-side adapters and contracts. Environment is
 * `node` (these modules never touch the DOM). Two aliases matter:
 *  - `@` → ./src, mirroring tsconfig paths so imports resolve identically.
 *  - `server-only` → an empty stub. The real package throws when imported
 *    outside a React Server Component build; adapters import it for that
 *    guard, and under Vitest we neutralise it.
 */
export default defineConfig({
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
  },
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
      "server-only": fileURLToPath(new URL("./src/test/empty-module.ts", import.meta.url)),
    },
  },
});
