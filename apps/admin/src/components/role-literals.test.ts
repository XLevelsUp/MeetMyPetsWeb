import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

/**
 * Components must ask `canAct` / the allowlists, never compare role strings.
 *
 * `pets-table.tsx` shipped with `role === "super_admin" || role ===
 * "moderator"` in place of reading `USER_ACTION_ROLES.flag`. It agreed with the
 * allowlist by coincidence, and would have kept its own opinion the moment the
 * allowlist changed — the failure mode being a button that renders for someone
 * the API then rejects, or worse, one that quietly disappears for someone who
 * should have it.
 *
 * The rule is enforced here rather than by review because the mistake reads as
 * perfectly ordinary TypeScript.
 *
 * Same technique and same caveat as `components/ui/dropdown-menu.test.ts`: this
 * is a text scan, so it catches the literal in any position — including inside
 * a string or comment. That over-strictness is deliberate; a component has no
 * legitimate reason to name a role.
 *
 * `lib/roles.ts` (the definitions), `lib/dal.ts` (the server gate), tests and
 * `e2e/` are the intended homes for role strings and are not scanned.
 */

const COMPONENTS = fileURLToPath(new URL(".", import.meta.url));

/** The role identifiers as they appear in `app_metadata.role`. */
const ROLE_LITERALS = ["super_admin", "moderator", "support"];

function sourceFiles(dir: string, found: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      sourceFiles(full, found);
    } else if (/\.tsx?$/.test(entry) && !entry.endsWith(".test.ts")) {
      found.push(full);
    }
  }
  return found;
}

describe("role literals", () => {
  it("never appear in components — they ask canAct or an allowlist instead", () => {
    const offenders: string[] = [];

    for (const file of sourceFiles(COMPONENTS)) {
      const source = readFileSync(file, "utf8");
      const hits = ROLE_LITERALS.filter((literal) => source.includes(`"${literal}"`));
      if (hits.length > 0) {
        offenders.push(`${file.slice(COMPONENTS.length).replace(/\\/g, "/")}: ${hits.join(", ")}`);
      }
    }

    expect(offenders).toEqual([]);
  });

  it("scans a non-empty set of files, so a pass means something", () => {
    const files = sourceFiles(COMPONENTS);
    expect(files.length).toBeGreaterThan(30);
    expect(files.some((f) => f.includes("pets-table"))).toBe(true);
  });
});
