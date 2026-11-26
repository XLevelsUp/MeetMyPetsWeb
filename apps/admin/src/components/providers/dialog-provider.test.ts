import { describe, expect, it } from "vitest";

import { shouldGuardLink } from "@/components/providers/dialog-provider";

const ORIGIN = "http://localhost:3001";
const HERE = `${ORIGIN}/team-messages/new`;

function anchor(href: string, attrs: { target?: string; download?: boolean } = {}) {
  return {
    href: new URL(href, ORIGIN).href,
    target: attrs.target ?? "",
    hasAttribute: (name: string) => name === "download" && Boolean(attrs.download),
  } as unknown as HTMLAnchorElement;
}

function click(overrides: Partial<MouseEvent> = {}) {
  return { defaultPrevented: false, button: 0, metaKey: false, ctrlKey: false, shiftKey: false, altKey: false, ...overrides } as MouseEvent;
}

describe("shouldGuardLink", () => {
  it("asks before leaving for another page in the app", () => {
    expect(shouldGuardLink(anchor("/team-messages"), click(), ORIGIN, HERE)).toBe(true);
    expect(shouldGuardLink(anchor("/users?tab=pets"), click(), ORIGIN, HERE)).toBe(true);
  });

  it("lets through what doesn't leave the page or opens elsewhere", () => {
    expect(shouldGuardLink(anchor("/team-messages/new"), click(), ORIGIN, HERE)).toBe(false);
    expect(shouldGuardLink(anchor("/team-messages/new#reach"), click(), ORIGIN, HERE)).toBe(false);
    expect(shouldGuardLink(anchor("https://meetmypets.app"), click(), ORIGIN, HERE)).toBe(false);
    expect(shouldGuardLink(anchor("/users", { target: "_blank" }), click(), ORIGIN, HERE)).toBe(false);
    expect(shouldGuardLink(anchor("/export.csv", { download: true }), click(), ORIGIN, HERE)).toBe(false);
  });

  it("respects new-tab clicks and clicks something else already handled", () => {
    expect(shouldGuardLink(anchor("/users"), click({ ctrlKey: true }), ORIGIN, HERE)).toBe(false);
    expect(shouldGuardLink(anchor("/users"), click({ metaKey: true }), ORIGIN, HERE)).toBe(false);
    expect(shouldGuardLink(anchor("/users"), click({ button: 1 }), ORIGIN, HERE)).toBe(false);
    expect(shouldGuardLink(anchor("/users"), click({ defaultPrevented: true }), ORIGIN, HERE)).toBe(false);
  });
});
