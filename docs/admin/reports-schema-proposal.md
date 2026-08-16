# Proposal: `public.admin_reports` — the content-report table

> # ⛔ SUPERSEDED — DO NOT IMPLEMENT
>
> **Withdrawn 2026-08-15. No sign-off needed; please ignore the checklist in §7.**
>
> `matching.pet_reports` **already exists** and is live — 15 rows and climbing
> as of 2026-08-15, RLS enabled, an insert-only policy for `authenticated`, statuses
> `pending | reviewed | actioned | dismissed`, and a table comment that reads
> *"moderators read and update status through service_role."* Creating
> `public.admin_reports` alongside it would have fractured reporting data across
> two tables. **The admin panel consumes `matching.pet_reports` instead.**
>
> **Why this document existed:** when the database was introspected on
> **2026-08-06**, the table genuinely did not exist in any schema — that
> verification was correct at the time. The mobile team shipped it shortly
> after; the earliest report row is dated **2026-08-11**. This was staleness,
> not a mis-read, but it still cost a document — see
> [`app-team-handoff.md`](./app-team-handoff.md) §3.7 for the coordination fix.
>
> **Kept, not deleted,** because it records why the decision went the other way,
> and because §3's target-type analysis (`account` / `pet` / `post` / `message`)
> remains the open question: `matching.pet_reports` is pet-scoped with a
> polymorphic `context_entity_type`, so reports against **accounts** and
> **chat messages** still have no home. Revisit this document if that gap needs
> filling — do not revive it as written.
>
> **Current reality:** [`schema-notes.md`](./schema-notes.md) ·
> **Adopted contract:** [`app-team-handoff.md`](./app-team-handoff.md) §3.2

**Status:** ~~DRAFT — awaiting backend sign-off~~ → **SUPERSEDED**. Everything
below is preserved verbatim as a historical record.

**Audience:** MeetMyPets backend team.
**Author:** admin-panel work (Control-Panel branch).
**Date:** 2026-08-07.
**Project:** Supabase `owfrnkafevdfzduuqnic`.

---

## 1. Why this table, and why now

- The admin dashboard's **"Open Reports"** metric is currently a hardcoded
  zero. Introspection on 2026-08-06 confirmed **no reports/moderation-report
  table exists in any schema** (`identity`, `pets`, `matching`, `chat`,
  `social`, or `public`).
- The next admin feature (Step 3) is the **moderation report queue** — the
  screen where a moderator triages user-filed reports and resolves them.
- When the mobile app ships its "Report this profile / post / message" flow,
  those reports need a destination.

One table serves both writers: FastAPI **inserts** reports filed by end users;
the admin panel **reads** the queue and **updates** resolution state. Building
two tables (one per writer) would just create a reconciliation problem.

## 2. Placement and ownership

**`public.admin_reports`.**

- **Why `public` and not a `reports`/`moderation` schema:** PostgREST only
  serves schemas on its exposed list
  (`public, graphql_public, identity, pets, matching, social, chat`), and
  adding a schema is a manual Supabase-dashboard toggle with no
  migration/MCP-safe equivalent. A table in an unexposed schema is invisible to
  both supabase-js and PostgREST. Security is enforced **per table** (grants +
  RLS), so nothing is lost by using `public`. This mirrors the decision already
  documented for `admin_audit_logs` / `admin_restrictions` in
  `docs/admin/schema-notes.md`. If we later want the namespace, a single
  `alter table public.admin_reports set schema …` moves it once the schema is
  exposed.
- **Ownership split:**
  - Panel owns the table definition and the **resolution columns**
    (`status`, `claimed_by`, `resolved_by`, `resolved_at`, `resolution_reason`).
  - FastAPI owns **insertion** of user-filed rows and the **reporter-supplied
    columns** (`reporter_account_id`, `target_*`, `category`, `details`).
  - Neither side edits the other's columns. The panel never rewrites what a
    reporter submitted; FastAPI never sets resolution state.

## 3. Proposed DDL (please red-line)

```sql
create table public.admin_reports (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  -- Reporter. Bare uuid -> identity.accounts.id (no FK; see §3 note).
  -- NULL means the report was opened from the admin panel, not by a user.
  reporter_account_id uuid,

  -- What was reported. target_id is a bare uuid whose meaning depends on
  -- target_type. All four referents use uuid primary keys (verified):
  --   account -> identity.accounts.id
  --   pet     -> pets.pets.id
  --   post    -> social.posts.id
  --   message -> chat.messages.id
  target_type text not null check (target_type in ('account','pet','post','message')),
  target_id uuid not null,

  category text not null
    check (category in ('spam','abuse','fake_profile','animal_welfare','other')),
  details text,  -- reporter's free text; nullable

  -- Resolution lifecycle. Panel-owned.
  status text not null default 'open'
    check (status in ('open','in_review','dismissed','actioned')),
  claimed_by uuid,          -- admin auth.users.id currently working it
  resolved_by uuid,         -- admin auth.users.id who closed it
  resolved_at timestamptz,
  resolution_reason text    -- required by the panel when moving to a terminal state
);

-- The queue: "open reports, newest first" and status-tab filtering.
create index admin_reports_status_created_idx
  on public.admin_reports (status, created_at desc);

-- Repeat-offender lookups: "every report against this pet/account".
create index admin_reports_target_idx
  on public.admin_reports (target_type, target_id);

-- Reporter history, only for user-filed rows.
create index admin_reports_reporter_idx
  on public.admin_reports (reporter_account_id)
  where reporter_account_id is not null;
```

**No foreign keys into FastAPI-owned tables** (`identity`, `pets`, `social`,
`chat`) — deliberately, and consistent with `admin_restrictions`:

