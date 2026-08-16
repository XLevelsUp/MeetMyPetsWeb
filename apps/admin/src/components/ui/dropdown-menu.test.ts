import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

/**
 * Guard for a Base UI trap that Radix does not have.
 *
 * `DropdownMenuLabel` renders Base UI's `Menu.GroupLabel`, which calls
 * `useMenuGroupRootContext()` at render time and THROWS when it is not inside a
 * `Menu.Group`:
 *
 *   "Base UI: MenuGroupContext is missing. Menu group parts must be used within
 *    <Menu.Group> or <Menu.RadioGroup>."
 *
 * In Radix the same component works standalone, and every shadcn snippet on the
 * internet uses it that way — so this is exactly the mistake a copied example
 * reintroduces. It shipped once: the header account menu crashed the whole page
 * on click, and because the menu lives in a layout it escaped the segment error
 * boundary entirely.
 *
 * It also fails LATE. `DropdownMenuContent` portals its children and never sets
 * `keepMounted`, so the label subtree first renders on the open transition —
 * nothing is wrong until someone clicks.
 *
 * ── Why a text scan ───────────────────────────────────────────────────────
 * Vitest here is `environment: "node"` with no jsdom and no React Testing
 * Library. Adding both to click a dropdown is a lot of machinery for one rule.
 * This proves co-occurrence within a file, not true JSX nesting — a file could
 * pass while nesting them wrongly. That is an accepted limit: the real-world
 * violation is "used the label with no group anywhere near it", which this
 * catches, and it costs nothing to run.
 */

const SRC = fileURLToPath(new URL("../..", import.meta.url));

function tsxFiles(dir: string, found: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      tsxFiles(full, found);
    } else if (entry.endsWith(".tsx")) {
      found.push(full);
    }
  }
  return found;
}

describe("Base UI menu composition", () => {
  it("never uses DropdownMenuLabel outside a DropdownMenuGroup", () => {
    const offenders = tsxFiles(SRC)
      .filter((file) => {
        const source = readFileSync(file, "utf8");
        return source.includes("<DropdownMenuLabel") && !source.includes("<DropdownMenuGroup");
      })
      .map((file) => file.slice(SRC.length).replace(/\\/g, "/"));

    expect(offenders).toEqual([]);
  });

  it("scans a non-empty set of files, so a passing result means something", () => {
    // A silent glob failure would make the rule above vacuously true.
    const files = tsxFiles(SRC);
    expect(files.length).toBeGreaterThan(20);
    expect(files.some((f) => f.includes("user-menu"))).toBe(true);
  });
});
