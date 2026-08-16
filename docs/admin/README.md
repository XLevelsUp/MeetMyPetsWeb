# MeetMyPets Admin Panel — Master Plan & Alignment Doc

> **Audience: every human or AI agent working on `apps/admin`.** Read this
> before touching admin code. Companion docs: [schema-notes.md](schema-notes.md)
> (verified database reality — updated per introspection pass),
> [app-team-handoff.md](app-team-handoff.md) (**what the mobile-app/FastAPI team
> needs to know and do** — shared auth, shared tables, open asks), and the root
> [AGENTS.md](../../AGENTS.md) (Next.js 16 warning + repo layout).

## 1. Purpose

`admin.meetmypets.app` is the **operational command center** for MeetMyPets
moderators and founders. MeetMyPets is a multi-species pet ecosystem (verified
playdates, breeding matches, community, local pet businesses) whose core
differentiator is **trust** — vaccination verification, KYC, human moderation.
The admin panel is where that trust is operated: reviewing verifications,
moderating users/pets/content, managing the business directory, and tracking
platform growth.

It **shares the production Supabase project (`owfrnkafevdfzduuqnic`) with the
mobile app**: same Postgres, same Supabase Auth user pool. The mobile app /
FastAPI backend owns the domain schemas (`identity`, `pets`, `matching`,
`chat`, `social`); the admin panel is a read-mostly consumer with a
deliberately narrow, service-key-granted surface (see schema-notes).

## 2. Architecture

```
┌────────────────────── this repo (npm workspaces) ─────────────────────┐
│ apps/landing  → meetmypets.app        static export, NO server runtime │
│ apps/admin    → admin.meetmypets.app  Next 16 server-rendered, :3001   │
└───────────────────────────────────────────────────────────────────────┘
                     │ @supabase/ssr (cookies)  │ service-key (server-only)
                     ▼                          ▼
     Supabase Auth (shared user pool)   Postgres domain schemas
     roles in app_metadata.role         identity / pets / matching / chat / social
                     ▲
     Mobile app + future FastAPI backend (api.meetmypets.app) — same project
```

Key decisions (made in the approved Phase 1 plan; do not silently reverse):

- **No FastAPI yet.** The PRD describes FastAPI endpoints, but no such backend
  exists in this repo. The admin app queries Supabase directly from Next.js
  Route Handlers / server code. The typed contract in
  `apps/admin/src/lib/api-contract.ts` is written so the backend can later be
  swapped to FastAPI by re-implementing the same payload shapes — nothing
  outside that file knows response schemas.
- **Two-layer RBAC** (Next 16 auth guidance):
  - `apps/admin/src/proxy.ts` — *optimistic* JWT check (`getClaims()`, ES256
    verified locally), session-cookie refresh, redirect/401 before paint.
    NOT the security boundary (claims can be stale until token refresh).
  - `apps/admin/src/lib/dal.ts` — *authoritative* `verifySession()` /
    `requireRole()` via server-verified `auth.getUser()`. Every gated layout
    and API route calls it.
- **Roles**: `super_admin` | `moderator` | `support`, stored in Supabase
  `app_metadata.role` (never `user_metadata` — user-editable). Note the
  FastAPI side has a *second* role system (`identity.accounts.is_platform_admin
  /_moderator`) that is currently disconnected; merging them is an open
  backend-team decision.
- **Schema isolation rule**: only TWO files may know database table/column
  names — `lib/dal.ts` (role storage) and `lib/analytics.ts` (+ future
  feature adapters following the same pattern). When the schema shifts, those
  files change and nothing else does.
- **Design tokens are deliberately duplicated** between
  `apps/landing/src/app/globals.css` and `apps/admin/src/app/globals.css`
  (no shared package yet; cross-referenced header comments). Token edits must
  be mirrored by hand.
- **Never add server-only features to `apps/landing`** — it is
  `output: "export"` (no middleware/proxy, cookies, Route Handlers, Server
  Actions). That constraint is why the admin panel is a separate app.

