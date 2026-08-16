import { describe, expect, it } from "vitest";

import { listQuerySchema, reasonSchema } from "@/lib/contract-shared";
import { USER_ACTION_ROLES } from "@/lib/roles";
import {
  accountActionSchema,
  accountsQuerySchema,
  petActionSchema,
  petsQuerySchema,
  queryToSearchParams,
  searchParamsToQuery,
  DEFAULT_ACCOUNTS_QUERY,
} from "@/lib/users-contract";

describe("reasonSchema", () => {
  it("rejects a reason that is too short to be an audit trail", () => {
    expect(reasonSchema.safeParse("spam").success).toBe(false);
  });

  it("accepts and trims a substantive reason", () => {
    const parsed = reasonSchema.parse("  Repeated harassment reports, ticket #4821  ");
    expect(parsed).toBe("Repeated harassment reports, ticket #4821");
  });
});

describe("accountActionSchema", () => {
  it("requires a duration for suspend", () => {
    expect(
      accountActionSchema.safeParse({ action: "suspend", reason: "Ten chars plus" }).success,
    ).toBe(false);
  });

  it("accepts a well-formed suspend", () => {
    const parsed = accountActionSchema.parse({
      action: "suspend",
      reason: "Repeated harassment reports",
      durationHours: 168,
    });
    expect(parsed).toMatchObject({ action: "suspend", durationHours: 168 });
  });

  it("accepts ban and restore without a duration", () => {
    expect(accountActionSchema.safeParse({ action: "ban", reason: "Fraudulent account" }).success).toBe(
      true,
    );
    expect(
      accountActionSchema.safeParse({ action: "restore", reason: "Appeal upheld by support" })
        .success,
    ).toBe(true);
  });

  it("rejects an unknown action", () => {
    expect(
      accountActionSchema.safeParse({ action: "delete", reason: "Ten chars plus" }).success,
    ).toBe(false);
  });
});

describe("petActionSchema", () => {
  it("accepts flag and unflag", () => {
    expect(petActionSchema.safeParse({ action: "flag", reason: "Graphic imagery" }).success).toBe(
      true,
    );
    expect(
      petActionSchema.safeParse({ action: "unflag", reason: "Reviewed, false positive" }).success,
    ).toBe(true);
  });
});

describe("list query coercion", () => {
  it("defaults garbage paging to page 1", () => {
    expect(listQuerySchema.parse({ page: "abc", pageSize: "9999" })).toMatchObject({
      page: 1,
      pageSize: 25,
    });
  });

  it("falls back to the 'all' status filter on an unknown value", () => {
    expect(accountsQuerySchema.parse({ status: "nonsense" }).status).toBe("all");
  });
});

describe("query URL round-trip", () => {
  it("restores an accounts query exactly", () => {
    const query = accountsQuerySchema.parse({
      page: 3,
      status: "banned",
      sort: "pet_count",
      dir: "asc",
      q: "ada",
      emailVerified: "no",
      hasPhone: "yes",
      hasPets: "yes",
      joinedFrom: "2026-01-01",
      joinedTo: "2026-02-01",
    });
    expect(searchParamsToQuery(accountsQuerySchema, queryToSearchParams(query))).toEqual(query);
  });

  it("restores a pets query exactly", () => {
    const query = petsQuerySchema.parse({
      page: 2,
      status: "flagged",
      sort: "trust_score",
      dir: "asc",
      speciesId: "s1",
      trust: "at_risk",
    });
    expect(searchParamsToQuery(petsQuerySchema, queryToSearchParams(query))).toEqual(query);
  });

  it("leaves default values out of the address bar but still restores them", () => {
    const params = queryToSearchParams(
      { ...DEFAULT_ACCOUNTS_QUERY, status: "banned" },
      DEFAULT_ACCOUNTS_QUERY,
    );
    expect([...params.keys()]).toEqual(["status"]);
    expect(searchParamsToQuery(accountsQuerySchema, params)).toEqual({
      ...DEFAULT_ACCOUNTS_QUERY,
      status: "banned",
    });
  });

  it("ignores params the schema does not declare", () => {
    const params = new URLSearchParams({ status: "banned", tab: "pets", drop: "table" });
    expect(searchParamsToQuery(accountsQuerySchema, params)).toEqual({
      ...DEFAULT_ACCOUNTS_QUERY,
      status: "banned",
    });
  });
});

describe("USER_ACTION_ROLES", () => {
  it("lets moderators suspend but not ban or restore", () => {
    expect(USER_ACTION_ROLES.suspend).toContain("moderator");
    expect(USER_ACTION_ROLES.ban).not.toContain("moderator");
    expect(USER_ACTION_ROLES.restore).not.toContain("moderator");
  });

  it("never grants support any action", () => {
    for (const roles of Object.values(USER_ACTION_ROLES)) {
      expect(roles).not.toContain("support");
    }
  });

  it("always grants super_admin every action", () => {
    for (const roles of Object.values(USER_ACTION_ROLES)) {
      expect(roles).toContain("super_admin");
    }
  });
});
