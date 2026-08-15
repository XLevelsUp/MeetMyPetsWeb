# Admin Panel ↔ Mobile App: what the app team needs to know

**Audience:** the MeetMyPets mobile-app / FastAPI backend team.
**Purpose:** the admin panel now runs against **your** database and **your**
auth user pool. This document is the short version of what it does, what it
touches, and the handful of things we need from you so the two systems don't
break each other.

**Date:** 2026-08-15 (revised) · **Supabase project:** `owfrnkafevdfzduuqnic` ·
**Companion doc:** [`schema-notes.md`](./schema-notes.md) (verified DB reality).

> **Revised 2026-08-15 after your synchronization document.** We re-verified
> every claim in it against the live database and you were right on the
> substance. Three things changed here: we **withdrew the R2 request** (§3.4 —
> the documents were in Supabase Storage all along, our mistake), we
> **withdrew the reports-table proposal** in favour of your existing
> `matching.pet_reports` (§3.2), and we added the trust engine to the list of
> things we read (§2.5). Two asks got *smaller*; one new one is a two-line
> grant. The P0 in §3.1 is unchanged and still unremediated.

---

## TL;DR — the five things that matter most

1. **Suspending a user is a Supabase Auth ban.** Their mobile session stops
   refreshing and sign-in starts failing. **Your app must handle that error
   state gracefully** — see §2.1. This is the single most likely source of "the
   app is broken" reports that are actually working as designed.
2. **We never write your columns.** `identity.accounts.status`,
   `pets.pets.status` and `pets.pets.trust_score` stay yours. All moderation
   state lives in our own `public.admin_restrictions` table.
3. **`anon` access to the `identity` schema was revoked** on 2026-08-06 — it
   was a live PII leak (§2.4). The `authenticated` half is still open and
   **only you can fix it properly** (§3.1). This is the top ask, and as of
   2026-08-15 RLS is still disabled with zero policies on all 8 tables.
4. **We depend on a specific read surface** (grants + column names). Renaming a
   column in §5 breaks the panel silently. Please flag those changes.
5. **The panel now approves certificates, which awards +500 trust** through
   your own trigger (§3.4). Two of your tables also disagree on whether the
   approved status is `'approved'` or `'verified'`, and writing the wrong one
   silently fails to award trust — please settle it and add a CHECK constraint
   (§3.4b). The KYC queue can't be built until `account_verifications` has rows
   and a document pointer (§3.4c).
6. **The panel now edits your species and breed taxonomy** (§3.4d) — the first
   time it writes one of your domain tables, super-admin only, and **your app
   reads those tables live**. One question there needs an answer:
   **does the app filter `status = 'active'`?** If not, "retiring" a species
   does nothing for users while looking like it worked.

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
| Content Reports (`/reports`) | Triage queue over your `matching.pet_reports`; moves status only |
| Verifications (`/verifications`) | Certificate review over your `pets.pet_certificates` — document viewer, approve / reject. ⚠️ approving awards +500 trust (§3.4) |
| Trust Review (`/trust`) | The human review your ban screens promise. Pets restricted by *your* automated engine, ordered by the review date the owner was shown, with the event ledger and a restore (§3.4f) |
| Settings (`/settings`) | Species and breed taxonomy — add / rename / retire. Super-admin only. ⚠️ **your app reads this live** (§3.4d) |
| Audit log (`/audit`) | Every moderation action: who, what, when, and the mandatory reason |

**Coming**: owner KYC queue (blocked — §3.4c), business directory.

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

That is the complete list — **two tables**. We are not adding a third; the
report queue reads yours (§3.2).

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
3. `matching.pet_reports.status` **and nothing else on that row** — see §3.2.
   We asked for a column-scoped `UPDATE (status)` grant precisely so that
   "the panel never edits reporter-supplied fields" is enforced by Postgres
   rather than promised in a document.

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

### 2.5 The trust engine — we read it, we never write it

We've read your trust implementation and verified it against the live database
(thresholds in `pets.get_pet_trust_status`, deltas in `pets.trust_score_delta`,
ledger in `pets.trust_score_events`, ban windows set by
`pets.trust_status_on_score_change`).

**Our position: `pets.pets.trust_score` is yours.** The panel will surface the
score, its derived status, and the event ledger as **moderator intelligence** —
so a human reviewing a report can see that the reported pet is already at 40
points with three prior reports — but it will not write the column, and we have
not requested `UPDATE` on `pets.pets`. Your doc and our §2.3 agree on this, so
we're stating it explicitly rather than leaving it implied.

