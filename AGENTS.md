<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Repo layout

npm-workspaces monorepo. `apps/marketing` is the static-export marketing site
(`output: "export"` — no middleware/proxy, cookies, Route Handlers, or Server
Actions there). `apps/admin` is the server-rendered admin panel. Run scripts
from the root: `npm run dev:marketing` / `dev:admin` / `build:marketing` /
`build:admin` / `typecheck` / `lint`. `node_modules` is hoisted to the root,
so the Next.js docs path above is unchanged.

Working on `apps/admin`? Read `docs/admin/README.md` first — it is the
master plan (purpose, 4-phase roadmap, architecture decisions, working
rules) — plus `docs/admin/schema-notes.md` for verified database reality.

# Marketing site: responsive rules

The breakpoint ladder is **375 / 768 / 1024 / 1440**. Every new section must
have a `md:` (768) tier, not just `sm:` and `lg:`. The site was once built with
`md:` used exactly once site-wide, which left every tablet rendering the phone
layout stretched across 1000px — the single largest visual defect it has had.

Two Tailwind traps that caused real bugs here:

- **Always set an explicit `grid-cols-1` on a responsive grid.** Tailwind
  compiles `grid-cols-*` to `minmax(0, 1fr)`, but with *no* `grid-cols` class
  the implicit column is `auto`, whose min-width is min-content. One `w-max`
  marquee inside such a grid made the document 3066px wide at a 375px viewport.
  The bug is invisible at the breakpoints that *do* declare columns.
- **Display type is fluid, not stepped.** `--text-hero` and `--text-section` in
  `globals.css` are `clamp()` tokens. Stepped sizes (`sm:text-6xl lg:text-…`)
  freeze one size across the whole 640–1023px range, which is what made the
  tablet layout look unconsidered even where the grid was correct.

Verify layout changes by rendering, not by reading classes: build, serve
`apps/marketing/out`, and check all four widths for `scrollWidth > clientWidth`.
Reveal animations use IntersectionObserver, so a full-page screenshot must
scroll the page first or every off-screen section captures at `opacity: 0`.
