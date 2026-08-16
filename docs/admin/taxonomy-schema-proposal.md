# Proposal: taxonomy schema gaps on `pets.species` / `pets.breeds`

**Status:** OPEN — awaiting the app team.
**Audience:** MeetMyPets mobile-app / FastAPI backend team.
**Date:** 2026-08-16 · **Project:** Supabase `owfrnkafevdfzduuqnic`.

The admin panel now manages species and breeds (`/settings`). Building it
surfaced five things the panel **cannot** fix, because they are DDL on your
tables and we hold to grants-only. None of them block what shipped; the first
two are the ones that will bite someone.

---

## 1. What the panel does today

`grant select, insert, update on pets.species / pets.breeds to service_role`
(migration `20260816000000`). **No DELETE** — see §3, it would be pointless.

Super-admin only, every change audited, and the panel refuses to retire a
species or breed that active pets still use.

---

## 2. `status` has no CHECK constraint, and we had to invent a value

Both tables carry `status varchar` with **no constraint**, and **every one of
the 40 live rows is `'active'`** — so nothing in the schema or the data told us
what "retired" should be called. The panel writes **`'inactive'`**.

That is a guess. Worse, it is a guess with a silent failure mode:

> **Does the mobile app filter on `status` when it loads species and breeds?**
>
> If it does not, retiring a species hides it from the admin panel and changes
> nothing in the app — an admin would believe they had removed an option that
> users can still pick.

**Asks:**
- Confirm the retired value (`'inactive'`, or tell us yours) and **add a CHECK
  constraint** to both tables.
- Confirm the app filters `status = 'active'` on both reads. If it doesn't,
  either add the filter or tell us and we'll relabel the panel's control as
  purely advisory.

This is the same class of problem as `pet_certificates.status`, where
`'approved'` had to be read off a trigger body. Three tables now, three
unconstrained status columns, and at least two different vocabularies
(`active/inactive`, `pending/approved/rejected`).

---

## 3. Nothing is deletable — not even unused species

Verified live, in rolled-back transactions:

| Attempt | Result |
|---|---|
| Delete `Dog` (33 pets, 12 breeds) | `foreign_key_violation` |
| Delete `Bird` (**0 pets**, 4 breeds) | `foreign_key_violation` — its own breeds hold it |

`pets.pets.species_id` and `breed_id` are **NOT NULL** with plain (NO ACTION)
foreign keys, and `breeds.species_id` likewise. So there is no species in the
database that can be deleted without first deleting its breeds, and no breed in
use that can be deleted at all.

**We think this is correct** and are not asking you to change it — a pet
whose species vanished would be unrepresentable. We are recording it because
the original brief specified `CASCADE on delete`, and adding that would be
genuinely dangerous: cascading from `species` → `breeds` is survivable, but
anything that cascaded as far as `pets` would delete user data on a taxonomy
edit. **Please don't add CASCADE here.**

Retirement via `status` is the right lever; it just needs §2 to be real.

---

## 4. `breeds` has no uniqueness constraint at all

`species.name` is `UNIQUE`, but **case-sensitively** — `"dog"` and `"Dog"`
would both be accepted and then render as two indistinguishable rows.

`pets.breeds` has **no unique constraint whatsoever**: nothing stops two
"Golden Retriever" rows under Dog today.

The panel enforces case-insensitive uniqueness in application code — scoped to
the species for breeds, since `"Unknown/Mixed"` legitimately appears once per
species (6 rows) and a global check would reject your own convention. But
application-level uniqueness is a race, and anything writing directly to the
table bypasses it entirely.

**Ask:**

```sql
create unique index breeds_species_name_unique
  on pets.breeds (species_id, lower(name));

-- and, to make the species constraint mean what it appears to mean:
drop   index if exists species_name_key;   -- currently case-sensitive UNIQUE
create unique index species_name_unique on pets.species (lower(name));
```

Current data satisfies both — verified: 34 breeds, no duplicate `(species, name)`
pair, and no case-collisions among the 6 species.

---

## 5. Columns the original brief wanted, which don't exist

The brief specified `slug`, `icon_url`, `display_order` and `is_active`. Only a
`status` analogue exists. We did not add them — DDL on your tables is outside
the boundary we've kept to all along. If you want them:

| Column | Note |
|---|---|
| `slug` | Nothing consumes one today; the app reads by `id`. Only worth adding if you want stable public URLs |
| `icon_url` | ⚠️ The brief said Cloudflare R2. **This project has no R2** — that assumption has now appeared three times. Icons would go in Supabase Storage; there is no bucket for them yet |
| `display_order` | The panel currently sorts alphabetically. Worth having if you want "Dog, Cat" ahead of "Reptile" in the app's picker |
| `is_active` boolean | **Don't** — it would duplicate `status`. Constrain `status` instead (§2) |

We're happy to build the UI for any of these the moment the columns exist.

---

## 6. Sibling tables with the same shape

`pets.traits` (12 rows), `pets.activities` (10) and `pets.goals` (6) have an
identical `id / name / description / status` shape and the same missing
constraints. The panel does not manage them yet. If they should be
admin-editable too, the same grants would extend the existing screen — tell us
and it's a small addition rather than a new feature.

---

## Sign-off checklist

1. What is the retired `status` value, and will you add the CHECK constraint?
2. Does the mobile app filter `status = 'active'` on species and breeds?
3. OK to add the two unique indexes in §4?
4. Do you want `slug` / `icon_url` / `display_order`? (And if icons: which
   bucket, public or private?)
5. Should the panel also manage `traits` / `activities` / `goals`?
6. Confirm you do **not** want `CASCADE` on the taxonomy foreign keys.
