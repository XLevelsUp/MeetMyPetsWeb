# Admin panel ↔ Supabase schema notes

Status: **VERIFIED 2026-08-05** against project `owfrnkafevdfzduuqnic`
(introspected over the REST/Auth admin APIs with the service key; the
Supabase MCP was unavailable in the build session).

All schema knowledge is deliberately confined to two files:

- `apps/admin/src/lib/dal.ts` — where admin roles are read from
- `apps/admin/src/lib/analytics.ts` — table/column names behind every metric

## Verification results

| # | Assumption | Result |
|---|-----------|--------|
| 1 | Roles at `app_metadata.role` | ✅ **Adopted and seeded.** No user had a role before 2026-08-05; two test users were created with roles (below). Production admins still need roles assigned. |
| 2 | New-style API keys (`sb_publishable_…` / `sb_secret_…`) | ✅ Confirmed — the project uses publishable/secret keys. |
| 3 | Asymmetric JWT signing (local `getClaims()`) | ⚠️ Unverified — needs the dashboard or MCP. Auth flow works either way; only proxy latency is affected. |
| 4–10 | Application tables (`profiles`, `pet_profiles`, `matches`, `chats`, `verifications`, `reports`, `swipes`) in `public` | ❌ **None exist.** The `public` schema exposes only an `rls_auto_enable` RPC. Auth is real (33 users incl. genuine signups), but the app data lives elsewhere — presumably the FastAPI backend's database or a non-exposed Postgres schema. |

## Consequence for the dashboard

RBAC works end-to-end (verified live: anonymous → 307/401, support → 403,
moderator → passes auth). Analytics queries fail with a clear
`query_failed` 500 ("Could not find the table 'public.pet_profiles'…")
and the UI renders its retry card — graceful, but **no metrics render until
one of these happens**:

1. The mobile-app/FastAPI tables are created in (or exposed to) this
   Supabase project's `public` schema, and `analytics.ts` TABLES constants
   are pointed at the real names; or
2. The admin API is repointed at the FastAPI backend once it exists — the
   contract in `api-contract.ts` was designed for exactly that swap; or
3. Product decides the Supabase project should own these tables, in which
   case write migrations (see `supabase/migrations/` for the pending
   analytics function) and seed data.

**Decision needed from the team: which of the three.**

## Test users (created 2026-08-05, passwords delivered in-session)

| Email | Role | Purpose |
|-------|------|---------|
| `admin.moderator.test@meetmypets.dev` | `moderator` | Can sign in + call analytics APIs |
| `admin.support.test@meetmypets.dev` | `support` | Signs in but gets 403 from analytics — proves the role allowlist |

Assign real admins with:

```js
supabase.auth.admin.updateUserById(userId, { app_metadata: { role: "super_admin" } })
```

(Users must sign out/in — or wait for token refresh — before the proxy
sees a changed role; the DAL sees it immediately.)

## Still pending

- Apply `supabase/migrations/20260805000000_admin_analytics_timeseries.sql`
  once the source tables exist (requires SQL access: MCP `execute_sql`,
  the dashboard SQL editor, or `supabase db push`).
- Verify JWT signing-key type (assumption #3).
- Rotate the secret key if it was ever exposed outside `.env.local`.
