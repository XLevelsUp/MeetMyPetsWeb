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
- `pets.pets`, `matching.matches`, `chat.conversations` — SELECT only
- everything else (incl. `matching.pet_likes`, `pets.species`, all of
  `social`) — **no access**; `social` lacks even schema USAGE

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
| userAcquisition (chart) | `identity.accounts.created_at` | |
| swipeVolume (chart) | `matching.pet_likes.created_at` | ⛔ blocked — see below |

**One blocker remains:** `service_role` has no SELECT on
`matching.pet_likes`, so the timeseries endpoint returns its graceful
`query_failed` card until someone runs (dashboard SQL editor or a
migration):

```sql
grant select on matching.pet_likes to service_role;
```

## 🚨 Security findings (advisors + live probe — NOT fixed, read-only session)

1. **P0 — public PII exposure.** The `identity` schema is exposed to the
   Data API, 8 of its tables (`accounts`, `account_profiles`,
   `account_sessions`, `account_devices`, `account_settings`,
   `account_privacy_settings`, `account_email_history`,
   `account_verifications`) have **RLS disabled**, and `anon` holds **full
   CRUD grants** on them. Verified live: a bare publishable key +
   `Accept-Profile: identity` returns real `identity.accounts` rows.
   Anyone with the browser-bundled key can read (and write!) emails, phone
   numbers, sessions, device tokens, and profile lat/long. Matches the 8
   `rls_disabled_in_public` ERROR advisors. Fix ASAP: enable RLS and/or
   revoke `anon`/`authenticated` grants and/or remove `identity` from the
   exposed schemas ([remediation](https://supabase.com/docs/guides/database/database-linter?lint=0013_rls_disabled_in_public)).
2. **WARN ×63** — SECURITY DEFINER functions in the domain schemas are
   executable by `anon`/`authenticated` (e.g. `identity.purge_account_now`,
   `identity.archive_account`, `matching.undo_last_swipe`). Review EXECUTE
   grants ([lint](https://supabase.com/docs/guides/database/database-linter?lint=0099_role_can_execute_security_definer_function)).
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

- run the `pet_likes` GRANT above (unlocks the swipe chart);
- decide where "reports" will live when moderation ships;
- decide whether admin roles stay in `app_metadata.role` or should merge
  with `identity.accounts.is_platform_admin/_moderator` — today they are
  two disconnected role systems (`dal.ts` reads only the former);
- **fix the P0 anon exposure** (item 1 above) — independent of the admin
  panel but found during this pass.

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

## Still pending

- `GRANT SELECT ON matching.pet_likes TO service_role;` — unblocks the
  swipe-volume chart (until then the timeseries endpoint returns
  `query_failed` by design).
- Rewrite `supabase/migrations/20260805000000_admin_analytics_timeseries.sql`
  against the verified tables (`identity.accounts`, `matching.pet_likes` —
  it still references `public.profiles` / `public.swipes`), then apply.
  Deliberately NOT applied this pass.
- Remediate the P0 anon exposure of the `identity` schema (backend team).
- Confirm the `account_verifications.status = 'pending'` enum value once
  real verification rows exist.
- Rotate the secret key if it was ever exposed outside `.env.local`.
