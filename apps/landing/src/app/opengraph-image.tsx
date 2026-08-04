import { ImageResponse } from "next/og";

import { site } from "@/config/site";

export const alt = `${site.name} — ${site.tagline}`;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

// Required under `output: 'export'` — see robots.ts.
export const dynamic = "force-static";

/**
 * Social card, rendered to a static PNG at build time.
 *
 * Deliberately uses system fonts: fetching a webfont here would add a network
 * dependency to `next build`, which breaks offline and air-gapped CI.
 */
export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background: "#FAF9F6",
          padding: "72px",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "18px" }}>
          <div
            style={{
              width: 64,
              height: 64,
              borderRadius: 18,
              background: "#C2531F",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <svg width="40" height="40" viewBox="0 0 32 32" fill="#fff">
              <ellipse cx="9.4" cy="10.6" rx="3.5" ry="4.4" transform="rotate(-18 9.4 10.6)" />
              <ellipse cx="16" cy="8.2" rx="3.4" ry="4.6" />
              <ellipse cx="22.6" cy="10.6" rx="3.5" ry="4.4" transform="rotate(18 22.6 10.6)" />
              <path d="M16 15.4c4.2 0 7.6 3 7.6 6.6 0 2.6-2 4.4-4.6 4.4-1.2 0-2.1-.35-3-.35s-1.8.35-3 .35c-2.6 0-4.6-1.8-4.6-4.4 0-3.6 3.4-6.6 7.6-6.6Z" />
            </svg>
          </div>
          <div style={{ fontSize: 38, fontWeight: 700, color: "#1F1A17" }}>{site.name}</div>
        </div>

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            fontSize: 66,
            fontWeight: 700,
            lineHeight: 1.08,
            color: "#1F1A17",
            letterSpacing: "-0.02em",
          }}
        >
          <div>Where every pet finds their tribe</div>
          <div style={{ color: "#9C3F14" }}>&amp; every owner finds trust.</div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "14px", fontSize: 26, color: "#5C5149" }}>
          <div
            style={{
              display: "flex",
              padding: "8px 18px",
              borderRadius: 999,
              background: "#E5EDFD",
              color: "#2563EB",
              fontWeight: 600,
            }}
          >
            Verified profiles
          </div>
          <div>{site.domain}</div>
        </div>
      </div>
    ),
    size,
  );
}
