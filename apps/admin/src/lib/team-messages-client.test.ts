import { afterEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";

import { copy } from "@/config/admin";
import { SESSION_EXPIRED_MESSAGE } from "@/lib/api-contract";
import { shouldRetry, teamRequest, TeamRequestError } from "@/lib/team-messages-client";

const errors = copy.teamMessages.errors;
const schema = z.object({ ok: z.boolean() });

function reply(status: number, body: unknown, isJson = true) {
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => new Response(isJson ? JSON.stringify(body) : String(body), { status })),
  );
}

async function messageOf(promise: Promise<unknown>): Promise<string> {
  try {
    await promise;
    return "resolved";
  } catch (error) {
    return (error as Error).message;
  }
}

afterEach(() => vi.unstubAllGlobals());

describe("teamRequest", () => {
  it("turns Next's own 404 page into words instead of 'Request failed (404)'", async () => {
    reply(404, "<!DOCTYPE html><html>404: This page could not be found.</html>", false);
    expect(await messageOf(teamRequest("/x", schema))).toBe(errors.notFound);
  });

  it("keeps our own error message when the route sent one", async () => {
    reply(400, { error: "pets_required", message: "Choose at least one pet." });
    expect(await messageOf(teamRequest("/x", schema))).toBe("Choose at least one pet.");
  });

  it("explains a dropped connection", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => Promise.reject(new TypeError("Failed to fetch"))));
    expect(await messageOf(teamRequest("/x", schema))).toBe(errors.network);
  });

  it("covers sign-out, server faults, rate limits and odd codes", async () => {
    reply(401, { error: "unauthorized", message: "Sign in required." });
    expect(await messageOf(teamRequest("/x", schema))).toBe(SESSION_EXPIRED_MESSAGE);
    reply(502, "Bad gateway", false);
    expect(await messageOf(teamRequest("/x", schema))).toBe(errors.server);
    reply(429, "", false);
    expect(await messageOf(teamRequest("/x", schema))).toBe(errors.busy);
    reply(418, "", false);
    expect(await messageOf(teamRequest("/x", schema))).toContain("(418)");
  });

  it("refuses a 200 whose body is not what the screen expects", async () => {
    reply(200, { unexpected: true });
    expect(await messageOf(teamRequest("/x", schema))).toBe(errors.badResponse);
  });
});

describe("shouldRetry", () => {
  it("retries only what a retry can fix, at most twice", () => {
    expect(shouldRetry(0, new TeamRequestError("net", 0))).toBe(true);
    expect(shouldRetry(1, new TeamRequestError("srv", 503))).toBe(true);
    expect(shouldRetry(2, new TeamRequestError("srv", 503))).toBe(false);
    expect(shouldRetry(0, new TeamRequestError("nf", 404))).toBe(false);
    expect(shouldRetry(0, new TeamRequestError("no", 403))).toBe(false);
  });
});
