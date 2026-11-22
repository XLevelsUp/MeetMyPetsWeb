import { describe, expect, it } from "vitest";

import { pageItems } from "@/components/shared/pagination-items";

describe("pageItems", () => {
  it("shows nothing when there are no pages", () => {
    expect(pageItems(1, 0)).toEqual([]);
  });

  it("shows every page when they all fit", () => {
    expect(pageItems(1, 1)).toEqual([1]);
    expect(pageItems(4, 7)).toEqual([1, 2, 3, 4, 5, 6, 7]);
  });

  it("keeps first, last and the current neighbourhood on a long list", () => {
    expect(pageItems(1, 20)).toEqual([1, 2, "gap-end", 20]);
    expect(pageItems(10, 20)).toEqual([1, "gap-start", 9, 10, 11, "gap-end", 20]);
    expect(pageItems(20, 20)).toEqual([1, "gap-start", 19, 20]);
  });

  it("never hides a single page behind a gap", () => {
    expect(pageItems(4, 20)).toEqual([1, 2, 3, 4, 5, "gap-end", 20]);
    expect(pageItems(17, 20)).toEqual([1, "gap-start", 16, 17, 18, 19, 20]);
  });

  it("clamps a page past either end instead of showing nothing", () => {
    expect(pageItems(99, 20)).toEqual(pageItems(20, 20));
    expect(pageItems(0, 20)).toEqual(pageItems(1, 20));
  });

  it("always lists each page once, in order", () => {
    for (let total = 1; total <= 40; total++) {
      for (let page = 1; page <= total; page++) {
        const pages = pageItems(page, total).filter((x): x is number => typeof x === "number");
        expect(pages).toEqual([...pages].sort((a, b) => a - b));
        expect(new Set(pages).size).toBe(pages.length);
        expect(pages).toContain(page);
        expect(pages[0]).toBe(1);
        expect(pages.at(-1)).toBe(total);
      }
    }
  });
});
