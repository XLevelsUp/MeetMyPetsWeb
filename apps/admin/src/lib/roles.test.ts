import { describe, expect, it } from "vitest";

import { adminNav, navForRole } from "@/config/admin";
import {
  ADMIN_ROLES,
  USER_ACTION_ROLES,
  canAct,
  type AdminRole,
  type UserAction,
} from "@/lib/roles";

const ACTIONS = Object.keys(USER_ACTION_ROLES) as UserAction[];

describe("canAct", () => {
  /**
   * The assertion the old hardcoded helper would have failed.
   *
   * `pets-table.tsx` used to decide with `role === "super_admin" || role ===
   * "moderator"` instead of reading USER_ACTION_ROLES. That happened to agree
   * with `flag`/`unflag` — and would have silently disagreed the moment either
   * allowlist changed, since nothing tied the two together.
   */
  it("agrees with USER_ACTION_ROLES for every role and action", () => {
    for (const role of ADMIN_ROLES) {
      for (const action of ACTIONS) {
        expect(canAct(role, action), `${role} × ${action}`).toBe(
          USER_ACTION_ROLES[action].includes(role),
        );
      }
    }
  });

  it("keeps reversal narrower than the action it reverses", () => {
    // A moderator can suspend but not un-ban — deliberate, and worth pinning
    // because it is the kind of asymmetry a well-meaning refactor flattens.
    expect(canAct("moderator", "suspend")).toBe(true);
    expect(canAct("moderator", "restore")).toBe(false);
    expect(canAct("moderator", "ban")).toBe(false);
    expect(canAct("super_admin", "restore")).toBe(true);
  });

  it("gives support no moderation powers at all", () => {
    for (const action of ACTIONS) {
      expect(canAct("support", action), action).toBe(false);
    }
  });
});

describe("navForRole", () => {
  const labels = (role: AdminRole) =>
    navForRole(role)
      .filter((item) => item.enabled)
      .map((item) => item.label);

  it("shows support only the one surface it can actually open", () => {
    // The whole point of this change: support used to be offered six links
    // that redirected straight back to /users.
    expect(labels("support")).toEqual(["Users & Pets"]);
  });

  it("shows a moderator everything except Settings", () => {
    expect(labels("moderator")).toEqual([
      "Dashboard",
      "Users & Pets",
      "Verifications",
      "Content Reports",
      "Trust Review",
      "Audit Logs",
    ]);
    expect(labels("moderator")).not.toContain("Settings");
  });

  it("shows a super_admin every enabled entry", () => {
    const allEnabled = adminNav.filter((item) => item.enabled).map((item) => item.label);
    expect(labels("super_admin")).toEqual(allEnabled);
  });

  it("gives every nav item a non-empty allowlist", () => {
    // A missing or empty `roles` would hide the entry from everybody, which
    // looks identical to "the feature was removed".
    for (const item of adminNav) {
      expect(item.roles.length, item.label).toBeGreaterThan(0);
    }
  });

  it("leaves no enabled entry that nobody can see", () => {
    const orphans = adminNav
      .filter((item) => item.enabled)
      .filter((item) => !ADMIN_ROLES.some((role) => (item.roles as readonly AdminRole[]).includes(role)))
      .map((item) => item.label);
    expect(orphans).toEqual([]);
  });

  it("does not narrow the shared adminNav array", () => {
    // breadcrumbs.tsx resolves labels from the full list; filtering in place
    // would blank the breadcrumb on pages the viewer legitimately has open.
    const before = adminNav.length;
    navForRole("support");
    expect(adminNav.length).toBe(before);
  });
});
