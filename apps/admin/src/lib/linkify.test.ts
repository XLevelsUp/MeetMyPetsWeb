import { describe, expect, it } from "vitest";

import { safeHref, splitLinks } from "@/lib/linkify";

describe("splitLinks", () => {
  it("turns the address in a message into a link and keeps the rest as text", () => {
    expect(splitLinks("hello https://www.wanderingkite.in/studiospace")).toEqual([
      { type: "text", value: "hello " },
      { type: "link", value: "https://www.wanderingkite.in/studiospace", href: "https://www.wanderingkite.in/studiospace" },
    ]);
  });

  it("adds https to www. addresses and leaves trailing punctuation outside the link", () => {
    expect(splitLinks("See www.meetmypets.app/camps.")).toEqual([
      { type: "text", value: "See " },
      { type: "link", value: "www.meetmypets.app/camps", href: "https://www.meetmypets.app/camps" },
      { type: "text", value: "." },
    ]);
  });

  it("drops an unbalanced closing bracket but keeps a balanced one", () => {
    expect(splitLinks("(details: https://x.com/a)")[1]).toEqual({ type: "link", value: "https://x.com/a", href: "https://x.com/a" });
    expect(splitLinks("https://en.wikipedia.org/wiki/Dog_(disambiguation)")[0]).toMatchObject({
      value: "https://en.wikipedia.org/wiki/Dog_(disambiguation)",
    });
  });

  it("finds several links and keeps line breaks", () => {
    const pieces = splitLinks("One https://a.com\nTwo http://b.org");
    expect(pieces.filter((p) => p.type === "link").map((p) => p.value)).toEqual(["https://a.com", "http://b.org"]);
    expect(pieces.map((p) => p.value).join("")).toBe("One https://a.com\nTwo http://b.org");
  });

  it("never links unsafe schemes and leaves plain text untouched", () => {
    expect(splitLinks("javascript:alert(1)")).toEqual([{ type: "text", value: "javascript:alert(1)" }]);
    expect(safeHref("javascript:alert(1)")).toBeNull();
    expect(splitLinks("No links here")).toEqual([{ type: "text", value: "No links here" }]);
  });
});