Stack: Next 16.2 (Turbopack, `proxy.ts` not `middleware.ts`, async
`cookies()`/`params`, `unstable_retry` in error.tsx), React 19, Tailwind v4
(CSS-first), shadcn **base-nova** style on Base UI (`render` prop, not
`asChild`), React Query v5, Recharts 3 via the shadcn chart wrapper, zod 4,
sonner, next-themes. Read `node_modules/next/dist/docs/` before writing
Next-facing code — training-data conventions are stale (see AGENTS.md).

⚠️ **Base UI is not Radix, and the differences throw at runtime.** Most shadcn
snippets online are written against Radix; pasting them here compiles and then
crashes on interaction. Known traps:

- **Composition is `render={<X/>}`, never `asChild`.**
- **`DropdownMenuLabel` must be inside `DropdownMenuGroup`.** It is Base UI's
  `Menu.GroupLabel`, which calls `useMenuGroupRootContext()` at render and
  throws `"MenuGroupContext is missing"` without a group ancestor. Radix's
  equivalent works standalone. This shipped once and crashed every page from the
  header account menu — guarded now by `components/ui/dropdown-menu.test.ts`.
- **Menu content is portalled and not `keepMounted`**, so composition mistakes
  inside a menu do not surface until something opens it. A page that renders
  fine is not evidence its menus work.
- `Select`'s `onValueChange` hands back `string | null`, not `string`.

The general rule: if a primitive is named `XGroupY` or `XItem`, assume Base UI
requires the matching parent and check `node_modules/@base-ui/react/**` rather
than trusting a Radix example.

**Role gating — one source, two consumers.** The per-feature allowlists in
`lib/roles.ts` drive *both* the route's `requireRole(...)` and the sidebar's
visibility (`adminNav[].roles` → `navForRole(role)`), so what a role can see and
what it can open cannot drift. Changing access is a one-line edit there.

- **`requireRole` in `lib/dal.ts` is the boundary. Hiding is UX.** A hidden nav
  item still redirects if the URL is typed, and every API route still 403s.
  Never treat a hidden control as protection.
- **Components must never compare role literals** — ask `canAct(role, action)`
  or an allowlist. A component once used `role === "…" || role === "…"` in place
  of `USER_ACTION_ROLES.flag`; it agreed by coincidence and would have drifted
  silently. Enforced by `components/role-literals.test.ts`.
- `enabled: false` and `roles` are different gates: "coming in a later phase"
  (greyed, visible) versus "not yours" (hidden). Don't collapse them.

**Error boundaries:** a segment's `error.tsx` wraps that segment's *children*,
not its own `layout.tsx`. Anything thrown by the sidebar, header or a provider
escapes `(dashboard)/error.tsx` — `app/global-error.tsx` is the floor beneath
it, and is deliberately dependency-free (its own `<html>`, inline styles, no
imports) because whatever broke may be one of the things it would otherwise
import.

## 3. Roadmap (from the product PRD)

### Phase 1 — Foundation, RBAC, Analytics ✅ SHIPPED (branch `Control-Panel`)

Monorepo conversion; admin app scaffold; Supabase auth + two-layer RBAC;
layout shell (collapsible sidebar with the full IA, header with breadcrumbs /
search stub / role badge / theme toggle / profile menu); analytics dashboard
(6 metric cards with WoW trends, species breakdown, 30-day acquisition +
swipe-volume charts, skeletons, error boundaries, 60s auto-refetch).
Verified end-to-end: anonymous → redirect/401, `support` → 403,
`moderator` → data.

### Phase 2 — User & Content Moderation (IN PROGRESS)

- ✅ **User search & management table** — shipped (`8a05409`). Paginated and
  filterable, account detail route, suspend / ban / restore / flag with
  mandatory reasons. "Reset verification" and "force logout" were **dropped**:
  the latter is impossible server-side (`auth.admin.signOut` needs the target's
  own JWT). See `schema-notes.md`.
- ✅ **Audit logging** — shipped (`21d4211`). `public.admin_audit_logs` exists
  and `/audit` reads it.
