# Admin panel ↔ Supabase schema notes

Status: **ASSUMPTIONS — not yet verified against the live project.**

The Supabase MCP server for project `owfrnkafevdfzduuqnic` was not
authenticated while the admin panel was built, so the data layer was written
against the assumptions below. All schema knowledge is deliberately confined
to two files so verification is a two-file change:

- `apps/admin/src/lib/dal.ts` — where admin roles are read from
- `apps/admin/src/lib/analytics.ts` — table/column names behind every metric

## How to verify (once, in an interactive session)

1. Run `claude` in a terminal, then `/mcp` → select `supabase` → Authenticate.
2. Ask Claude to list tables/columns and reconcile them with this document,
   then update the two files above and flip the checkboxes here.

## Assumption register

| # | Assumption | Used by | Verified? |
|---|-----------|---------|-----------|
| 1 | Admin roles are stored as a single string at `auth.users.raw_app_meta_data.role` (`super_admin` \| `moderator` \| `support`). Never `user_metadata` — that is user-editable. | `dal.ts`, `proxy.ts` | ☐ |
| 2 | API keys use the new publishable/secret style (`sb_publishable_…` / `sb_secret_…`). If the project still uses legacy `anon`/`service_role` JWTs, only `.env` values change — code is key-style agnostic. | env | ☐ |
| 3 | JWT signing uses asymmetric keys, so `auth.getClaims()` verifies locally in the proxy. If legacy HS256, `getClaims` makes a network round-trip per request (works, slower). | `proxy.ts` | ☐ |
| 4 | `profiles` table: one row per user, `created_at timestamptz`. | `analytics.ts` (totalUsers, acquisition series) | ☐ |
| 5 | `pet_profiles` table: `species text`, `created_at`, active pets discernible (assumed `deleted_at is null` or `is_active bool`). | `analytics.ts` (activePets, species breakdown) | ☐ |
| 6 | `matches` table: `created_at`. | `analytics.ts` (totalMatches) | ☐ |
| 7 | `chats` (or `conversations`) table: activity discernible via `last_message_at` (assumed) — "active" = message in the last 7 days. | `analytics.ts` (activeChats) | ☐ |
| 8 | `verifications` table: `status text` with a `'pending'`-like value, `created_at`. | `analytics.ts` (pendingVerifications) | ☐ |
| 9 | `reports` table: `status text` with an `'open'`-like value, `created_at`. | `analytics.ts` (openReports) | ☐ |
| 10 | `swipes` table: one row per swipe, `created_at`. | `analytics.ts` (swipe volume series) | ☐ |

## Also to do during verification

- Create two test users with roles set via
  `supabase.auth.admin.updateUserById(id, { app_metadata: { role: "moderator" } })`
  (one `moderator`, one `support`) for the RBAC verification pass.
- Apply the timeseries SQL function migration (see
  `supabase/migrations/`) with
  `REVOKE EXECUTE … FROM PUBLIC, anon, authenticated` — until then the
  analytics adapter uses its TS-side bucketing fallback.