Two consequences we want on the record:

- **Automated trust bans and manual admin bans are independent.** A pet can be
  `temporary_banned` by score while its owner's account is untouched, and an
  account can be suspended by us while all its pets sit at 555. Neither system
  reads the other. The panel shows both and never conflates them.
- **Restoring an automated ban is not something we can do today.** Your
  `trust_status_on_score_change` trigger has an explicit restoration path
  (`trust_score = 555` clears `temporary_banned_at` / `temporary_ban_until`),
  and the comment there reads as though an admin is the intended actor — but
  `pets.adjust_pet_trust_score` currently grants `EXECUTE` to **neither**
  `service_role` nor `authenticated`, so only your triggers can move a score.
  **If you want moderators to be able to lift a trust ban, tell us which
  mechanism you'd prefer** (an RPC you expose and grant to `service_role` is
  our preference — score arithmetic stays entirely yours). Until then a
  trust-banned pet waits out its 7-day window and we'll show that as the reason.

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

### 3.2 ✅ Reports — proposal withdrawn, we need one grant

**You were right and our proposal is dead.** We had drafted
`public.admin_reports`; `matching.pet_reports` is live, has real rows, and a
second table would have fractured the data. We've adopted yours and marked the
proposal superseded. No sign-off needed, no 7 questions — please ignore that
document.

For the record on why we proposed it at all: when we introspected on
**2026-08-06** the table genuinely did not exist. Your earliest report row is
dated **2026-08-11**. Our notes were stale, not wrong — but this is exactly the
coordination gap §3.7 is about, and it cost a document.

