-- Admin write grants for species / breed taxonomy management.
--
-- ⚠️ THIS IS THE FIRST TIME THE PANEL WRITES A BACKEND-OWNED DOMAIN TABLE.
-- Every previous write was either into one of our own `public.admin_*` tables
-- or a column-scoped status update on a moderation row. `pets.species` and
-- `pets.breeds` are core reference data the mobile app depends on, so the
-- reasoning is recorded here rather than in a commit message.
--
-- CONTEXT (verified 2026-08-16, docs/admin/schema-notes.md): 6 species and 34
-- breeds, every row `status = 'active'`. service_role held NO privilege on
-- either table — the panel reads them today through the anon publishable key
-- (lib/supabase/reference.ts), which is SELECT-only.
--
-- ⚠️ EDITS ARE VISIBLE TO USERS IMMEDIATELY. Today's edge logs show the mobile
-- app (Dart/3.12) reading /rest/v1/species and /rest/v1/breeds directly from
-- PostgREST. There is no cache layer and no deploy step between this table and
-- a pet-creation dropdown, so deactivating a species changes the live app the
-- moment the row is written.

grant select, insert, update on pets.species to service_role;
grant select, insert, update on pets.breeds  to service_role;

-- ---------------------------------------------------------------------------
-- NO DELETE — deliberately, and not merely out of caution.
--
-- `pets.pets.species_id` and `pets.pets.breed_id` are NOT NULL with plain
-- (NO ACTION) foreign keys, so the database already refuses to delete anything
-- a pet references. A delete path would therefore succeed for the 18 unused
-- breeds and fail for the rest — a button whose availability depends on live
-- FK state, which is worse than no button. Retirement is `status`, which is
-- reversible and which the FKs cannot contradict.
--
-- Also NOT granted: any DDL. The columns this feature would like —
-- `slug`, `icon_url`, `display_order`, a CHECK on `status`, and a unique
-- (species_id, lower(name)) on breeds — are proposed to the app team in
-- docs/admin/taxonomy-schema-proposal.md rather than added here.
-- ---------------------------------------------------------------------------
