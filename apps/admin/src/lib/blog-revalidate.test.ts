import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { blogPaths, revalidateMarketing } from "@/lib/blog-revalidate";

const fetchMock = vi.fn();

beforeEach(() => {
  vi.stubGlobal("fetch", fetchMock);
  process.env.MARKETING_SITE_URL = "https://www.meetmypets.app/";
  process.env.BLOG_REVALIDATE_SECRET = "s3cret";
});

afterEach(() => {
  fetchMock.mockReset();
  vi.unstubAllGlobals();
  delete process.env.MARKETING_SITE_URL;
  delete process.env.BLOG_REVALIDATE_SECRET;
});

describe("blogPaths", () => {
  it("always includes the index and sitemap, de-duplicates, skips empties", () => {
    expect(blogPaths(["a", "a", null, ""])).toEqual(["/blog/", "/sitemap.xml", "/blog/a/"]);
  });
});

describe("revalidateMarketing", () => {
  it("POSTs the paths with the secret in a header, never following redirects", async () => {
    fetchMock.mockResolvedValue(new Response("{}", { status: 200 }));
    expect(await revalidateMarketing(["/blog/"])).toEqual({ status: "ok" });

    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("https://www.meetmypets.app/api/revalidate/");
    expect(init.method).toBe("POST");
    expect(init.redirect).toBe("manual");
    expect((init.headers as Record<string, string>)["x-revalidate-secret"]).toBe("s3cret");
    expect(url).not.toContain("s3cret");
  });

  it("reports a redirect as a misconfiguration, naming the target", async () => {
    fetchMock.mockResolvedValue(
      new Response(null, { status: 308, headers: { location: "https://www.meetmypets.app/api/revalidate/" } }),
    );
    const result = await revalidateMarketing(["/blog/"]);
    expect(result.status).toBe("failed");
    expect(result.message).toContain("https://www.meetmypets.app");
  });

  it("reports a rejected secret as failed", async () => {
    fetchMock.mockResolvedValue(new Response("{}", { status: 401 }));
    expect((await revalidateMarketing(["/blog/"])).status).toBe("failed");
  });

  it("reports a network error as failed instead of throwing", async () => {
    fetchMock.mockRejectedValue(new TypeError("fetch failed"));
    expect((await revalidateMarketing(["/blog/"])).status).toBe("failed");
  });

  it("is `unconfigured` without the env, and makes no request", async () => {
    delete process.env.BLOG_REVALIDATE_SECRET;
    expect((await revalidateMarketing(["/blog/"])).status).toBe("unconfigured");
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
