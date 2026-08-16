# Proposal: per-species attribute schemas — and why the panel can't ship it alone

**Status:** BLOCKED on the mobile app. Not a panel feature.
**Audience:** MeetMyPets mobile-app team (primary), backend team (secondary).
**Date:** 2026-08-16 · **Project:** Supabase `owfrnkafevdfzduuqnic`.

---

## The ask, and the problem with it

The admin brief specifies a **species-specific attribute schema**: a JSONB
column on `pets.species` defining which extra fields appear when creating a pet
of that species — `morph` for reptiles, `water_type` and `tank_size` for fish —
edited by admins **"without requiring backend code deployments."**

We did not build it, and we'd like to explain why before someone reads that as
the panel dropping a requirement.

**A schema column would have no consumer.** Adding it is easy. Editing it in
the panel is easy. Neither does anything, because:

1. **`pets.pets` has fixed columns.** `color`, `size`, `weight_kg`,
   `personality`, `is_cross_breed`, `blood_group` — all real columns, all
   species-agnostic. There is no `attributes jsonb` on a pet, so a pet has
   nowhere to *store* an answer to a dynamically-defined field.
2. **Species-specific rules already live in the app, in Dart.** Your own comment
   on `pets.pets.blood_group` says it:

   > *"Valid values are validated app-side per species by
   > `pet_blood_group_catalog.dart`; deliberately unconstrained here so the
   > catalogue can extend without a schema change."*

   That is the existing pattern for exactly this problem — and it puts the
   species-aware logic in a compiled Flutter file, which is the one place an
   admin panel cannot reach.

So an admin configuring "reptiles need a `morph` field" would see it saved,
see it in the panel, and see **nothing change in the app**. That reads as a
panel bug, gets reported as a panel bug, and isn't one.

---

## What making it real would actually require

Roughly in dependency order. Steps 1–2 are yours; 3–4 are shared.

1. **A place to put the values.** Either `pets.pets.attributes jsonb` (simple,
   unindexed, fine at this scale) or a `pets.pet_attribute_values` child table
   (queryable and filterable, more work). Discovery/matching filters are the
   deciding factor: if you ever want "show me ball pythons", the child table
   wins; if these are display-only, JSONB is enough.
2. **The app renders the form from data.** Pet creation reads the schema for the
   chosen species and builds its fields at runtime, instead of a hardcoded
   layout. This is the real work, and it's a Flutter change we can't do.
3. **A schema contract both sides agree on.** Sketch below.
4. **Then** the panel builds the editor — a day's work once there's something
   to edit.

Note step 2 also subsumes `pet_blood_group_catalog.dart`: blood group is
*already* a per-species attribute with a per-species value list, so it's the
natural first field to migrate and the proof the mechanism works.

---

## A starting contract

Deliberately small. JSON Schema proper is more than this needs and would put a
validator in the app for no gain.

```jsonc
// pets.species.attribute_schema — jsonb, default '[]'
[
  {
    "key": "morph",                    // stable; becomes the storage key
    "label": "Morph",                  // shown to the user
    "type": "text",                    // text | number | select | boolean
    "required": false,
    "options": ["Ball Python", "Corn Snake"],  // select only
    "unit": null,                      // number only, e.g. "litres"
    "help": "The colour/pattern variety."
  }
]
```

Rules worth agreeing up front, because each one is a bug if left implicit:

- **`key` is immutable once used.** Renaming it orphans every stored value.
  The panel would enforce this; the database can't.
- **Removing a field doesn't delete data.** It stops being collected and
  displayed; existing values stay. Retirement, not deletion — the same principle
  as species and breeds.
- **Changing `type` on a live field is forbidden**, for the same reason.
- **The app must tolerate an unknown `type`** and skip that field rather than
  fail to render the form. An admin on a newer panel than the user's app build
  is inevitable.
- **`required` is advisory until the app enforces it.** Say so, or an admin will
  assume it's a guarantee.

---

## What we'd ask for, if and when you want this

1. Decide storage: `pets.attributes jsonb` vs a child table (question 1 above).
2. Confirm the contract, or replace it with yours.
3. Add `pets.species.attribute_schema jsonb not null default '[]'::jsonb` and
   grant the panel `update (attribute_schema)` — column-scoped, like our other
   write grants.
4. Ship the app-side dynamic form.

We'll build the editor at step 3 and have it ready for step 4.

---

## Meanwhile

`/settings` → **Attribute schemas** renders a short explanation pointing here,
rather than being absent. An admin who read the brief will go looking for that
tab, and finding a reason is better than finding nothing.
