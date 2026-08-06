# Admin Panel ↔ Mobile App: what the app team needs to know

**Audience:** the MeetMyPets mobile-app / FastAPI backend team.
**Purpose:** the admin panel now runs against **your** database and **your**
auth user pool. This document is the short version of what it does, what it
touches, and the handful of things we need from you so the two systems don't
break each other.

**Date:** 2026-08-07 · **Supabase project:** `owfrnkafevdfzduuqnic` ·
**Companion docs:** [`schema-notes.md`](./schema-notes.md) (verified DB
reality), [`reports-schema-proposal.md`](./reports-schema-proposal.md)
(awaiting your sign-off).

---

## TL;DR — the five things that matter most

1. **Suspending a user is a Supabase Auth ban.** Their mobile session stops
   refreshing and sign-in starts failing. **Your app must handle that error
   state gracefully** — see §2.1. This is the single most likely source of "the
   app is broken" reports that are actually working as designed.
2. **We never write your columns.** `identity.accounts.status` and
   `pets.pets.status` stay yours. All moderation state lives in our own
   `public.admin_restrictions` table.
3. **`anon` access to the `identity` schema was revoked** on 2026-08-06 — it
   was a live PII leak (§2.4). The `authenticated` half is still open and
   **only you can fix it properly** (§3.1). This is the top ask.
4. **We depend on a specific read surface** (grants + column names). Renaming a
   column in §5 breaks the panel silently. Please flag those changes.
5. **Four decisions are blocked on you** — reports schema, verification enum,
   R2 access, role reconciliation (§3).

---

## 1. What the admin panel is

A server-rendered Next.js app (`apps/admin`, dev port `3001`, destined for
`admin.meetmypets.app`) used by moderators and founders. It runs against the
**same Supabase project and the same Auth user pool** as the mobile app — it is
not a separate backend.

**Live today:**

| Surface | What it does |
|---|---|
| Analytics dashboard | Platform counts and 30-day trends (users, pets, matches, chats, verifications, swipes) — aggregates only, no PII |
| Users & Pets (`/users`) | Search/filter accounts and pet profiles; account detail view; suspend / ban / restore accounts; flag / unflag pet profiles |
| Audit log (`/audit`) | Every moderation action: who, what, when, and the mandatory reason |

**Coming** (blocked or queued): report queue, verification queues (vaccination
certificates + KYC), business directory.

**Access model:** three admin roles stored in Supabase Auth `app_metadata.role`
— `super_admin`, `moderator`, `support`. Regular app users have no role and are
signed straight back out if they somehow reach the admin origin.

---

## 2. Shared surfaces — facts you need to know

### 2.1 Auth is shared, and moderation acts on it ⚠️

Suspend and ban are implemented as **Supabase Auth bans**
(`auth.admin.updateUserById` with `ban_duration`, which sets `banned_until` on
the auth user). We chose this deliberately: it's the only mechanism that
actually locks a bad actor out of the *mobile app*, not just the admin panel.

**What your app will observe:**

- **Refresh tokens stop working immediately.** The user's session dies as soon
  as their current access token expires — **up to ~1 hour**, not instantly.
- **Sign-in fails** with GoTrue's banned-user error.
- **Restore** clears it (`ban_duration: "none"`) and sign-in works again.

**What we need from your app:** handle the banned/refresh-failure state as a
real, expected condition — a clear "your account has been suspended" screen
rather than an infinite spinner, a crash, or a generic "network error". Please
don't treat it as a bug to be retried around.

> There is deliberately **no "force logout"** feature. `auth.admin.signOut()`
> requires the target user's own JWT, which a server never holds, and
> supabase-js exposes no server-side session revocation. Suspension *is* the
> lockout path. Shortening the JWT expiry (project-wide Auth setting) would
> tighten that ~1h window — your call, since it affects mobile refresh
> frequency.

### 2.2 Admin-owned tables (in `public`)

| Table | Purpose |
|---|---|
| `public.admin_audit_logs` | Append-only trail of every admin action |
| `public.admin_restrictions` | Suspend / ban / flag state for accounts and pets |
| `public.admin_reports` | **Proposed** — see the schema proposal, awaiting your sign-off |

These are **ours to maintain** — please don't drop or alter them. They live in
`public` rather than a dedicated schema for a boring reason: PostgREST only
serves schemas on its exposed list, and adding one is a manual dashboard
toggle, so a table in an unexposed schema is invisible to the API.

**They contain bare uuids, not foreign keys**, pointing at your tables
(`identity.accounts.id`, `pets.pets.id`). That's intentional — it keeps your
migrations and deletions independent of our constraints, and lets moderation
records outlive the rows they describe.

