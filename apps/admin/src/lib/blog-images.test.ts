import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: () => null }));
vi.mock("@/lib/supabase/reference", () => ({ isSupabaseConfigured: () => true }));

import { sniffImage, uploadBlogImage } from "@/lib/blog-images";

const bytes = (...values: (number | string)[]) => {
  const out: number[] = [];
  for (const v of values) {
    if (typeof v === "string") for (const ch of v) out.push(ch.charCodeAt(0));
    else out.push(v);
  }
  while (out.length < 16) out.push(0);
  return new Uint8Array(out);
};

describe("sniffImage", () => {
  it.each([
    ["jpeg", bytes(0xff, 0xd8, 0xff, 0xe0), "image/jpeg"],
    ["png", bytes(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a), "image/png"],
    ["gif", bytes("GIF89a"), "image/gif"],
    ["webp", bytes("RIFF", 0, 0, 0, 0, "WEBP"), "image/webp"],
    ["avif", bytes(0, 0, 0, 0x20, "ftypavif"), "image/avif"],
  ])("recognises %s", (_name, data, mime) => {
    expect(sniffImage(data)?.mime).toBe(mime);
  });

  it.each([
    ["svg (scriptable)", bytes('<svg xmlns="http://www.w3.org/2000/svg">')],
    ["html", bytes("<!doctype html>")],
    ["pdf", bytes("%PDF-1.7")],
    ["too short", new Uint8Array([0xff, 0xd8])],
  ])("rejects %s", (_name, data) => {
    expect(sniffImage(data)).toBeNull();
  });
});

describe("uploadBlogImage", () => {
  it("decides the type from the bytes, not the declared Content-Type", async () => {
    const svg = new File(['<svg onload="alert(1)"></svg>'], "cute-dog.png", { type: "image/png" });
    expect(await uploadBlogImage(svg)).toMatchObject({ ok: false, reason: "invalid" });
  });

  it("rejects files over 5 MB before reading them", async () => {
    const big = new File([new Uint8Array(5 * 1024 * 1024 + 1)], "big.jpg", { type: "image/jpeg" });
    expect(await uploadBlogImage(big)).toMatchObject({ ok: false, reason: "invalid" });
  });
});