- **Content & report moderation queue** — reads the app team's existing
  **`matching.pet_reports`** (13 live rows). The earlier plan to create
  `public.admin_reports` is withdrawn; see `reports-schema-proposal.md`, kept
  only as a superseded record.
- **Pet profile review**: universal attributes + dynamic `species_attributes`
  payload; approve / flag / delete with mandatory reason. Pet media lives in
  Supabase Storage (`pet-images` / `pet-videos`), **not** R2.
- UX: keyboard-first tables, confirmation dialogs with reason input,
  optimistic dismissals.

### Phase 3 — Verification Review Queues

- ✅ **Certificate queue** — shipped. `/verifications` over
  `pets.pet_certificates`, covering all three types (`vaccination`, `health`,
  `license`), not vaccination alone. Split-pane, zoom/pan document viewer for
  images and PDFs, `A`/`R` shortcuts, queue progression, approve/reject with a
  structured rejection reason and a mandatory audited reason.
- **No OCR exists in this system.** The original roadmap promised an
  "OCR-extract vs original" diff with confidence scores. Verified 2026-08-15:
  there are no extraction columns, no confidence scores and no OCR output table
  anywhere in the database. The fields shown are what the **owner typed at
  upload**, so the screen is a transcription check and says so. If an OCR
  pipeline lands later, this pane is where its output would go.
- **Documents are in Supabase Storage, not R2** (corrected 2026-08-15). The
  private `pet-certificates` bucket has existed since 2026-07-08 and
  `pets.pet_certificates.file_path` is populated; the panel's existing service
  client signs them. The earlier "R2 presigned URLs" line in this roadmap was
  never verified and produced a wrong ask to the app team — it is retracted.
- ⚠️ **Approving awards +500 trust** via the backend's
  `trust_on_certificate_verified` trigger, and the panel cannot reverse it.
  The confirmation says so in words.
- ❌ **KYC / government-ID queue — not buildable yet.**
  `identity.account_verifications` is empty, has **no document path column**
  (only a SHA-256 hash and a document type), and **no ID-number field to
  redact** — so there is nothing to display and nothing to mask. Digio appears
  nowhere in the database or this repo. Blocked on the backend team; tracked in
  the handoff.
- **Notifications are backend work.** The panel writes the status and the audit
  row; Celery/notification dispatch lives in a repo that does not exist here.

### Phase 3.5 — Settings & Taxonomy ✅ SHIPPED

- `/settings` manages `pets.species` and `pets.breeds` — add, rename, retire.
  Super-admin only. First panel surface that writes a backend-owned domain
  table, and the first that creates an admin-authored row.
- ⚠️ **No staging step**: the mobile app reads this taxonomy live from
  PostgREST, so an edit changes pet creation immediately.
- **Nothing is deletable** — `pets.pets` references both tables with NOT NULL,
  NO ACTION foreign keys, and breeds reference species the same way, so not
  even a zero-pet species can be dropped. Retirement is `status`.
- **Attribute schemas are not built**, and the tab says why: pet attributes are
  fixed columns and species-specific rules are compiled into the Flutter app
  (`pet_blood_group_catalog.dart`). Making it real is a mobile-app change —
  see `attribute-schema-proposal.md`.