**You are welcome to read `admin_restrictions`** if you want to enforce
moderation inside the app — for example, excluding flagged pets from discovery,
or hiding a suspended user's content. A restriction is **active** when:

```sql
lifted_at is null and (expires_at is null or expires_at > now())
```

`kind` is one of `suspended` | `banned` | `flagged`; `target_type` is
`account` | `pet`. Tell us if you want a read grant for your role — right now
only `service_role` can read it.

### 2.3 The vocabulary boundary (important)

**The panel never writes `identity.accounts.status` or `pets.pets.status`.**

Those columns are your user-lifecycle vocabulary (`active` / `archived`), and
overloading them with moderation meaning would corrupt your data model. A
suspended user still shows `status = 'active'` in your table — their suspension
lives in `admin_restrictions` and in their auth `banned_until`. If you'd prefer
a different arrangement, that's a conversation, not something we'll change
unilaterally.

The panel's only writes anywhere are:

1. `auth.users.banned_until`, via the Auth admin API (suspend/ban/restore).
2. Inserts/updates into our own `admin_restrictions` and `admin_audit_logs`.

Everything else the panel does is **read-only** against your schemas.

### 2.4 Security change already applied

On **2026-08-06** we revoked all `anon` (unauthenticated) access to the
`identity` schema — tables, functions, sequences, and schema `USAGE`.

**Why:** the schema was exposed to the Data API with RLS disabled and `anon`
holding full CRUD. We verified live that the *browser publishable key alone,
with no login*, could read `identity.accounts` — emails, phone numbers — and
`identity.account_profiles`, including latitude/longitude. That key ships
inside your mobile bundle.

**Impact on you:** none that we could find. We scanned the Supabase API logs
first and confirmed that all real mobile traffic to `identity` is
**authenticated**, not anonymous. If you have any code path that reads identity
without a logged-in session, it would now receive `42501 permission denied` —
please tell us and we'll work out the right fix together.

**Still open, and it's yours:** the `authenticated` role retains **full
cross-row CRUD on all identity PII**, because RLS is still disabled on those 8
tables. See §3.1.

---

## 3. What we need from you (prioritized)

### 3.1 🚨 P0 — Enable RLS on the `identity` tables

Any signed-in user can currently read *and write* **every other user's**
account row via PostgREST: emails, phone numbers, device tokens, session
records, and profile lat/long. The `anon` half is fixed; this half is not.

**Why we haven't done it:** the correct fix is RLS with owner-scoped policies,
and writing those requires knowing the mobile app's real access patterns — for
instance, whether a user legitimately needs to read *other* users'
`account_profiles` (for match cards, chat headers, etc.) and exactly which
columns. Guessing would either break the app or leave a hole.

**The 8 tables:** `accounts`, `account_profiles`, `account_settings`,
`account_privacy_settings`, `account_devices`, `account_sessions`,
`account_email_history`, `account_verifications`.

Happy to pair on the policies — we have the introspection and the traffic
analysis, you have the access patterns.

### 3.2 Answer the reports schema proposal

[`reports-schema-proposal.md`](./reports-schema-proposal.md) has a 7-question
sign-off checklist. The important one is **how FastAPI will write** (service
key vs a dedicated Postgres role vs PostgREST-as-`authenticated` with an RLS
insert policy) — it determines whether the migration needs a policy at all.

**Blocks:** the moderation report queue, and the dashboard's "Open Reports"
metric, which is a hardcoded zero until the table exists.

### 3.3 Confirm the verification status enum

`identity.account_verifications` is empty, so we've had to *assume* that
pending rows use `status = 'pending'`. The dashboard's "Pending Verifications"
metric and the upcoming verification queue both depend on it. Please confirm
the actual vocabulary (and the values for approved/rejected).

### 3.4 Certificate documents in R2

The vaccination-certificate review queue needs to display the uploaded
document. The panel has no Cloudflare R2 credentials. Either:

- **(a)** give the panel read credentials so it can generate short-lived
  presigned URLs server-side, or
