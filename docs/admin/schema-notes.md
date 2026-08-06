# Admin panel ↔ Supabase schema notes

Status: **VERIFIED 2026-08-06** against project `owfrnkafevdfzduuqnic` via the
Supabase MCP (read-only SQL over `pg_catalog` / `information_schema`, plus
live PostgREST probes). Supersedes the 2026-08-05 REST-only introspection,
which could only see the `public` schema and wrongly concluded the app data
didn't exist.

All schema knowledge is deliberately confined to two files:

- `apps/admin/src/lib/dal.ts` — where admin roles are read from
- `apps/admin/src/lib/analytics.ts` — table/column names behind every metric

## Headline: the app data DOES live in this project

The mobile app / FastAPI backend keeps its tables in **five non-public
schemas**, all of which are exposed to the Data API (PostgREST
`db_schemas = public, graphql_public, identity, pets, matching, social, chat`
— confirmed via a PGRST106 probe):

| Schema | Tables (≈ rows) |
|--------|-----------------|
| `identity` | `accounts` (36), `account_profiles` (17), `account_settings` (5), `account_verifications` (0), `account_devices`, `account_sessions`, `account_privacy_settings`, `account_email_history`, `deleted_account_registry`, `deleted_pet_registry`, `pending_auth_deletions` |
| `pets` | `pets` (58), `pet_media` (106), `pet_activities` (84), `pet_goals` (47), `pet_traits` (52), `pet_verification_levels` (21), `pet_certificates`, `share_links` + reference: `species`, `breeds`, `activities`, `goals`, `traits` |
| `matching` | `pet_likes` (≈1,169), `matches` (50), `pet_follows` (11), `pet_blocks` (0), `undo_quota` (21) |
| `chat` | `conversations` (30), `messages` (≈237), `read_receipts` (183), `pet_presence` (41) |
| `social` | `posts` (≈104), `post_likes` (65), `post_comments`, `post_media` |

Notable columns: `identity.accounts` has `auth_user_id`, `status`
(active/archived), `deleted_at`, and its own `is_platform_admin` /
`is_platform_moderator` booleans (a second, FastAPI-side role system —
see decision notes). `pets.pets` has `species_id` (FK → `pets.species`),
`status` (active/archived), `deleted_at`. `chat.conversations` really has
`last_message_at`. `matching.pet_likes` is the swipes table
(`interaction_type`, `status`, `created_at`). **No reports/moderation table
exists in any schema**, and there is no `business_listings` either.

## What the admin service key can actually read

PostgREST enforces table GRANTs even for `service_role` (it has
`BYPASSRLS`, but privileges still apply). The granted read surface is
narrow and looks deliberate:

- `identity.*` — full CRUD grants on all tables
- `pets.pets`, `matching.matches`, `matching.pet_likes`,
  `chat.conversations` — SELECT only (`pet_likes` granted 2026-08-06,
  migration `20260806000001`)
- everything else (incl. `pets.species`, all of `social`) — **no access**;
  `social` lacks even schema USAGE

Reference tables `pets.species` / `pets.breeds` are anon-readable
(verified live) — the adapter uses the publishable-key client for species
names.

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
| pendingVerifications | `identity.account_verifications` where `status='pending'` | table empty today; `'pending'` is an assumed enum value — recheck on first real row |
| openReports | — | no table exists; hardcoded true-zero until the feature lands |
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
   half OPEN (backend team).** The `identity` schema is exposed to the Data
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
- **reports table** — column contract drafted for the backend team in
  [`reports-schema-proposal.md`](./reports-schema-proposal.md)
  (`public.admin_reports`, jointly written by the panel and FastAPI).
  Awaiting sign-off before the Step 3 migration; the panel's `openReports`
  metric stays a hardcoded zero until it lands;
- decide whether admin roles stay in `app_metadata.role` or should merge
  with `identity.accounts.is_platform_admin/_moderator` — today they are
  two disconnected role systems (`dal.ts` reads only the former);
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

## Still pending

- **`authenticated` + RLS half of the P0** (backend team) — enable RLS on
  the 8 `identity` tables with owner-scoped policies; see security finding 1.
- Confirm the `account_verifications.status = 'pending'` enum value once
  real verification rows exist.
- Rotate the secret key if it was ever exposed outside `.env.local`.
- Remaining advisor cleanup (unindexed FKs, `auth_rls_initplan`,
  leaked-password protection) — non-blocking, backend-owned.
