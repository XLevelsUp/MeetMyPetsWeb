# Admin panel ↔ Supabase schema notes

Status: **RE-VERIFIED 2026-08-15** against project `owfrnkafevdfzduuqnic` via
the Supabase MCP (read-only SQL over `pg_catalog` / `information_schema`, plus
live PostgREST probes). Supersedes the 2026-08-05 REST-only introspection,
which could only see the `public` schema and wrongly concluded the app data
didn't exist.

> **2026-08-15 re-verification.** Triggered by the mobile team's
> synchronization document. Every claim in it was checked against the live
> database and **they were right**: `matching.pet_reports`, the `pets` trust
> engine, and the `pet-certificates` storage bucket all exist. Two corrections
> to this file are recorded inline below and marked **CORRECTED 08-15**:
>
> 1. **Reports** — the "no reports table exists" line was true on 08-06 (the
>    earliest report row is dated **08-11**), so this was staleness rather than
>    a mis-read. The panel now consumes `matching.pet_reports`; the
>    `public.admin_reports` proposal is withdrawn.
> 2. **Certificates were never in R2** — this was a real error. The private
>    `pet-certificates` bucket has existed since **2026-07-08**, a month before
>    we asked the app team for Cloudflare credentials. The R2 assumption was
>    inherited from the original roadmap and never verified. Ask retracted.

> **Sharing this with the mobile-app / FastAPI team?** Send them
> [app-team-handoff.md](app-team-handoff.md) instead — same facts, written for
> them, with the column-dependency appendix and the open asks.

All schema knowledge is deliberately confined to the feature adapters:

- `apps/admin/src/lib/dal.ts` — where admin roles are read from
- `apps/admin/src/lib/analytics.ts` — table/column names behind every metric
- `apps/admin/src/lib/users.ts`, `audit.ts` — moderation reads and writes

## Headline: the app data DOES live in this project

The mobile app / FastAPI backend keeps its tables in **five non-public
schemas**, all of which are exposed to the Data API (PostgREST
`db_schemas = public, graphql_public, identity, pets, matching, social, chat`
— confirmed via a PGRST106 probe):

| Schema | Tables (≈ rows) |
|--------|-----------------|
| `identity` | `accounts` (40), `account_profiles`, `account_settings`, `account_verifications` (0), `account_devices`, `account_sessions`, `account_privacy_settings`, `account_email_history`, `deleted_account_registry`, `deleted_pet_registry`, `pending_auth_deletions` |
| `pets` | `pets` (60), `pet_media`, `pet_activities`, `pet_goals`, `pet_traits`, `pet_verification_levels`, `pet_certificates` (15), **`trust_score_events`**, `share_links` + reference: `species`, `breeds`, `activities`, `goals`, `traits` |
| `matching` | `pet_likes` (1,492), `matches` (51), `pet_follows` (17), `pet_blocks` (13), **`pet_reports` (13)**, `undo_quota` (28) |
| `chat` | `conversations` (30), `messages`, `read_receipts`, `pet_presence` |
| `social` | `posts`, `post_likes`, `post_comments`, `post_media` |

Notable columns: `identity.accounts` has `auth_user_id`, `status`, `deleted_at`,
and its own `is_platform_admin` / `is_platform_moderator` booleans (a second,
FastAPI-side role system — see decision notes). `pets.pets` has `species_id`
(FK → `pets.species`), `status`, `deleted_at`, plus the trust columns
(`trust_score`, `trust_warning_acknowledged`, `temporary_banned_at`,
`temporary_ban_until`). `chat.conversations` really has `last_message_at`.
`matching.pet_likes` is the swipes table (`interaction_type`, `status`,
`created_at`).

⚠️ **`identity.accounts.status` and `pets.pets.status` have NO check
constraint** — the `active`/`archived` vocabulary is convention, not enforced.
Live values today are `active` (37) / `archived` (3) for accounts and
`active` (55) / `archived` (5) for pets. `restriction-badge.tsx` renders any
unrecognized value as "Active", so a third lifecycle value would display wrong.

