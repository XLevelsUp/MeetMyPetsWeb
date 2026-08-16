"use client";

/**
 * Last-resort boundary for crashes a segment `error.tsx` cannot catch.
 *
 * A segment's error boundary wraps that segment's CHILDREN, not its own
 * `layout.tsx` — so anything thrown by the sidebar, the header, the account
 * menu or a provider escapes `(dashboard)/error.tsx` entirely and reaches the
 * root. Without this file that means Next's overlay in dev and a blank
 * "Application error: a client-side exception has occurred" in production. The
 * account-menu crash did exactly that.
 *
 * Two deliberate constraints:
 *
 * 1. **It replaces the whole document**, so it renders its own <html> and
 *    <body>. This is the only component in the app that does.
 * 2. **No imports beyond React.** No `copy`, no `cn()`, no UI primitives, no
 *    fonts. Whatever broke may be one of those, and a boundary that fails to
 *    render is worse than none — it turns a handled crash back into a white
 *    page. Styles are inline for the same reason: `globals.css` is loaded by
 *    the root layout, which is exactly what has been torn down here.
 *
 * `(dashboard)/error.tsx` stays as the nicer in-shell card for ordinary
 * page-level failures; this is the floor beneath it.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "1.5rem",
          fontFamily:
            "system-ui, -apple-system, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
          background: "#fafafa",
          color: "#18181b",
        }}
      >
        <main style={{ maxWidth: "32rem", textAlign: "center" }}>
          <h1 style={{ fontSize: "1.25rem", fontWeight: 600, margin: "0 0 0.5rem" }}>
            Something went wrong
          </h1>
          <p style={{ fontSize: "0.875rem", lineHeight: 1.6, color: "#52525b", margin: "0 0 1rem" }}>
            The admin panel hit an unexpected error and could not finish loading. Your
            session is unaffected — nothing was saved or changed by this.
          </p>

          {/*
            The digest is the only thing that correlates this crash with the
            server logs, so it is shown rather than swallowed. `error.message`
            is deliberately not rendered: in production React replaces it with a
            generic string anyway, and in dev the overlay already shows it.
          */}
          {error.digest ? (
            <p
              style={{
                fontSize: "0.75rem",
                color: "#71717a",
                fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
                margin: "0 0 1.5rem",
              }}
            >
              Error reference: {error.digest}
            </p>
          ) : null}

          <div style={{ display: "flex", gap: "0.5rem", justifyContent: "center" }}>
            <button
              type="button"
              onClick={() => reset()}
              style={{
                cursor: "pointer",
                borderRadius: "0.5rem",
                border: "1px solid #d4d4d8",
                background: "#ffffff",
                padding: "0.5rem 1rem",
                fontSize: "0.875rem",
                fontWeight: 500,
                color: "inherit",
              }}
            >
              Try again
            </button>
            {/*
              A plain anchor, not next/link: the router is part of what may have
              failed, and a full document load is the reliable escape.
            */}
            <a
              href="/"
              style={{
                borderRadius: "0.5rem",
                border: "1px solid transparent",
                padding: "0.5rem 1rem",
                fontSize: "0.875rem",
                fontWeight: 500,
                color: "#52525b",
                textDecoration: "none",
              }}
            >
              Back to dashboard
            </a>
          </div>
        </main>
      </body>
    </html>
  );
}
