import { describe, expect, it } from "vitest";

import { wrapLabel } from "@/components/dashboard/category-chart";

describe("wrapLabel", () => {
  it("leaves a label that fits alone", () => {
    expect(wrapLabel("Dog", 10)).toEqual(["Dog"]);
    expect(wrapLabel("Small Pet", 10)).toEqual(["Small Pet"]);
  });

  it("wraps onto a second line instead of overlapping the next bar", () => {
    expect(wrapLabel("Other Exotic Pet", 8)).toEqual(["Other", "Exotic…"]);
    expect(wrapLabel("Other Exotic Pet", 12)).toEqual(["Other Exotic", "Pet"]);
  });

  it("never returns more than two lines, and marks what was cut", () => {
    const lines = wrapLabel("A very long species name indeed", 6);
    expect(lines.length).toBeLessThanOrEqual(2);
    expect(lines.at(-1)?.endsWith("…")).toBe(true);
  });

  it("cuts a single word too long for the slot", () => {
    expect(wrapLabel("Hamsterific", 6)).toEqual(["Hamst…"]);
  });
});