- Deferred: CSV bulk breed import (no upload/parsing precedent in the panel,
  and 34 breeds don't warrant it yet).

### Phase 4 — Business Directory & Monetization

- **Directory CRUD**: vets/groomers/trainers/stores/photographers; license
  document review; status toggles (Active / Pending / Suspended / Featured).
- **Sponsored placements**: `featured_until` timestamps + `featured_rank`
  weights; Razorpay webhook reconciliation; per-business analytics (views,
  CTR, leads). PostGIS city/region filtering.
- ⚠️ **No `business_listings` / `sponsored_placements` tables exist yet.**

## 4. Where things are

| Thing | Location |
|---|---|
| Admin app | `apps/admin/` (dev: `npm run dev:admin` → :3001) |
| All user-facing copy + nav model | `apps/admin/src/config/admin.ts` (house rule: never hardcode copy in components; new phases flip `enabled` on their nav entry) |
| API contract (zod + types) | `apps/admin/src/lib/api-contract.ts` |
| RBAC boundary | `apps/admin/src/lib/dal.ts` (+ `src/proxy.ts` optimistic layer) |
| Schema-aware queries | `apps/admin/src/lib/analytics.ts` — the pattern for future feature adapters |
| Supabase client factories | `apps/admin/src/lib/supabase/{client,server,admin}.ts` (`admin.ts` is `server-only`, secret key, narrow grants) |
| Verified DB reality, security findings, test users | `docs/admin/schema-notes.md` |
| Pending SQL | `supabase/migrations/` (timeseries fn — needs rewrite to verified tables before applying) |
| Env | `apps/admin/.env.local` (gitignored; template `.env.example`) |
| Original Phase 1 implementation plan | `~/.claude/plans/objective-build-the-misty-flurry.md` (outside repo; superseded by this doc + schema-notes for ongoing reference) |

## 5. Working rules for agents

1. **Read `docs/admin/schema-notes.md` before any DB-touching work** — it is
   the verified source of truth (schemas, grants, security posture) and gets
   updated by introspection passes, not guesses.
2. **Respect the two-file schema-isolation rule** (§2). New features add
   their own adapter following `analytics.ts`'s shape: discriminated-union
   results, never throw, service-key reads stay within the granted surface.
3. **Aggregates only in analytics payloads — no PII ever.** Moderation
   features that must show PII gate it behind `requireRole` and never cache it.
4. **All admin API routes**: `requireRole(...)` first, 401/403 JSON via the
   `ApiError` shape, `force-dynamic`.
5. **Destructive admin actions** (Phase 2+): mandatory reason, confirmation
   dialog, audit-log write. No exceptions.
6. **Verify before claiming done**: `npm run typecheck && npm run lint` from
   the repo root; `npm run build:admin`; for auth-path changes, re-run the
   three-way RBAC check (anonymous / support / moderator) against a dev
   server.
7. **The landing app must not regress**: if a change touches shared root
   config, rebuild `apps/landing` and confirm output is unchanged.
8. **Database access from sessions is read-only by default.** Writes (grants,
   migrations, user changes) happen only with explicit human sign-off, and
   schema changes ship as files in `supabase/migrations/`.

## 6. Current blockers / asks (keep in sync with schema-notes)

- 🚨 **P0 security (STILL OPEN, backend team)**: RLS is disabled with zero
  policies on all 8 `identity` tables, so any signed-in user can read and
  write every other user's PII through PostgREST. The `anon` half was fixed
  2026-08-06 (`20260806000002`); the `authenticated` half needs owner-scoped
  policies only the mobile team can write. Re-confirmed unremediated
  2026-08-15. Details + advisor links in schema-notes §Security.
- **KYC queue is blocked on schema**: `identity.account_verifications` needs
  rows, a document pointer, and (if IDs are to be masked) a field holding the
  number. None exist today.
- **Status vocabulary conflict**: `pets.pet_certificates` uses `approved`
  (per its trigger, no CHECK constraint); the agreed vocabulary for
  `identity.account_verifications` is `pending`/`verified`/`rejected`. Pick one
  word and constrain both.
- **Badge rule undefined**: nothing updates `pets.pet_verification_levels`, so
  an approval moves trust but not the pet's badge.
- **`pets.pet_certificates` is readable by every signed-in user**
  (`USING (true)`) — backend-owned, see schema-notes §Security.
- `matching.pet_reports` has no home for **account-level or chat-message**
  reports — pets and posts only.
- Hosting: repoint the landing deploy's root directory to `apps/landing`;
  create the `apps/admin` project on `admin.meetmypets.app`.

Resolved: ~~`pet_likes` grant~~ (`20260806000001`), ~~audit-log table~~
(`20260806000003`), ~~reports table~~ (adopted `matching.pet_reports`,
2026-08-15), ~~timeseries migration~~ (`20260805000000`), ~~role-system
decision~~ (agreed on `app_metadata.role`; app team drops their booleans).
