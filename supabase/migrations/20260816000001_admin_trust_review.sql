-- Trust review queue: the restore grant, plus the app team's discovery-filter ask.
--
-- CONTEXT (app repo `MeetMyPets`, backend/database/migration_trust_status_lifecycle.sql,
-- read 2026-08-16): the backend's own migration footer tells admins to restore a
-- trust-banned pet with
--
--     UPDATE pets.pets SET trust_score = 555 WHERE id = '<pet id>';
--
-- ...but service_role held NO update privilege on pets.pets at all, so the
-- documented path did not work. Meanwhile a live pet ("Mano", score 5) has been
-- temp-banned since 2026-08-12 with temporary_ban_until = 2026-08-19, and its
-- owner was shown "our moderation team will manually review this pet". A
-- temporary ban is NEVER lifted by the clock — get_pet_trust_status does not
-- consult temporary_ban_until — so without this grant that review is impossible
-- and the ban is effectively permanent.

-- ---------------------------------------------------------------------------
-- 1. The restore path.
--
-- COLUMN-SCOPED to `trust_score` alone, and that is the whole design. Their
-- BEFORE UPDATE trigger (trust_status_on_score_change) owns the three lifecycle
-- columns: setting the score to exactly 555 clears trust_warning_acknowledged,
-- temporary_banned_at and temporary_ban_until in the same write. Their footer
-- warns that "a manual reset that forgets one column leaves a pet banned with
-- no ban date", so the panel is deliberately unable to touch them — Postgres
-- refuses rather than us promising not to.
--
-- 555 is also not a rounded-up guess: the restoration branch is literally
-- `IF NEW.trust_score = 555`. Any other value skips it.
-- ---------------------------------------------------------------------------
grant update (trust_score) on pets.pets to service_role;

-- NOT granted: pets.adjust_pet_trust_score is REVOKED from PUBLIC, authenticated
-- and anon by their migration and was never granted to service_role either, so
-- the panel cannot make arbitrary scored adjustments — only the full restore
-- their trigger recognises. That is the correct amount of power.

-- ---------------------------------------------------------------------------
-- 2. Answering the app team's ask.
--
-- Their handoff (§8, "SAY YES AND WE'LL BUILD IT") asks for a read grant on
-- public.admin_restrictions so the app can hide moderated pets from discovery.
-- Worth saying plainly why this matters: a trust ban stops the OWNER acting as
-- that pet, but does not hide the pet from anyone else, and neither does our
-- flag. Today "actioned" in our panel removes nothing from the app.
--
-- We are NOT granting the table. `reason` is moderator free text and
-- `created_by` identifies the admin — neither belongs in a mobile client. This
-- view exposes only what a discovery filter needs: which target is restricted,
-- and how.
--
-- The view is intentionally left as the default SECURITY DEFINER-style view
-- (security_invoker = false), so it runs as its owner and is unaffected by the
-- zero-policy RLS on the base table. That is what makes the grant meaningful;
-- the base table stays deny-all to everyone but service_role.
-- ---------------------------------------------------------------------------
create or replace view public.active_moderation_targets as
  select target_type, target_id, kind
  from public.admin_restrictions
  where lifted_at is null
    and (expires_at is null or expires_at > now());

comment on view public.active_moderation_targets is
  'Currently-active admin restrictions, for the mobile app to filter moderated content out of discovery. Deliberately excludes reason and created_by. Active = lifted_at is null and not expired. Owned by the admin panel; see docs/admin/app-team-handoff.md.';

revoke all on public.active_moderation_targets from anon;
grant select on public.active_moderation_targets to authenticated, service_role;
