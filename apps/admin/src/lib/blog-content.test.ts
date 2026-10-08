import { describe, expect, it } from "vitest";

import { docText, hasBody, isSafeHref, sanitizeDoc, wordCount } from "@/lib/blog-content";

const p = (text: string, marks?: unknown[]) => ({
  type: "paragraph",
  content: [{ type: "text", text, ...(marks ? { marks } : {}) }],
});

describe("isSafeHref", () => {
  it.each([
    ["https://example.com/a?b=c", true],
    ["http://example.com", true],
    ["mailto:hello@meetmypets.app", true],
    ["/#waitlist", true],
    ["/blog/some-post/", true],
    ["#section", true],
    ["javascript:alert(1)", false],
    ["JaVaScRiPt:alert(1)", false],
    ["data:text/html,<script>alert(1)</script>", false],
    ["vbscript:msgbox", false],
    ["//evil.example/path", false],
    ["/\\evil.example", false],
    ["", false],
    [42, false],
  ])("%s → %s", (href, expected) => {
    expect(isSafeHref(href)).toBe(expected);
  });
});

describe("sanitizeDoc", () => {
  it("returns an empty doc for anything that is not a doc", () => {
    expect(sanitizeDoc(null)).toEqual({ type: "doc", content: [] });
    expect(sanitizeDoc("<script>")).toEqual({ type: "doc", content: [] });
    expect(sanitizeDoc({ type: "paragraph" })).toEqual({ type: "doc", content: [] });
  });

  it("keeps whitelisted structure intact", () => {
    const doc = {
      type: "doc",
      content: [
        { type: "heading", attrs: { level: 2 }, content: [{ type: "text", text: "Why" }] },
        p("Hello ", [{ type: "bold" }]),
        { type: "bulletList", content: [{ type: "listItem", content: [p("one")] }] },
        { type: "cta", attrs: { label: "Join", href: "/#waitlist" } },
      ],
    };
    expect(sanitizeDoc(doc)).toEqual(doc);
  });

  it("drops unknown node types and unknown marks", () => {
    const out = sanitizeDoc({
      type: "doc",
      content: [
        { type: "script", content: [{ type: "text", text: "alert(1)" }] },
        { type: "iframe", attrs: { src: "https://evil.example" } },
        p("x", [{ type: "underline" }, { type: "textStyle", attrs: { color: "red" } }, { type: "italic" }]),
      ],
    });
    expect(out.content).toEqual([p("x", [{ type: "italic" }])]);
  });

  it("strips a link mark with a dangerous href but keeps its text", () => {
    const out = sanitizeDoc({
      type: "doc",
      content: [p("click", [{ type: "link", attrs: { href: "javascript:alert(1)" } }])],
    });
    expect(out.content).toEqual([p("click")]);
  });

  it("keeps a safe link and discards every other link attribute", () => {
    const out = sanitizeDoc({
      type: "doc",
      content: [p("go", [{ type: "link", attrs: { href: "https://a.example", onclick: "x", target: "_self" } }])],
    });
    expect(out.content[0].content![0].marks).toEqual([{ type: "link", attrs: { href: "https://a.example" } }]);
  });

  it("demotes H1 (the page title) and junk levels to H2", () => {
    const out = sanitizeDoc({
      type: "doc",
      content: [
        { type: "heading", attrs: { level: 1 }, content: [{ type: "text", text: "a" }] },
        { type: "heading", attrs: { level: 9 }, content: [{ type: "text", text: "b" }] },
        { type: "heading", attrs: { level: 3 }, content: [{ type: "text", text: "c" }] },
      ],
    });
    expect(out.content.map((n) => n.attrs?.level)).toEqual([2, 2, 3]);
  });

  it("drops a CTA with an unsafe link and an image from a disallowed host", () => {
    const out = sanitizeDoc(
      {
        type: "doc",
        content: [
          { type: "cta", attrs: { label: "Pwn", href: "javascript:void(0)" } },
          { type: "image", attrs: { src: "https://hotlink.example/a.png", alt: "x" } },
          { type: "image", attrs: { src: "https://ok.example/a.png", alt: "ok", onerror: "x" } },
        ],
      },
      (src) => src.startsWith("https://ok.example/"),
    );
    expect(out.content).toEqual([
      { type: "image", attrs: { src: "https://ok.example/a.png", alt: "ok", title: null } },
    ]);
  });

  it("enforces nesting rules (no table inside a list item, no list item at top level)", () => {
    const out = sanitizeDoc({
      type: "doc",
      content: [
        { type: "listItem", content: [p("orphan")] },
        {
          type: "bulletList",
          content: [{ type: "listItem", content: [{ type: "table", content: [] }, p("kept")] }],
        },
      ],
    });
    expect(out.content).toEqual([{ type: "bulletList", content: [{ type: "listItem", content: [p("kept")] }] }]);
  });

  it("bounds nesting depth", () => {
    let node: Record<string, unknown> = p("deep");
    for (let i = 0; i < 40; i++) node = { type: "blockquote", content: [node] };
    // blockquote cannot contain blockquote, so the whole chain is dropped rather than recursed.
    expect(sanitizeDoc({ type: "doc", content: [node] }).content).toEqual([]);
  });
});

describe("text helpers", () => {
  const doc = sanitizeDoc({
    type: "doc",
    content: [p("one two three"), { type: "cta", attrs: { label: "Not counted", href: "/" } }],
  });

  it("counts words, ignoring CTA labels", () => {
    expect(wordCount(doc)).toBe(3);
    expect(docText(doc)).toBe("one two three\n");
  });

  it("hasBody needs real text or an image", () => {
    expect(hasBody(doc)).toBe(true);
    expect(hasBody({ type: "doc", content: [{ type: "paragraph", content: [] }] })).toBe(false);
  });
});
