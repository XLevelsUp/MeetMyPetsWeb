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

## 3. Roadmap (from the product PRD)

### Phase 1 — Foundation, RBAC, Analytics ✅ SHIPPED (branch `Control-Panel`)

Monorepo conversion; admin app scaffold; Supabase auth + two-layer RBAC;
layout shell (collapsible sidebar with the full IA, header with breadcrumbs /
search stub / role badge / theme toggle / profile menu); analytics dashboard
(6 metric cards with WoW trends, species breakdown, 30-day acquisition +
swipe-volume charts, skeletons, error boundaries, 60s auto-refetch).
Verified end-to-end: anonymous → redirect/401, `support` → 403,
`moderator` → data.

### Phase 2 — User & Content Moderation (NEXT)

- **User search & management table**: paginated/filterable (email, phone,
  user ID, KYC status); detail drawer with pet profiles, verification
  status, activity; actions: suspend, ban, reset verification, force logout.
- **Species-agnostic pet profile review**: universal attributes + dynamic
  `species_attributes` payload, media via Cloudflare R2 signed URLs;
  approve / flag / delete with mandatory reason.
- **Content & report moderation queue**: side-by-side reported content vs
  reporter; dismiss / remove content / ban offender. ⚠️ **No reports table
  exists yet in the database** — coordinate with the backend team on where
  it lands before building this queue.
- **Audit logging** for every admin action (admin UUID, action type, target
  entity, timestamp) — the `Audit Logs` nav entry exists disabled; an
  `admin_audit_logs` table must be created (none exists).
- UX: keyboard-first tables, confirmation dialogs with reason input,
  real-time urgent-report badges, optimistic dismissals.

### Phase 3 — Verification Review Queues

- **Vaccination certificate queue**: split-pane OCR-extract vs original
  document (R2 signed URL, zoom/pan); approve → pet badge; reject → reason
  dropdown + notification. `A`/`R` keyboard shortcuts; optimistic queue
  progression.
- **KYC / government-ID queue**: redacted view (mask ID numbers — privacy
  directive), Digio webhook fallbacks, approval triggers badge + notification.
- Integrates with backend Celery notification tasks; endpoints must generate
  short-lived R2 presigned URLs server-side.
- DB today: `identity.account_verifications` exists (empty);
  `pets.pet_verification_levels` / `pet_certificates` exist.

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

- `GRANT SELECT ON matching.pet_likes TO service_role;` — unlocks the swipe
  chart (backend team, one line in the SQL editor).
- **P0 security**: `identity` schema exposed to the Data API with RLS
  disabled and full `anon` CRUD grants — real PII readable/writable with the
  browser key. Backend team must remediate; details + advisor links in
  schema-notes §Security.
- Reports table + audit-log table don't exist → blocks Phase 2 queues.
- Role-system merge decision (`app_metadata.role` vs
  `identity.accounts.is_platform_*`).
- Timeseries migration rewrite + apply once grants exist.
- Hosting: repoint the landing deploy's root directory to `apps/landing`;
  create the `apps/admin` project on `admin.meetmypets.app`.