**CORRECTED 08-15 — reports.** `matching.pet_reports` now exists (15 rows and
growing, earliest 2026-08-11; the 08-06 finding of "no reports table in any
schema" was accurate when made). **Every row is still `pending`** — nothing
has ever been triaged, because until Step 3 there was no surface to triage it
on. Pet-scoped: `reporter_pet_id`, `reported_pet_id`,
`reporter_account_id`, plus a polymorphic `context_entity_type` /
`context_entity_id` pair — a row with no context reports the **pet profile**,
one with `context_entity_type='post'` reports a single post. CHECK-constrained
`status` (`pending|reviewed|actioned|dismissed`) and `reason`
(`spam|harassment|inappropriate_content|fake_profile|animal_welfare|scam|other`).
Note the gap: **there is no home for reports against an account or a chat
message** — only pets and posts. There is still no `business_listings`.

## What the admin service key can actually read

PostgREST enforces table GRANTs even for `service_role` (it has
`BYPASSRLS`, but privileges still apply). The granted read surface is
narrow and looks deliberate:

- `identity.*` — full CRUD grants on all tables
- `pets.pets`, `matching.matches`, `matching.pet_likes`,
  `chat.conversations` — SELECT only (`pet_likes` granted 2026-08-06,
  migration `20260806000001`)
- `matching.pet_reports` — SELECT + **`UPDATE (status)` only**;
  `pets.trust_score_events`, `social.posts`, `social.post_media` — SELECT
  (all granted 2026-08-15, migration `20260815000000`)
- everything else (incl. `pets.species`, `pets.pet_certificates`) — **no
  access**

Reference tables `pets.species` / `pets.breeds` are anon-readable
(verified live) — the adapter uses the publishable-key client for species
names.

The `UPDATE (status)` grant is column-scoped on purpose: Postgres rejects any
attempt by the panel to alter a reporter-supplied field (`reason`, `details`,
either reporter id), so "the panel only moves the queue state" is a privilege,
not a convention. Same reasoning as the append-only grant on
`admin_audit_logs`.

~~⚠️ `pets.pet_certificates` has no `service_role` grant~~ — **resolved
2026-08-15** by migration `20260815000001`: SELECT plus a column-scoped
`UPDATE (status, reviewed_by, reviewed_at, remarks)`, and SELECT on
`pets.pet_verification_levels`.

🔓 **Certificate rows are readable by every signed-in user.**
`pets.pet_certificates` carries the policy
`"Users can view any pet certificates" USING (true)`, so any `authenticated`
caller can read every certificate on the platform — certificate numbers,
veterinarian and clinic names for every pet. Not identity-PII severity (the
document files themselves are behind a private bucket), but almost certainly
not intended: the same table has correctly owner-scoped policies for INSERT,
UPDATE and DELETE, and a *second* SELECT policy that is properly owner-scoped
— the permissive one makes that second policy redundant. Raised with the app
team; backend-owned.

## Storage buckets (verified 2026-08-15)

| Bucket | Public | Created | Panel use |
|--------|--------|---------|-----------|
| `pet-certificates` | **no** | 2026-07-08 | Step 4 — sign `pet_certificates.file_path`, 60s TTL |
| `post-media` | yes | 2026-07-14 | Thumbnail for a post-scoped report |
| `avatars`, `pet-images`, `pet-videos` | yes | — | not used yet |
| `chat-images` | no | 2026-07-14 | not used |

**CORRECTED 08-15:** certificate documents were never in Cloudflare R2. That
assumption came from the original Phase 3 roadmap and was never verified
against the database; it survived into an ask sent to the app team. All 15
`pet_certificates` rows have a populated `file_path`, and the service client
already in the panel can sign them — no external credentials are needed.

## The trust engine (`pets`) — read-only for the panel

Verified live 2026-08-15. Automated, per-**pet** (not per-account), and
entirely owned by the backend:

- `pets.pets.trust_score` — `integer default 555`; ledger of every change in
  `pets.trust_score_events` (`target_pet_id`, `actor_pet_id`, `reason`,
  `delta`, `event_ref`, `created_at`).
- Deltas (`pets.trust_score_delta`): like `+5`, follow `+10`, match `+30`
  (both pets), block `-80`, profile report `-80`, post report `-20`,
  certificate verified `+500`.
- Status (`pets.get_pet_trust_status`): `<= 0` permanently_banned, `< 100`
  temporary_banned, `<= 250` warning, else normal. Live spread today: 58
  normal, 1 warning, 1 temporary_banned, 0 permanent; range 5–600.
- `pets.trust_status_on_score_change` opens a **7-day** ban window on the first
  drop below 100, and treats a score reset to exactly `555` as full restoration.

**The panel never writes any of this.** It reads `trust_score` and the ledger
as moderator context only. Two facts that constrain future work:

- `pets.adjust_pet_trust_score` grants EXECUTE to **neither** `service_role`
  nor `authenticated` — only the backend's own triggers can move a score, so
  the panel *could not* lift an automated ban even if we decided it should.
  Raised with the app team; an RPC granted to `service_role` is the ask.
- Trust bans and admin bans are **independent vectors**. One account can own
  several pets, so a pet may be trust-banned while its owner is unrestricted,
  and vice versa. The panel must show both without conflating them.

## Verification results (updated)

| # | Assumption | Result |
|---|-----------|--------|
| 1 | Roles at `app_metadata.role` | ✅ Confirmed working; both test users present in `auth.users` with `raw_app_meta_data->>'role'` = `moderator` / `support`. `dal.ts` unchanged. |
| 2 | New-style API keys | ✅ Confirmed (`sb_publishable_…` present; legacy anon JWT also still enabled). |
| 3 | Asymmetric JWT signing | ✅ **Confirmed ES256 (EC P-256)** via `/auth/v1/.well-known/jwks.json`. `getClaims()` in `proxy.ts` verifies locally — no Auth round-trip per request. |
| 4–10 | Application tables in `public` | ❌ Corrected: they exist, but in the domain schemas above. `analytics.ts` repointed (see mapping below). |

## Metric → source mapping (as implemented in analytics.ts)

| Metric | Source | Notes |
|--------|--------|-------|
| totalUsers | `identity.accounts` | trend on `created_at` |
| activePets | `pets.pets` where `status='active'` | 55 of 58 today |
| totalMatches | `matching.matches` | |
| activeChats | `chat.conversations.last_message_at` ≥ 7d | column verified |
| pendingVerifications | `identity.account_verifications` where `status='pending'` | table still empty (re-checked 08-15) and still no CHECK constraint; `'pending'` remains an assumption that silently renders 0 if wrong |
| openReports | `matching.pet_reports` where `status='pending'` | **CORRECTED 08-15** — was a hardcoded zero; now a real count (13 today) with week-over-week trend via the existing `queueMetric` |
| speciesBreakdown | `pets.pets.species_id` + `pets.species` names | species via anon reference client |
| userAcquisition (chart) | `public.admin_analytics_timeseries` rpc → `identity.accounts.created_at` | |
| swipeVolume (chart) | `public.admin_analytics_timeseries` rpc → `matching.pet_likes.created_at` | ✅ unblocked 2026-08-06 |

**Timeseries is now server-side.** As of 2026-08-06 the charts call
`public.admin_analytics_timeseries(days)` (SECURITY INVOKER,
service_role-only EXECUTE) instead of bucketing bare timestamps in
TypeScript — `analytics.ts` `fetchAnalyticsTimeseries` was switched to
`supabase.rpc(...)` and validates the payload against the shared contract.
The function reads `identity.accounts` + `matching.pet_likes` (both
readable by the service key after the `pet_likes` grant). The swipe-volume
blocker is resolved; live-verified the rpc returns real data (e.g. 272
swipes on 2026-08-06).

## 🚨 Security findings (advisors + live probe)

1. **P0 — public PII exposure. `anon` half FIXED 2026-08-06; `authenticated`
   half STILL OPEN — re-confirmed unremediated 2026-08-15** (all 8 tables:
   `relrowsecurity = false`, zero policies). The mobile team's 2026-08-15 doc
   agrees the fix is owner-scoped RLS but assigns no owner or date. This is the
   oldest open item in the file. The `identity` schema is exposed to the Data
   API and 8 of its tables (`accounts`, `account_profiles`,
   `account_sessions`, `account_devices`, `account_settings`,
   `account_privacy_settings`, `account_email_history`,
   `account_verifications`) have **RLS disabled**. Originally both `anon`
   and `authenticated` held full CRUD, so a bare publishable key with no
   login could read/write emails, phones, sessions, device tokens, and
   profile lat/long (live-verified).

   - **Fixed (migration `20260806000002`):** all `anon` privileges on
     `identity` tables/functions/sequences + schema USAGE revoked, with
     `alter default privileges` to keep future objects closed. Re-verified
     live: `anon` now gets `42501 permission denied for schema identity`.
   - **Deliberately NOT changed — `authenticated`:** a read of the Supabase
     API logs showed the **mobile app (Dart/3.12) reads `identity.accounts`
     and `identity.account_profiles` directly through PostgREST as the
     `authenticated` role.** Revoking `authenticated` would break the live
     app, so it was left intact. With RLS still disabled, `authenticated`
     retains full cross-row access to identity PII — a real but separate
     exposure. **Correct fix (backend team): enable RLS on the 8 tables and
     add owner-scoped policies** so a signed-in user reads only rows it
     should. This needs the mobile team's access patterns and app-side
     testing; it is not safe to guess.
   ([remediation](https://supabase.com/docs/guides/database/database-linter?lint=0013_rls_disabled_in_public))
2. **WARN ×63** — SECURITY DEFINER functions in the domain schemas are
   executable by `anon`/`authenticated` (e.g. `identity.purge_account_now`,
   `identity.archive_account`, `matching.undo_last_swipe`). The `identity`
   ones had their `anon` EXECUTE revoked by migration `20260806000002`; the
   `authenticated` grants and all `matching`/`pets`/`social`/`chat`
   functions are untouched (mobile app may legitimately RPC them). Review
   remaining EXECUTE grants ([lint](https://supabase.com/docs/guides/database/database-linter?lint=0099_role_can_execute_security_definer_function)).
3. **WARN ×8** — functions with mutable `search_path`
   ([lint](https://supabase.com/docs/guides/database/database-linter?lint=0011_function_search_path_mutable)).
4. **WARN** — leaked-password protection disabled in Auth
   ([docs](https://supabase.com/docs/guides/auth/password-security)).
5. INFO — RLS enabled but zero policies on `identity.deleted_*`,
   `identity.pending_auth_deletions`, `matching.undo_quota`,
   `pets.share_links` (deny-all; fine if only the backend's direct
   connection touches them).

Performance advisors (nothing admin-blocking): 18 unindexed FKs
(`identity.*_account_id`, `pets.pets` species/breed FKs, …), 24
`auth_rls_initplan` warnings (`auth.uid()` not wrapped in `select` in
pets/matching policies), a few unused indexes, 3 multiple-permissive-policy
warnings, and Auth pinned to 10 DB connections
([lints index](https://supabase.com/docs/guides/database/database-linter)).

## Decision needed — RESOLVED (findings support option 1)

Of the three options from 2026-08-05, the findings support **option 1**:
the tables already exist in this Supabase project (just not in `public`),
they're already exposed to the Data API, and the service key already has a
curated read surface. `analytics.ts` has been repointed at the real names —
no FastAPI repoint (option 2) and no table-creation migrations (option 3)
are needed for reads. Residual asks for the backend team:

- ~~run the `pet_likes` GRANT (unlocks the swipe chart)~~ — done
  2026-08-06 (`20260806000001`);
- ~~**reports table** — column contract drafted in
  `reports-schema-proposal.md` (`public.admin_reports`)~~ — **WITHDRAWN
  2026-08-15.** `matching.pet_reports` already exists; a second table would
  have fractured the data. The proposal is marked SUPERSEDED and kept only as
  a record. Step 3 reads theirs, and `openReports` is now a real count;
- **roles** — the app team's 08-15 doc agrees to drop
  `identity.accounts.is_platform_admin/_moderator` in favour of
  `app_metadata.role`. Nothing in the panel reads those columns, so the drop
  costs us nothing. Caveat passed back: two booleans cannot encode our three
  roles (`support` has no boolean equivalent), so nothing downstream should
  try to reconstruct a role from them;
- **finish the P0 fix** — the `anon` half is done; the `authenticated` +
  RLS half (item 1 above) still needs owner-scoped policies from the team
  that owns the mobile access patterns.

## Test users (created 2026-08-05, passwords delivered in-session)

| Email | Role | Purpose |
|-------|------|---------|
| `admin.moderator.test@meetmypets.dev` | `moderator` | Can sign in + call analytics APIs |
| `admin.support.test@meetmypets.dev` | `support` | Signs in but gets 403 from analytics — proves the role allowlist |

Both re-verified in `auth.users` on 2026-08-06. Assign real admins with:

```js
supabase.auth.admin.updateUserById(userId, { app_metadata: { role: "super_admin" } })
```

(Users must sign out/in — or wait for token refresh — before the proxy
sees a changed role; the DAL sees it immediately.)

## Admin-owned tables (Step 1)

The panel owns two tables. They live in **`public`**, not a dedicated
`moderation` schema, because PostgREST only serves schemas on its exposed
list and adding one is a dashboard-only toggle — a new schema would be
unreachable from the app. Security is per-table, so nothing is lost.
`alter table … set schema` moves them later if the team exposes one.

| Table | Purpose | service_role grants |
|-------|---------|---------------------|
| `public.admin_audit_logs` | Append-only trail: actor (id/email/role snapshot), dot-namespaced `action`, target, mandatory `reason`, `metadata` jsonb. Read by `/audit` (Step 2) | **INSERT + SELECT only** |
| `public.admin_restrictions` | Suspend/ban/flag state for accounts and pets; active = `lifted_at is null and (expires_at is null or expires_at > now())` | SELECT + INSERT + **UPDATE** (no DELETE — restrictions are lifted, never removed) |

⚠️ **Supabase default privileges on `public` auto-grant new tables to `anon`,
`authenticated` AND `service_role`.** The migration explicitly revokes; without
that step both tables would have been world-readable with the browser key, and
"append-only" would have been a comment rather than a constraint. Verified live
after applying: anon gets `42501` on both, and under `set role service_role`
audit UPDATE/DELETE and restriction DELETE all raise `insufficient_privilege`,
the partial unique index rejects a second active restriction of a kind, and the
`kind` check constraint rejects unknown values.

### Moderation semantics (implemented in `lib/users.ts`)

- **Never writes `identity.accounts.status`.** That column is the backend's
  user-lifecycle vocabulary (`active`/`archived`); moderation state is ours.
- **Enforcement is the Supabase Auth ban** (`auth.admin.updateUserById` with
  `ban_duration`), which revokes refresh tokens and therefore locks the user
  out of the mobile app too. Suspend = finite hours, ban = 100 years,
  restore = `"none"`.
- **No "force logout" action exists.** `auth.admin.signOut(jwt)` needs the
  target user's JWT, which a server never holds, and supabase-js 2.112.0 has
  no server-side session-revocation call. Suspension is the lockout path;
  existing access tokens die within their TTL (~1h).
- Every action runs **enforcement → restriction row → audit row**. If the
  audit write fails the API returns 500 with an explicit "applied but
  unaudited" message rather than reporting success.

### Reading the audit log (Step 2)

`/audit` reads the same table through `listAuditLogs` in `lib/audit.ts`, with
filters for action, target type, an inclusive date range, and free text over
`actor_email` / `reason` (a uuid matches `target_id` or `actor_id` exactly).
Verified live 2026-08-06 against the real table under `set role service_role`:
the adapter's column list resolves, every filter and the ordering/pagination
window behave, and PostgREST accepts the `or=(col.ilike.*term*,…)` form the
adapter builds. The probe row was removed afterwards **as `postgres`** —
`service_role` cannot delete, which is also why e2e specs must never seed this
table.

The canonical action list lives in `lib/audit-actions.ts` rather than
`lib/audit.ts`: the adapter is `server-only`, but the filter dropdown is a
client component and needs the same list. Adding an action there requires a
matching label in `copy.audit.actionLabels`.

## Applied 2026-08-06 (Step 0 of the admin build)

- `20260806000001_admin_read_grant_pet_likes` — `grant select on
  matching.pet_likes to service_role` (unblocks the swipe chart).
- `20260806000002_p0_identity_revoke_anon` — revoked all `anon` access to
  the `identity` schema (tables, functions, sequences, USAGE) + default
  privileges. Verified: anon now `42501` on identity; `authenticated` and
  `service_role` unaffected.
- `20260805000000_admin_analytics_timeseries` — rewritten against
  `identity.accounts` / `matching.pet_likes` (was `public.profiles` /
  `public.swipes`) and applied; `analytics.ts` now calls it via `rpc`.
- `20260806000003_admin_moderation_tables` (Step 1) — `admin_audit_logs` +
  `admin_restrictions` with the revokes and constraints described above.

### The report queue (Step 3)

`/reports` reads `matching.pet_reports` through `listReports` in
`lib/reports.ts`, with filters for status, reason, scope (profile vs post) and
free text over `details` (a uuid matches the report / reported pet / reporter
pet exactly). It opens on `status=pending` rather than `all` — the screen is a
work queue, so it should show the work.

Because PostgREST cannot join across schemas, a page of reports fans out into
parallel lookups against `pets.pets` (name, owner, trust score),
`identity.accounts` (owner email) and `social.posts` (the reported post),
merged through Maps — the same shape `users.ts` uses for restrictions. Owner
emails are a second hop, since the owner id comes from the pet row.

Verified live 2026-08-15 against the real table with the real service key: the
adapter's exact column list returns `206` with a correct count header, the
`is.null` / `eq.post` scope filters and the `or=(id.eq…)` uuid search are
accepted by PostgREST, `limit`/`offset` pagination works, and all three
hydration schemas are reachable.

**Resolution writes only `status`**, then an audit row (`report.review` /
`report.action` / `report.dismiss`, `target_type = 'report'`). Resolving a
report deliberately does **not** flag the pet or restrict the owner — those
stay separate, individually-audited actions on `/users` with their own narrower
role checks, so a reviewer can always tell what a moderator actually did.

The panel reads `trust_score` alongside each report as context and never writes
it; the status thresholds are duplicated in `trustStatusFor` (unit-tested
against the SQL's boundaries) rather than fetched per row, which would be N+1.

### The certificate verification queue (Step 4)

`/verifications` reads `pets.pet_certificates` through `listCertificates` in
`lib/verifications.ts` — **15 rows, all `pending`**, across three types
(`vaccination` 6, `health` 5, `license` 4). Ordered **oldest first**, unlike
the report queue and audit log: a review queue should surface what has waited
longest. Cross-schema hydration to `pets.pets`, `identity.accounts` and
`pets.pet_verification_levels` via the usual Map-merge fan-out.

**There is no OCR anywhere in this database.** Verified across every schema:
zero columns matching `%confidence%`, `%ocr%` or `%extract%`, and no
extraction-output table. The fields the reviewer checks (`certificate_number`,
`issued_by`, `veterinarian`, `clinic_name`, …) are **typed by the owner at
upload** and sparsely filled (7–15 of 15 depending on the field). The UI says
so explicitly — this is a human transcription check, not an OCR diff, and
labelling it otherwise would imply a machine had already agreed.

**Status vocabulary is inferred, not constrained.** `pet_certificates.status`
has **no CHECK constraint**. `'approved'` is read off the backend's own trigger
(`trust_on_certificate_verified` fires `IF NEW.status = 'approved'`) and
`'rejected'` by symmetry. ⚠️ This **conflicts with the
`pending`/`verified`/`rejected` vocabulary the app team proposed** for
`identity.account_verifications` — writing `'verified'` here would silently
fail to award trust. `lib/certificate-constants.ts` is the contract until they
add the constraint; a unit test asserts the adapter writes `'approved'`.

⚠️ **Approving moves their trust engine.** The write fires
`trg_trust_on_certificate_verified` → `+500`. Verified live inside a
rolled-back transaction: a pet went **575 → 1075**. This is the one place a
panel action reaches into the trust engine, and it is deliberate — it is the
backend's designed consequence of approval. The confirmation dialog states the
+500 in words, the audit metadata records `trustAwarded: true`, and
`decideCertificate` refuses anything already decided so a repeat cannot award
it twice (approving a previously *rejected* certificate would otherwise).

**Documents.** `signDocument` in `lib/storage.ts` mints a 300s signed URL from
the private `pet-certificates` bucket, **one document at a time via
`/api/v1/admin/verifications/[id]/document`** — never embedded in the list
payload, where a short-lived URL would expire before the reviewer reached the
third row. `file_path` is deliberately absent from the client payload (asserted
by both a unit test and the e2e spec). Verified live: signing and fetching work
for `image/jpeg` and `application/pdf`, and unsigned access is refused.

**The panel does not write `pets.pet_verification_levels`.** No trigger
maintains it, and its data contradicts any obvious rule — level 2 appears as
both `verified` and `vaccination_verified`; level 3 `fully_verified` has
`ownership_verified = false`. Displayed read-only; the rule is an open ask.

**KYC is not built.** `identity.account_verifications` is empty, has **no
document path column at all** (only `document_sha256` + `document_type`), and
no ID-number field to redact — so there is nothing to queue and nothing to
mask. Blocked on the backend populating it; see the handoff.

### Trust review queue (Step 6)

`/trust` is the human half of the app's automated moderation. Read the app
repo's trust design before changing anything here — the notes below are the
short version, and [`app-team-reply-notes.md`](./app-team-reply-notes.md) has
the rest.

**Why it exists.** Their engine bans pets with no moderator in the loop, and the
ban screen tells the owner *"Our moderation team will manually review this pet.
Please visit again after 7 days to view the review result."* That review had
nowhere to happen. **`temporary_ban_until` is informational** — their own column
comment says `get_pet_trust_status` does not consult it — so a temporary ban is
lifted by an admin restoring the score **and by nothing else**. Without this
screen, "temporary" meant permanent. Live proof when it was built: `Mano`,
score 5, banned 2026-08-12, review date 2026-08-19, with no queue anywhere.

**⚠️ Read `get_pet_trust_status`, never `my_pet_trust_status`.** The latter is
the *app's* view of its own pet and deliberately reports `normal` for a warning
the owner has already dismissed. Worked example, live: `Mouzy` at 173 has
`trust_warning_acknowledged = true`, so the app sees `normal` while the true
state is `warning`. A queue built on the app's RPC would silently drop most of
its own population. We derive the status from the score instead
(`lib/trust-constants.ts`) rather than an RPC per row.

**⚠️ Restore is exactly 555.** Their `trust_status_on_score_change` trigger
branches on `IF NEW.trust_score = 555` — an equality test. In that branch it
clears `trust_warning_acknowledged`, `temporary_banned_at` and
`temporary_ban_until`. Any other value skips it and leaves a pet reading
unbanned while still carrying a ban window. There is no partial restoration, so
the contract has no score parameter. Verified live in a rolled-back
transaction: 5 → 555 moved status `temporary_banned` → `normal`, cleared both
ban timestamps and reset the acknowledgement.

**The grant is column-scoped to `trust_score` alone** (migration
`20260816000001`). The three lifecycle columns belong to the trigger, and their
footer warns that *"a manual reset that forgets one column leaves a pet banned
with no ban date"* — so Postgres refuses rather than us promising not to.
Verified: writing `trust_warning_acknowledged` raises `insufficient_privilege`.

**`pets.adjust_pet_trust_score` grants EXECUTE to nobody** — not `authenticated`,
not `anon`, not even `service_role`. So there is no audited partial adjustment
and no way to put a score back. **A restore is irreversible from the panel**,
which is why the e2e spec must never perform one.

**Gap we introduced, and told them about:** a manual restore writes **no row** to
`pets.trust_score_events`. Their ledger is trigger-driven and we hold no insert
grant, so a restored pet's score no longer reconciles against its own history.
Our `admin_audit_logs` carries the restore with `previousScore`, `newScore`,
`previousStatus` and `clearedBanWindow`, and the ledger UI says so rather than
letting the timeline look complete. Asked them for a ledger reason.

**Thresholds are duplicated** from `pets.get_pet_trust_status` into
`lib/trust-constants.ts` and pinned by `trust-constants.test.ts` at every
boundary (0/1/99/100/250/251/555). Their app never sees a number, so they can
move a threshold in one SQL line with no app release — and our copy would
silently disagree. That test is the tripwire. Note `<= 0` rather than `= 0` is
deliberate on their side: otherwise a pet at −400 falls through to `< 100` and
is treated *more* leniently than one at 50.

**Never leak the score to their surface.** They enforce this with a Flutter test
scanning for `trust_score`, `trustScore` and the string "Trust Score", because
*"telling someone they are 30 points from a ban turns a moderation signal into a
budget."* Showing it in an admin-only panel is the exception, not a precedent.

**Their ban ≠ our ban.** Theirs is per **pet** and automatic; ours is per **auth
user** and manual. One account can be trust-banned on one pet and fully active
on another, and can be admin-suspended while every pet reads `normal`. Never
render them in one column.

### Taxonomy management (Step 5)

`/settings` manages `pets.species` (6 rows) and `pets.breeds` (34) through
`lib/taxonomy.ts` — **the first adapter that writes a backend-owned domain
table, and the first that creates a row an admin authored.** Super-admin only
(`SETTINGS_ROLES`), stricter than any moderation queue, because an edit here
changes the pet-creation form for every user rather than acting on one person's
content.

⚠️ **Edits are live.** The mobile app reads `/rest/v1/species` and
`/rest/v1/breeds` **directly from PostgREST** (confirmed in the edge logs,
`Dart/3.12`). There is no cache layer, no FastAPI endpoint, and no deploy step
between a write here and a dropdown there. The page carries a standing warning
saying so.

**Nothing can be deleted, and the grant reflects that.** Verified live in
rolled-back transactions: deleting `Dog` (33 pets) raises
`foreign_key_violation`, and so does deleting `Bird` — which has **zero pets**,
because its own 4 breeds reference it. `pets.pets.species_id`/`breed_id` are
NOT NULL with NO ACTION FKs. So the migration withholds DELETE rather than
offering a button whose availability depends on live FK state. Retirement is
`status`.

**Three guards live in the adapter because the database has none:**

- `status` has **no CHECK constraint** and every live row is `'active'`, so
  `'inactive'` is our proposed value, not an observed one. Whether the mobile
  app even filters on it is an open ask — until it's answered, retirement is
  advisory rather than enforced.
- `species.name` is UNIQUE but **case-sensitively**, and `breeds` has **no
  uniqueness constraint at all**. The adapter enforces case-insensitive
  uniqueness — scoped to the species for breeds, since `"Unknown/Mixed"`
  legitimately appears once per species and a global check would reject the
  platform's own convention.
- Retiring a species or breed that **active** pets still use is refused, with
  the count. Archived pets don't block it; live ones do.

`updateBreed` never writes `species_id`: re-parenting a breed would silently
move every pet using it, so if that's ever wanted it should be its own
separately-audited action. A unit test pins this.

**Hidden blast radius of a rename:** `analytics.ts` buckets the species chart
**by name**, and `species-breakdown.tsx` uses the name as a React key — so two
species renamed alike would merge counts and collide keys. The case-insensitive
guard is what prevents it. Taxonomy mutations therefore invalidate `["users"]`
and `["analytics"]` as well as `["taxonomy"]`.

Two proposals went to the app team:
[`taxonomy-schema-proposal.md`](./taxonomy-schema-proposal.md) (status CHECK,
unique indexes, the missing `slug`/`icon_url`/`display_order`, and a request
*not* to add CASCADE) and
[`attribute-schema-proposal.md`](./attribute-schema-proposal.md) (why the
dynamic-schema feature is blocked on a Flutter change, not a panel one).

## Applied 2026-08-15 (Step 3 prerequisites)

- `20260815000000_admin_read_grants_reports` — `select` + column-scoped
  `update (status)` on `matching.pet_reports`; `usage` on schema `social`;
  `select` on `social.posts`, `social.post_media`, `pets.trust_score_events`.
  Grants only — no DDL on backend-owned tables. Verified under
  `set role service_role` that the status update succeeds and a `reason`
  update raises `insufficient_privilege`.
- `20260816000001_admin_trust_review` (Step 6) — column-scoped
  `update (trust_score)` on `pets.pets`, making the restore path their own
  migration footer documents actually executable (service_role previously had
  **no** update privilege on that table at all). Plus
  `public.active_moderation_targets`, a view over our `admin_restrictions`
  exposing only `target_type`/`target_id`/`kind` to `authenticated` — answering
  their ask for a discovery filter without handing a mobile client our
  moderators' free-text reasons. Verified rolled-back: restore works and clears
  the ban window; lifecycle-column writes and deletes are denied; the view reads
  as `authenticated` while both base tables stay closed.
- `20260816000000_admin_taxonomy_grants` (Step 5) — `select, insert, update` on
  `pets.species` and `pets.breeds`. **No DELETE** (the FKs make it useless — see
  the taxonomy section) and no DDL. Verified under `set role service_role` in a
  rolled-back transaction: insert and update succeed, `delete` raises
  `insufficient_privilege`.
- `20260815000001_admin_verification_grants` (Step 4) — `select` +
  column-scoped `update (status, reviewed_by, reviewed_at, remarks)` on
  `pets.pet_certificates`; `select` on `pets.pet_verification_levels`.
  Verified under `set role service_role` in a rolled-back transaction: the
  approve path works and awards +500 (575 → 1075), while `file_path` and
  `certificate_number` updates both raise `insufficient_privilege`.

## Still pending

- **`authenticated` + RLS half of the P0** (backend team) — enable RLS on
  the 8 `identity` tables with owner-scoped policies; see security finding 1.
  **Oldest open item; re-confirmed unremediated 2026-08-15.**
- Confirm the `account_verifications.status = 'pending'` enum value and add
  the CHECK constraint. ⚠️ The app team proposed `pending`/`verified`/`rejected`
  and we agreed — but `pets.pet_certificates` uses **`approved`**, per its
  trigger. Both tables need the same word or neither vocabulary is safe to
  assume. Not yet applied; `account_verifications` still empty.
- **Add a CHECK constraint to `pets.pet_certificates.status`** — it has none,
  so `'approved'` is inferred from a trigger body rather than declared.
- **Define the `pet_verification_levels` badge rule** — nothing updates it, so
  approving a certificate currently moves trust but not the pet's badge.
- **`pet_certificates` is world-readable to `authenticated`**
  (`USING (true)`) — see security findings.
- **KYC queue is impossible today**: `identity.account_verifications` is empty
  and has no document pointer or ID-number column.
- **Taxonomy** (see [`taxonomy-schema-proposal.md`](./taxonomy-schema-proposal.md)):
  confirm the retired `status` value + add a CHECK to `species`/`breeds`;
  confirm the mobile app filters `status = 'active'`; add unique indexes on
  `breeds (species_id, lower(name))` and `species (lower(name))` — both verified
  to apply cleanly against current data. Do **not** add CASCADE to the taxonomy
  FKs.
- **Attribute schemas** are blocked on a Flutter change, not a panel one — see
  [`attribute-schema-proposal.md`](./attribute-schema-proposal.md).
- **A ledger reason for admin trust restores** — our restore writes no row to
  `pets.trust_score_events`, so a restored score stops reconciling against its
  own history. Theirs to define; see the trust section.
- **Trust bans hide nothing from other users.** A banned pet still appears in
  everyone's discovery — the ban only stops its owner acting as it. The new
  `active_moderation_targets` view is the mechanism; the filter is theirs to add.
- **The app still does not handle our suspensions** — they confirmed there is no
  GoTrue banned-user handling anywhere in `lib/`.
- **Reports gap:** `matching.pet_reports` covers pets and posts only —
  account-level and chat-message reports have nowhere to go.
- Confirm the intended distinction between report statuses `reviewed` and
  `dismissed` (panel currently treats `reviewed` as "looked at, no action"
  and `dismissed` as "not legitimate").
- Ask the app team for an RPC if moderators should be able to lift an
  automated trust ban — `pets.adjust_pet_trust_score` grants EXECUTE to
  nobody, so it is currently impossible.
- Rotate the secret key if it was ever exposed outside `.env.local`.
- Remaining advisor cleanup (unindexed FKs, `auth_rls_initplan`,
  leaked-password protection) — non-blocking, backend-owned.
