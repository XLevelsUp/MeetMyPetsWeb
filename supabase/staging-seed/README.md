# Staging seed scripts

**These are not migrations.** Nothing here runs automatically, and nothing here
should ever run against production. They are kept for reference so the next
person does not have to reconstruct what was done on 2026-11-05.

Migrations live in [`../migrations/`](../migrations/) and are owned by the app
team. The `moderation` schema is theirs; this folder only seeds it and grants
the admin panel access to it.

## What these scripts are for

An AI model classifies every uploaded image and video as `APPROVED`,
`REJECTED`, or `HUMAN_REVIEW`, and writes the verdict to `moderation.decisions`.
The admin panel's `/reports` page shows that queue so a moderator can confirm or
correct the model. Staging had the table but no rows, so there was nothing to
build a UI against.

## The files

### `20261105_ai_moderation_mock_data.sql`

Written by the AI engineer. Inserts 18 fake decisions plus their supporting
accounts, pets and media, covering every state the UI must handle: approved,
rejected, hard-rejected, awaiting review, already reviewed, breed mismatch,
AI-generated media, and a deliberately missing image file.

Three changes were made to the original before it ran against `mmp-staging`,
each marked `[EDIT]` in the file:

1. **`'Other Exotic Pets'` → `'Reptile'`.** That species does not exist in
   staging (Dog, Cat, Bird, Rabbit, Reptile, Small Pet, Goat). The script runs
   as one transaction, so this single line would have rolled back all 18 rows.
2. **Staging URL filled in** for `set_config('mock.supabase_url', ...)`.
3. **The video row points at an image.** `puppies.mp4` was never supplied. Swap
   it back when the real video arrives.

Re-running is safe: it deletes its own rows first. Every row it creates has an
id beginning `00000000-0000-4000-`, which is how to find and remove them.

### `20261105_ai_moderation_grants.sql`

Run this **after** the mock data script, not instead of it.

The setup script wraps its DDL and its grants in
`if to_regclass('moderation.decisions') is null`. In staging the table already
existed, so that entire block was skipped — including the grants. The mock data
still inserted, because it sits outside the guard. The result was a populated
table that `service_role` could read but not write.

This file is Part 4 of that script, extracted verbatim. `GRANT` is idempotent,
so it is safe to re-run.

## Required storage files

The rows reference 13 files under a `mock-moderation/` folder:

| Bucket | Files |
|---|---|
| `pet-images` | 11 placeholders |
| `post-media` | `ai-dog.png` |

`missing-file.png` is **deliberately absent** — one row points at it so the UI's
"image unavailable" state can be tested. Do not add it.

`broken.png` and `quarantined.png` were not in the engineer's handover and were
generated locally to match the others.

## Permission model

The grants let the panel record a human's decision but never rewrite the
model's. `UPDATE` is column-scoped to the eight human-review columns:

```
review_status, final_decision, final_rejection_code, incorrect_reason_codes,
missing_reason_codes, remarks, reviewed_by, reviewed_at
```

`decision`, `pet_score`, `reason_codes` and the rest of the AI's output stay
read-only at the database level, so a bug in the panel cannot corrupt the
model's record. This mirrors the column-scoped grant on `matching.pet_reports`
(migration `20260815000000`).

`incorrect_reason_codes` and `missing_reason_codes` are where a moderator marks
which of the model's reasons were wrong and which it missed. That is retraining
data, not moderation state.
