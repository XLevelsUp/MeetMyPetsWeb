import { describe, expect, it } from "vitest";

import { blogActionBodySchema, blogInputSchema, blogListQuerySchema, slugify } from "@/lib/blog-contract";

const base = {
  title: "How to Prepare Your Dog for Its First Playdate",
  slug: "how-to-prepare-your-dog-for-its-first-playdate",
  excerpt: "A short guide.",
  content: { type: "doc", content: [] },
};

describe("slugify", () => {
  it.each([
    ["How to Prepare Your Dog for Its First Playdate", "how-to-prepare-your-dog-for-its-first-playdate"],
    ["Your Pet's Social Life — Starts Here!", "your-pets-social-life-starts-here"],
    ["Pet Matching & Playdates", "pet-matching-and-playdates"],
    ["  Café Crème  ", "cafe-creme"],
    ["---", ""],
  ])("%s → %s", (input, expected) => {
    expect(slugify(input)).toBe(expected);
  });

  it("never ends in a hyphen after truncation", () => {
    expect(slugify(`${"a".repeat(119)} b`)).toMatch(/[a-z0-9]$/);
  });
});

describe("blogInputSchema", () => {
  it("accepts a minimal draft and fills defaults", () => {
    const parsed = blogInputSchema.parse(base);
    expect(parsed.authorName).toBe("MeetMyPets Team");
    expect(parsed.categoryId).toBeNull();
    expect(parsed.tags).toEqual([]);
  });

  it.each(["Has Caps", "double--hyphen", "-leading", "trailing-", "spa ce", "émoji"])("rejects slug %s", (slug) => {
    expect(blogInputSchema.safeParse({ ...base, slug }).success).toBe(false);
  });

  it("requires an https canonical URL", () => {
    expect(blogInputSchema.safeParse({ ...base, canonicalUrl: "http://a.example/x" }).success).toBe(false);
    expect(blogInputSchema.safeParse({ ...base, canonicalUrl: "javascript:alert(1)" }).success).toBe(false);
    expect(blogInputSchema.parse({ ...base, canonicalUrl: "" }).canonicalUrl).toBeNull();
  });

  it("de-duplicates tags and turns empty optionals into null", () => {
    const parsed = blogInputSchema.parse({ ...base, tags: ["a", "a", "b"], seoTitle: "  " });
    expect(parsed.tags).toEqual(["a", "b"]);
    expect(parsed.seoTitle).toBeNull();
  });
});

describe("blogActionBodySchema", () => {
  it("requires a reason to delete, not to publish", () => {
    expect(blogActionBodySchema.safeParse({ action: "delete" }).success).toBe(false);
    expect(blogActionBodySchema.safeParse({ action: "delete", reason: "short" }).success).toBe(false);
    expect(blogActionBodySchema.safeParse({ action: "delete", reason: "Duplicate of the playdate guide." }).success).toBe(true);
    expect(blogActionBodySchema.safeParse({ action: "publish" }).success).toBe(true);
  });
});

describe("blogListQuerySchema", () => {
  it("degrades garbage to defaults", () => {
    expect(blogListQuerySchema.parse({ status: "bogus", sort: "nope", dir: "sideways", page: "-3" })).toMatchObject({
      status: "all",
      sort: "updated",
      dir: "desc",
      page: 1,
    });
  });
});