- **(b)** expose a FastAPI endpoint that returns a presigned URL for a given
  certificate id (we'd prefer this if you want to keep R2 keys in one place).

We'll build the queue with a graceful "document preview unavailable" fallback
so it ships either way — but reviewers can't actually approve certificates
without seeing them.

### 3.5 Decide: two role systems currently coexist

- The panel reads admin roles from Supabase Auth `app_metadata.role`.
- Your `identity.accounts` has `is_platform_admin` and `is_platform_moderator`
  booleans.

These are **completely disconnected** today — setting one does nothing to the
other. Before either side builds more on top of its own, let's pick one as the
source of truth (or define how they sync).

### 3.6 Supabase hygiene (advisor findings on your schemas)

Not blocking us, but worth your queue:

- **The default-privileges trap:** Supabase auto-grants every new table in
  `public` to `anon`, `authenticated` **and** `service_role`. We got bitten by
  this — a table came out of `CREATE TABLE` with grants we hadn't written.
  Always `revoke` explicitly and verify with `has_table_privilege`.
- **SECURITY DEFINER functions executable by `anon`/`authenticated`** across
  `matching`, `pets`, `social`, `chat` — including destructive ones like
  `purge_account_now` and `archive_account` (we revoked `anon`'s EXECUTE on the
  `identity` ones only; the rest are untouched because the app may legitimately
  call them).
- **8 functions with a mutable `search_path`**.
- **Leaked-password protection is disabled** in Auth.
- Performance: 18 unindexed foreign keys, and ~24 RLS policies calling
  `auth.uid()` per-row instead of `(select auth.uid())`.

### 3.7 How we'd like to coordinate

- [`schema-notes.md`](./schema-notes.md) is the **ground-truth record** of what
  the panel believes about the database, re-verified on each introspection
  pass. If something there is wrong, that's a bug worth telling us about.
- **Please flag changes to anything in §5 before deploying them.** Renaming a
  column we read breaks the panel silently — the query just starts returning an
  error to a moderator.
- If the admin API is ever repointed at `api.meetmypets.app`, the panel's typed
  contracts (`apps/admin/src/lib/*-contract.ts`) are the response shapes FastAPI
  would need to honour. Nothing else in the app knows those shapes, so the swap
  is contained.

---

## 4. Things that are *not* asks (just so you're not surprised)

- The panel's analytics deliberately expose **aggregates only** — no user ids
  or emails ever reach the dashboard payloads.
- Moderation screens **do** show PII (email, phone, city) to authorized admin
  roles. That's the job; it's gated by role checks on every request and never
  cached.
- Every destructive action requires a typed reason of at least 10 characters
  and writes an audit row. If the audit write fails, the API returns an error
  saying the action was applied but unaudited — we never silently lose the
  trail.
- Audit rows and restriction rows are **not deletable**, even by the service
  key. That's enforced by grants, not convention.

---

## 5. Appendix — exact columns the panel depends on

Renaming or dropping any of these breaks the admin panel. Adding columns is
always safe.

### Read (via `service_role`)

| Table | Columns read |
|---|---|
| `identity.accounts` | `id`, `auth_user_id`, `email`, `phone_country_code`, `phone_number`, `display_name`, `status`, `created_at`, `last_activity_at`, `last_login_at`, `email_verified`, `phone_verified`, `deleted_at` |
| `identity.account_profiles` | `account_id`, `name`, `bio`, `city`, `state`, `country`, `gender`, `avatar_url` |
| `identity.account_verifications` | `id`, `account_id`, `verification_type`, `status`, `created_at`, `verified_at` |
| `pets.pets` | `id`, `name`, `species_id`, `breed_id`, `status`, `owner_account_id`, `created_at`, `deleted_at`, `profile_photo_url` |
| `matching.matches` | `created_at` (counts only) |
| `matching.pet_likes` | `created_at` (counts only, via the timeseries function) |
| `chat.conversations` | `last_message_at`, `created_at` (counts only) |

### Read (via the browser/anon key — public reference data)

| Table | Columns read |
|---|---|
| `pets.species` | `id`, `name` |
| `pets.breeds` | `id`, `name` |

### Grants that must not be revoked

- `service_role`: full CRUD on `identity.*`; `SELECT` on `pets.pets`,
  `matching.matches`, `matching.pet_likes`, `chat.conversations`;
  `EXECUTE` on `public.admin_analytics_timeseries(int)`.
- `anon`: `SELECT` on `pets.species`, `pets.breeds`.

### Values the panel filters on

- `pets.pets.status = 'active'` (active-pet counts and the default filter)
- `identity.accounts.status` — `'active'` / `'archived'`
- `identity.account_verifications.status = 'pending'` ← **assumed, needs
  confirming (§3.3)**

### Writes (the complete list)

| Target | Operation |
|---|---|
| `auth.users.banned_until` | via Auth admin API — suspend / ban / restore |
| `public.admin_restrictions` | insert (apply), update (lift) — ours |
| `public.admin_audit_logs` | insert only — ours, append-only |

### Owned by the panel (please don't modify)

`public.admin_audit_logs`, `public.admin_restrictions`,
`public.admin_analytics_timeseries(int)`, and — pending sign-off —
`public.admin_reports`.