**What we need — the panel cannot read a single report today.** The table
comment says *"moderators read and update status through `service_role`"*, but
that role holds **no grant on `matching.pet_reports` at all**, and no `USAGE`
on the `social` schema (roughly three quarters of the reports carry
`context_entity_type = 'post'`, so the queue can't show what was reported).

They are also arriving faster than they're being triaged — the pending count
rose from 13 to 15 during the hour we spent building this, and **every report
in the table is still `pending`**, i.e. nothing has ever been actioned. That is
the case for shipping the queue, not a criticism: until now there was no
surface on which anyone could have triaged them.

We are applying this ourselves as a grants-only migration — flagged here so it
isn't a surprise, and so you can object:

```sql
grant select on matching.pet_reports to service_role;
grant update (status) on matching.pet_reports to service_role;
grant usage on schema social to service_role;
grant select on social.posts, social.post_media to service_role;
grant select on pets.trust_score_events to service_role;
```

The `UPDATE` is deliberately **column-scoped to `status`**: Postgres itself
will reject any attempt by the panel to alter `reason`, `details`, or either
reporter id. We move reports through your existing vocabulary
(`pending → reviewed | actioned | dismissed`) and every transition writes an
audit row with a mandatory reason.

**One question:** you have both `reviewed` and `dismissed`. We're treating
`reviewed` as "a human looked, no action warranted, keep it on file" and
`dismissed` as "not a legitimate report". Tell us if you meant something else —
it's a two-line change to our copy, and getting it wrong makes your report
statistics mean the wrong thing.

### 3.3 Confirm the verification status enum (still open)

`identity.account_verifications` is **still empty** and still has **no CHECK
constraint** on `status` (it's a bare `varchar(50)`), so we're still assuming
pending rows use `status = 'pending'`. The dashboard's "Pending Verifications"
metric depends on it, and because the metric is a plain equality filter, a
different real value doesn't error — it silently renders **0**, which is the
worst kind of wrong.

Your doc proposes standardizing on `pending` / `verified` / `rejected` and then
adding the constraint. **We agree — please do exactly that.** It matches
`pending` as used in both `matching.pet_reports` and `pets.pet_certificates`,
so the platform ends up with one vocabulary instead of three. Once the
constraint exists we'll drop the assumption note from our adapter.

### 3.4 ✅ Certificate documents — request withdrawn, our error

**Please do not provision Cloudflare R2 credentials.** An earlier version of
this document asked for them. That ask was wrong and we're sorry for the noise
— if anyone already started on it, stop.

Your document is correct: the files are in the private Supabase Storage bucket
**`pet-certificates`**, and `pets.pet_certificates.file_path` is populated on
all 15 rows. The panel signs them with the service client it already has:

```ts
const { data } = await supabaseAdmin.storage
  .from("pet-certificates")
  .createSignedUrl(cert.file_path, 60);
```

No credentials, no FastAPI presign endpoint, no fallback needed.

**Where the bad ask came from,** since it's a process point worth one line: R2
was written into our Phase 3 roadmap before any of this introspection happened,
and we carried it forward without ever checking. The bucket has existed since
**2026-07-08** — a month before we wrote the ask. We should have verified.

**The certificate queue is now built** (2026-08-15) and we took the grants
ourselves, same grants-only boundary as before:

```sql
grant select on pets.pet_certificates to service_role;
grant update (status, reviewed_by, reviewed_at, remarks)
  on pets.pet_certificates to service_role;   -- column-scoped
grant select on pets.pet_verification_levels to service_role;
```

The `UPDATE` is scoped to the four review columns, so Postgres rejects any
attempt by the panel to alter `file_path` or anything the owner typed.

⚠️ **We are now writing `status = 'approved'`, which fires your
`trust_on_certificate_verified` trigger and awards +500.** We verified this in
a rolled-back transaction — a pet went 575 → 1075. We've accepted it because it
is *your* designed consequence of approval, not something to route around, and
the moderator's confirmation dialog states the +500 in words. Two guards: the
adapter refuses to re-decide anything already decided (approving a previously
rejected certificate would otherwise award a second +500), and the audit row
records `trustAwarded: true`. **If you'd rather approvals not move trust, say
so and we'll change it — but then the trigger needs to change too.**

### 3.4b New asks from building the certificate queue

Four things surfaced while wiring it up. None block what shipped; the first two
will bite someone if left.

**1. Your two verification tables disagree on the approved word.**
`pets.pet_certificates` uses **`'approved'`** — we know because your trigger
tests `IF NEW.status = 'approved'`. §3.3 above proposes standardising on
`pending`/`verified`/`rejected` for `account_verifications`. Those cannot both
be right. If anything ever writes `'verified'` to a certificate, **it will
silently fail to award trust** — no error, no constraint, just a pet that
should have +500 and doesn't. Please pick one word and **add a CHECK
constraint to `pet_certificates.status`**, which currently has none at all.
Until then our `lib/certificate-constants.ts` is the only written contract, and
a unit test pins it.

**2. Nothing updates `pets.pet_verification_levels`.** Your schema has exactly
two triggers and both are trust-related, so approving a certificate moves a
pet's score but **not its badge**. We did not guess at the rule, because the
existing data contradicts the obvious ones: level 2 appears as both `verified`
and `vaccination_verified`, and level 3 `fully_verified` has
`ownership_verified = false`. Please define how a level and its four booleans
should follow from approved certificates. We display the level read-only and
will wire the write when the rule exists.

**3. Every signed-in user can read every certificate.**
`pet_certificates` has the policy `"Users can view any pet certificates"
USING (true)` — certificate numbers, vet names and clinic names for all pets,
platform-wide. It looks unintended: the same table has correctly owner-scoped
INSERT/UPDATE/DELETE policies *and* a second, properly owner-scoped SELECT
policy that this permissive one makes redundant. The document files themselves
are safe (private bucket), so this is not a P0 — but it is probably a
one-line fix.

**4. Owner notifications are yours.** We write the status, the reviewer, the
timestamp and a structured reason into `remarks`; we don't send anything. If
you want owners told on approve/reject, trigger it off that column.

### 3.4c KYC queue — we can't build it yet

Your brief asks for a government-ID review queue with masked ID numbers. As the
schema stands there is nothing to build against:

- `identity.account_verifications` is **empty** (0 rows).
- It has **no document path or URL column** — only `document_sha256`, which is
  a hash, and `document_type` (`AADHAAR`, `PASSPORT`, …). There is no way to
  fetch the document a reviewer would look at.
- There is **no ID-number column**, so there is nothing to redact — the privacy
  requirement has no target.
- `Digio` appears nowhere in the database.

To make it buildable we'd need: rows, a storage pointer for the uploaded
document (mirroring `pet_certificates.file_path` would be ideal — same private
bucket pattern, same signing path), and a decision on whether the ID number is
stored at all. Tell us the shape and we'll build the queue the same way.

### 3.4d Taxonomy — the panel now writes `pets.species` and `pets.breeds`

**This is the first time the panel writes one of your domain tables.** Every
write before it went into our own `public.admin_*` tables or was a column-scoped
status update. Flagged prominently because it deserves your review.

```sql
grant select, insert, update on pets.species to service_role;
grant select, insert, update on pets.breeds  to service_role;
```

Gated to **super_admin only** — stricter than any moderation queue, because
this changes the pet-creation form for every user rather than acting on one
person's content. Every change is audited with a mandatory reason.

**No DELETE, and not merely out of caution.** We confirmed live that your FKs
already make deletion impossible: deleting `Dog` fails, and so does deleting
`Bird` — which has zero pets, because its own breeds reference it. A delete
button would work for some rows and not others depending on live FK state, so
there isn't one. Retirement is `status`.

**Three questions in [`taxonomy-schema-proposal.md`](./taxonomy-schema-proposal.md),
one of which matters more than the rest:**

> **Does your app filter `status = 'active'` when it loads species and breeds?**
>
> `status` has no CHECK constraint and every row is `'active'`, so we had to
> invent `'inactive'` for retirement. **If the app doesn't filter, retiring a
> species hides it from us and changes nothing for users** — an admin would
> believe they'd removed an option people can still pick. Please confirm, and
> add the CHECK constraint.

Also asked there: two unique indexes (`breeds (species_id, lower(name))` and
`species (lower(name))` — both verified to apply cleanly against current data,
since neither table constrains duplicates today), and a request **not** to add
`CASCADE` to the taxonomy foreign keys, which the original brief specified and
which would risk deleting user data on a taxonomy edit.

### 3.4e Attribute schemas — blocked on the app, not on us

The brief's headline feature was admin-defined per-species attribute schemas.
We didn't build it, and the reason is worth a paragraph rather than silence:
**it would have no consumer.** `pets.pets` has fixed columns, so there's nowhere
to store a dynamically-defined value, and your own comment on
`pets.pets.blood_group` says species-specific validation lives in
`pet_blood_group_catalog.dart` — compiled into the app, where a panel can't
reach. An admin would configure fields that never appear, which reads as a
panel bug.

[`attribute-schema-proposal.md`](./attribute-schema-proposal.md) sets out what
it would take: somewhere to store values, an app that renders its form from
data, and a contract. Blood group is the natural first field to migrate, since
it's already a per-species attribute with a per-species value list. We'll build
the editor whenever you're ready.

### 3.4f ✅ Your discovery-filter ask — answered, and a trust review queue

**Thank you for the reply document.** We've recorded what it settled in
[`app-team-reply-notes.md`](./app-team-reply-notes.md), re-verified against the
live database as you asked. Three things came out of it.

**1. Your `admin_restrictions` ask: yes, and it's live.** We did not grant the
table — `reason` is moderator free text and `created_by` names the admin,
neither of which belongs in a mobile client. Instead, migration
`20260816000001` adds a view with exactly what a discovery filter needs:

```sql
select target_type, target_id, kind
from public.active_moderation_targets;   -- granted to `authenticated`
```

Rows are already filtered to *currently active* (not lifted, not expired), so
you don't have to encode our semantics. Add columns whenever you need them —
just ask rather than reading the base table, which stays closed.

**2. We built the trust review queue.** Your §4 was right that the trust engine
would surprise us, but the thing that actually stopped us was narrower: your
migration footer documents restoring a pet with
`UPDATE pets.pets SET trust_score = 555`, and **`service_role` had no update
privilege on `pets.pets` at all** — so the documented path could not be run by
anyone but you. We've granted ourselves `update (trust_score)`, column-scoped,
so your trigger keeps sole ownership of the three lifecycle columns.

Why it was urgent: `Mano` has been temp-banned since 2026-08-12 with a review
date of **2026-08-19**, and your ban screen promised its owner a manual review.
`temporary_ban_until` is informational, so nothing was ever going to lift it.
`/trust` is now that review, sorted by the date you told the user.

**3. One gap we've opened, and can't close from here.** A manual restore writes
**no row** to `pets.trust_score_events` — your ledger is trigger-driven and
`adjust_pet_trust_score` grants EXECUTE to nobody, including `service_role`. So
after a restore, a pet's score no longer reconciles against its own history. We
record it in our audit log and the UI says the ledger is incomplete, but that's
a workaround.

**Ask:** either add a ledger reason for admin restores (`admin_restore`, delta
computed) and grant us the insert, or expose an RPC that does the update and the
ledger row together. We'd take either; the RPC is cleaner and keeps the score
arithmetic entirely yours.

**4. We now also write `trust_score = 0` — a moderator's permanent ban.** Same
column-scoped grant, the other end of your ladder. It pairs with a
`kind = 'banned'` row in our `admin_restrictions`, so the pet appears in
`active_moderation_targets` — **this is the first thing that will populate that
view, so your discovery filter now has data to act on.** Restoring lifts the
restriction as well as resetting the score.

**Ask — one line in your trigger.** `trust_status_on_score_change` stamps a
7-day review window for *anything* under 100:

```sql
IF NEW.trust_score < 100 AND NEW.temporary_banned_at IS NULL THEN
```

So a **permanently** banned pet gets a review date. Verified live: banning a
warning-band pet set `temporary_ban_until = now() + 7 days` while
`get_pet_trust_status` returned `permanently_banned`. A permanent ban has no
review date by definition, and we can't clear the column ourselves. Suggested:

```sql
IF NEW.trust_score > 0 AND NEW.trust_score < 100 AND NEW.temporary_banned_at IS NULL THEN
```

Our UI suppresses the date meanwhile, so nothing is broken — but the column is
currently lying, and anything else reading it will believe it.

**Two observations while we were in there**, both yours to decide on:

- **A trust ban hides a pet from nobody.** It stops the *owner* acting as that
  pet, but the pet stays in everyone else's discovery, its posts stay in feeds,
  and its matches are untouched. If that's intended, fine — but §4 of your doc
  reads as though a ban removes a pet from circulation, and it doesn't. The view
  in (1) is the mechanism if you want it to.
- **Your `<= 0` deviation is right and we copied it.** A pet at −400 falling
  through to `< 100` and being treated more leniently than one at 50 would have
  been a real bug. Noting it so you know our copy of the ladder matches, and that
  we pin every boundary in a test — if you move a threshold, tell us, because
  your app follows automatically and our panel will not.

### 3.5 Two role systems — agreed, with one caveat

- The panel reads admin roles from Supabase Auth `app_metadata.role`.
- Your `identity.accounts` has `is_platform_admin` and `is_platform_moderator`
  booleans (both still present, both defaulting to `false`).

These are **completely disconnected** — setting one does nothing to the other.
Your doc proposes dropping the booleans in favour of the Auth claim. **We
agree**, and we can confirm the panel reads neither column and never has, so
dropping them costs us nothing.

**One caveat before you write the migration:** our model has *three* roles —
`super_admin`, `moderator`, `support` — and two booleans can't encode that.
`support` in particular is a real role (it can view users but not act on them).
So the booleans aren't losing information the Auth claim can't hold; it's the
other direction that would have been lossy. Just don't let anything downstream
try to reconstruct a role from them on the way out.

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
- **New tables matter as much as changed ones.** The reports round-trip (§3.2)
  is the proof: you shipped `matching.pet_reports` on ~08-11, we were working
  from an 08-06 snapshot, and we spent a document designing a duplicate. A
  one-line heads-up when a moderatable table lands would have caught it. We'll
  do the same in the other direction — this doc is versioned and we'll re-verify
  before each phase rather than trusting our own notes.
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
| `pets.pets` | `id`, `name`, `species_id`, `breed_id`, `status`, `owner_account_id`, `created_at`, `deleted_at`, `profile_photo_url`, `trust_score`, `temporary_ban_until` |
| `pets.trust_score_events` | `target_pet_id`, `reason`, `delta`, `created_at` (moderator context) |
| `pets.pet_certificates` | `id`, `pet_id`, `certificate_type`, `certificate_number`, `issued_by`, `issued_at`, `expires_at`, `next_due_at`, `title`, `veterinarian`, `clinic_name`, `notes`, `status`, `reviewed_at`, `remarks`, `file_path`, `file_mime_type`, `created_at` |
| `pets.pet_verification_levels` | `pet_id`, `level`, `level_code`, `ownership_verified`, `vaccination_verified`, `health_verified`, `breeding_verified` (read-only badge display) |
| `matching.pet_reports` | `id`, `reporter_pet_id`, `reported_pet_id`, `reporter_account_id`, `reason`, `details`, `status`, `context_entity_type`, `context_entity_id`, `created_at` |
| `matching.matches` | `created_at` (counts only) |
| `matching.pet_likes` | `created_at` (counts only, via the timeseries function) |
| `chat.conversations` | `last_message_at`, `created_at` (counts only) |
| `social.posts` | `id`, `pet_id`, `caption`, `created_at`, `deleted_at` (only to show what a post-scoped report is about) |
| `social.post_media` | `post_id`, `storage_path`, `media_type` (thumbnail for a reported post) |

### Read (via the browser/anon key — public reference data)

| Table | Columns read |
|---|---|
| `pets.species` | `id`, `name` |
| `pets.breeds` | `id`, `name` |

(The `/settings` screen additionally reads `description`, `status`,
`created_at`, `updated_at` on both, through the **service** key — see §3.4d.)

### Storage buckets the panel reads

| Bucket | Used for |
|---|---|
| `pet-certificates` (private) | Certificate review — signed URLs from `pet_certificates.file_path`, 60s TTL |
| `post-media` | Thumbnail for a post-scoped report, via `post_media.storage_path` |

### Grants that must not be revoked

- `service_role`: `SELECT, INSERT, UPDATE` on `pets.species` and `pets.breeds`
  (no DELETE); full CRUD on `identity.*`; `SELECT` on `pets.pets`,
  `matching.matches`, `matching.pet_likes`, `chat.conversations`,
  `matching.pet_reports`, `pets.trust_score_events`, `pets.pet_certificates`,
  `pets.pet_verification_levels`, `social.posts`, `social.post_media`;
  `UPDATE (status)` on `matching.pet_reports`;
  `UPDATE (status, reviewed_by, reviewed_at, remarks)` on
  `pets.pet_certificates`; `USAGE` on schema `social`; `EXECUTE` on
  `public.admin_analytics_timeseries(int)`.
- `anon`: `SELECT` on `pets.species`, `pets.breeds`.
- Read access to the private `pet-certificates` storage bucket via the service
  key (short-lived signed URLs, minted per document).

### Values the panel filters on

- `pets.pets.status = 'active'` (active-pet counts and the default filter)
- `identity.accounts.status` — `'active'` / `'archived'` (no CHECK constraint
  exists; if you add a third value, tell us — our badge currently renders
  anything unrecognized as "Active")
- `matching.pet_reports.status` — `'pending'` / `'reviewed'` / `'actioned'` /
  `'dismissed'`, and `reason` across your seven values
- `pets.pet_certificates.status` — `'pending'` / `'approved'` / `'rejected'`,
  and `certificate_type` across `'vaccination'` / `'health'` / `'license'`.
  ⚠️ **No CHECK constraint exists on either** — `'approved'` is inferred from
  your trigger (§3.4b)
- `identity.account_verifications.status = 'pending'` ← **still assumed, needs
  confirming (§3.3)**

### Writes (the complete list)

| Target | Operation |
|---|---|
| `auth.users.banned_until` | via Auth admin API — suspend / ban / restore |
| `matching.pet_reports.status` | update — **column-scoped grant, nothing else on the row is writable** |
| `pets.pet_certificates` | update of `status`, `reviewed_by`, `reviewed_at`, `remarks` only — **column-scoped**. ⚠️ `status='approved'` fires your trust trigger (+500) |
| `pets.species`, `pets.breeds` | insert + update (`name`, `description`, `status`). **No delete** — your FKs forbid it anyway. ⚠️ read live by your app (§3.4d) |
| `pets.pets.trust_score` | update to **555 only** — column-scoped, the restore your migration footer documents. Your trigger clears the three lifecycle columns; we cannot write them (§3.4f) |
| `public.admin_restrictions` | insert (apply), update (lift) — ours |
| `public.admin_audit_logs` | insert only — ours, append-only |

Explicitly **not** written by the panel: `pets.pets.trust_score` (and every
other column of `pets.pets`), `identity.accounts.status`,
`pets.pet_verification_levels` (badge rule undefined — §3.4b), and every row in
`pets.trust_score_events`.

### Owned by the panel (please don't modify)

`public.admin_audit_logs`, `public.admin_restrictions`, and
`public.admin_analytics_timeseries(int)`. That's the whole list — the
previously proposed `public.admin_reports` **will not be created**.