- It keeps your migrations and row deletions independent of ours. A hard FK
  would make deleting an account or post depend on our table's constraints.
- **Reports intentionally outlive their targets.** If a reported account is
  deleted, the report row remains with its bare `target_id` — that's the
  desired audit behaviour, not an orphan to clean up. (See §7 on GDPR.)

## 4. Grants and the write path

The migration (once approved) will set grants explicitly, because **Supabase's
default privileges on `public` auto-grant every new table to `anon`,
`authenticated`, AND `service_role`** — we hit exactly this on
`admin_audit_logs`, where `service_role` came out of `create table` holding
`DELETE` despite a narrower intended grant. So:

```sql
revoke all on public.admin_reports from anon, authenticated;
revoke all on public.admin_reports from service_role;   -- reset the default grant
grant select, insert, update on public.admin_reports to service_role;  -- no DELETE
-- Reports are resolved, never deleted, so the trail survives.

-- FUTURE (needs your input, §7): once the backend's write identity is known,
-- e.g.  grant insert, select on public.admin_reports to <fastapi_role>;
```

**We need to know how FastAPI will write.** Today the mobile app reaches
Postgres through PostgREST as the `authenticated` role (confirmed from API
logs), while server-side jobs can use the service key. Which will file reports?

- **(a) Service key** (bypasses RLS) — simplest; no RLS policy needed; the row
  is trusted server-side. Recommended if reports are filed by your backend, not
  directly by the mobile client.
- **(b) A dedicated Postgres role** for the FastAPI service — cleanest
  least-privilege; we'd grant it `insert, select` only.
- **(c) PostgREST as `authenticated`** (mobile client inserts directly) — then
  we must add an RLS **insert policy** (e.g. `reporter_account_id` must equal
  the caller's account, `status` must be `'open'`, resolution columns must be
  null) and enable RLS. More surface area; only choose this if the client
  genuinely inserts without a backend hop.

## 5. Insert contract for FastAPI

A user-filed report must populate exactly:

| column | value |
|--------|-------|
| `reporter_account_id` | the reporting user's `identity.accounts.id` |
| `target_type` | one of `account` \| `pet` \| `post` \| `message` |
| `target_id` | the reported entity's uuid (matching `target_type`) |
| `category` | one of `spam` \| `abuse` \| `fake_profile` \| `animal_welfare` \| `other` |
| `details` | optional free text |

Leave everything else to defaults (`id`, `created_at`, `updated_at`, `status`
defaults to `open`; all resolution columns null).

**What the panel guarantees in return:**

- It only ever moves `status` forward: `open → in_review → (dismissed | actioned)`.
  It never reopens or deletes a report, and never edits reporter-supplied
  columns.
- Every status transition is written to `public.admin_audit_logs` (the same
  audit trail already live for suspend/ban/flag), with the acting admin, a
  mandatory reason, and the report id — so resolutions are fully accountable.
- `updated_at` is bumped on each transition.

## 6. Duplicate reports

**Recommendation: allow duplicates — no unique constraint.** Ten users
reporting the same abusive pet is ten signals, not one error; the queue groups
by `(target_type, target_id)` for triage and shows the count. A unique
constraint on `(reporter_account_id, target_type, target_id)` would only make
sense if you want "one report per user per target" enforced at the DB — flagged
for your call in §7.

## 7. Sign-off checklist (please answer)

1. **Categories** — is `('spam','abuse','fake_profile','animal_welfare','other')`
   the right initial set? This is a product decision; adding values later is a
   cheap `check` change but coordinating enum values across both codebases is
   easier done once.
2. **Write path** — which of §4 (a)/(b)/(c)? If (b), what role name? If (c), we
   design the RLS insert policy together.
3. **Source column** — do you want an explicit
   `source text check in ('mobile','panel')` instead of inferring panel-origin
   from `reporter_account_id is null`? Explicit is clearer if reports might ever
   be filed by other backend systems.
4. **Duplicates** — allow (recommended, §6) or enforce one-per-user-per-target?
5. **Notifications** — should resolving a report notify the reporter (e.g. via
   your Celery/notification pipeline)? If so, is that triggered by a DB change
   (you watch `status`) or should the panel call an endpoint? The panel does not
   send notifications today.
6. **GDPR / retention** — a report referencing a since-deleted account keeps the
   bare `target_id` (and possibly `reporter_account_id`) after the account is
   gone. Is retaining these uuids in the moderation record acceptable under your
   data-deletion policy, or should a delete-account flow also scrub/anonymise
   matching reports? (We can add a scrub hook if needed.)
7. **`message` targets** — reported chat messages: is `chat.messages.id` stable
   and safe to reference this way, given messages can be edited/deleted
   (`chat.messages` has `edited_at` / `deleted_at`)? A report on a since-deleted
   message would still be reviewable by id if you retain the row.

## 8. What happens after sign-off

1. We add the migration (`supabase/migrations/…_admin_reports.sql`) with the
   agreed DDL + grants, apply it via MCP, and verify with a live anon probe
   (must return `42501`) and a `has_table_privilege` check that `service_role`
   has no `DELETE`.
2. We build the queue at `/reports` (list + status tabs + claim/dismiss/action
   with mandatory reason + audit), plus a "report from panel" action so the
   queue is exercisable before mobile ships its report flow.
3. The dashboard's **Open Reports** metric flips from hardcoded zero to a real
   `count(*) where status = 'open'`.
4. When you're ready to file reports from FastAPI, you insert per §5 and they
   appear in the queue immediately.

---

*Reference: the placement, grant, and no-FK decisions here follow the patterns
already shipped and documented in `docs/admin/schema-notes.md`
(`admin_audit_logs`, `admin_restrictions`).*
