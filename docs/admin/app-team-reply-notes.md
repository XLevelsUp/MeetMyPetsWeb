# App team's reply — what it settled

**Source:** `MOBILE APP → ADMIN PANEL.docx` in the `XLevelsUp/MeetMyPets` repo
root, internally dated **2026-08-14**. Written as the direct counterpart to our
[`app-team-handoff.md`](./app-team-handoff.md).

**Why this file exists:** their answers live in a `.docx` inside a private repo
we don't own. That is not something we can diff, link to from a code comment, or
rely on still being there. This is our durable copy of the parts that change
what we build.

**Every claim below was re-verified against the live database before being
recorded here** — at their own instruction: *"Migrations here have historically
drifted from the deployed schema — the live database is authoritative."*
Where we verified something they didn't state, it's marked.

---

## Answered — no longer open

| Our ask | Their answer | Verified |
|---|---|---|
| Certificates in R2? | *"There is no Cloudflare R2 in this project."* Bucket is `pet-certificates` | ✅ Matches. We'd already corrected this and retracted the ask |
| Which role system wins? | **"Use yours."** `is_platform_admin` / `is_platform_moderator` are written `false` at signup and read by nothing. `app_metadata.role` is the only live system | ✅ Both columns exist, all-false, no reader |
| Did our anon revoke break you? | *"caused us no breakage that we can find"* — every identity read goes through an authenticated session | ✅ Consistent with the API logs we checked before applying it |
| `account_verifications.status` vocabulary | *"'pending' is not a value we can vouch for — it is a value nobody has written yet."* Nothing writes the column at all | ✅ Table still empty, still no CHECK constraint |
| Is there a FastAPI backend? | *"there is no FastAPI backend in this repository"* | ✅ `backend/` is 4 files; the only live route is an internal purge endpoint guarded by a shared secret |

**Consequence for the specs we keep receiving:** several have assumed
`api.meetmypets.app`, Redis, Alembic and an `admin/` React app. None exist. Their
README describes all of them and is stale — they say so themselves. The
authoritative schema source is `backend/database/*.sql` (70 hand-applied files,
no timestamps, no ordering convention), **not** `supabase/migrations`.

---

## The P0 just became actionable — by them

They accept the identity RLS finding *"without argument"* and, crucially, gave
us the access pattern that was blocking policy design:

> *"a signed-in user legitimately reads other users' `account_profiles`. The feed
> shows the post author's owner's city… **The column actually needed
> cross-account is `city`.**"*

That is the missing piece from our §3.1 — we said we couldn't guess the policies
without knowing which reads are legitimate cross-account. Now we know: `city`,
and nothing else. **Still theirs to write**, and still unremediated (re-checked
2026-08-16: RLS disabled, zero policies, all 8 tables).

---

## Their asks of us — and where each stands

| Their ask | Status |
|---|---|
| Don't create `public.admin_reports` — reconcile with `matching.pet_reports` (**URGENT**) | ✅ **Done before they asked.** Proposal withdrawn 2026-08-15; `/reports` reads their table |
| Read access to `admin_restrictions` so the app can hide moderated pets from discovery | ✅ **Answered 2026-08-16** — see below |
| Expose the suspension reason to the app | ⏳ Open, needs design |
| Define the `account_verifications` status vocabulary | ⏳ Ours to call; they've deferred to us |
| Confirm they may drop `is_platform_admin` / `is_platform_moderator` | ✅ Yes — we read neither |
| Tell them before renaming anything in our §5 appendix | ✅ Agreed |

### What we gave them for the discovery filter

Not the table — a view. `public.admin_restrictions.reason` is moderator free
text and `created_by` identifies the admin; neither belongs in a mobile client.
Migration `20260816000001` adds:

```sql
create or replace view public.active_moderation_targets as
  select target_type, target_id, kind
  from public.admin_restrictions
  where lifted_at is null and (expires_at is null or expires_at > now());
grant select on public.active_moderation_targets to authenticated;
```

Verified live under `set role authenticated`: the view is readable, and both
`admin_restrictions` and `admin_audit_logs` remain denied.

---

## Things they told us that we would not have found on our own

**1. The app does not handle our bans.** *"there is no handling anywhere in
`lib/` for a GoTrue banned-user error or a refresh-token failure."* Our top ask
in the handoff — that a suspended user should see a clear message — is
**confirmed unmet**. A suspended user currently gets a generic auth/network
failure.

**2. Their ban screens are not our bans.** `permanent_ban_screen.dart` and
`temporary_ban_screen.dart` are driven by the trust score and are *"unrelated to
`auth.users.banned_until`"*. A user we suspend never reaches them. Two systems,
similar names, different subjects — never render them in one column.

**3. A coordinated block campaign is an abuse vector.** Blocking costs the
blocked pet 80 points, so *"a coordinated block campaign is a live abuse vector
against the automated ban thresholds."* Worth a filter on the trust queue if it
ever shows up in the ledger.

**4. Some state is genuinely unqueryable.** Notification read-state and
human-user likes/follows live in SharedPreferences on the device; the feed
ranking seed is in memory. *"Any admin metric claiming to show it would be
inventing it."* Good constraint to remember when someone asks for an engagement
dashboard.

**5. Purged accounts hard-delete.** Our `admin_restrictions` bare uuids dangle
by design from that moment — which we already knew and documented, but it's good
that both sides agree it's intentional rather than a bug.

---

## Still open, on them

- **RLS + owner-scoped policies on the 8 `identity` tables.** Now unblocked by
  their own `city` answer.
- **Handle the GoTrue banned-user state** in the app.
- **A ledger reason for admin trust restores** — see
  [`schema-notes.md`](./schema-notes.md) §trust. Our restore writes no row to
  `pets.trust_score_events`, so a restored pet's score no longer reconciles
  against its own history.
- **Do trust bans hide a pet from discovery?** Today: no. A banned pet still
  appears in everyone else's feed; the ban only stops the *owner* acting as that
  pet. Our new view is the mechanism for fixing it, but the filter is theirs to
  add.
