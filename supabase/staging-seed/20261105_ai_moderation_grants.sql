-- Admin-panel grants for AI moderation. STAGING ONLY. Run once, after the setup script.
--
-- WHY THIS EXISTS
-- The setup script wraps everything in `if to_regclass('moderation.decisions') is null`.
-- moderation.decisions already existed in mmp-staging, so the whole block was skipped --
-- including these grants. The mock data inserted fine (it sits outside the guard), but
-- service_role was left with SELECT only. This is Part 4 of that script, verbatim.
--
-- Safe to re-run: GRANT is idempotent.

begin;

grant usage on schema moderation to service_role;
grant select on moderation.decisions to service_role;
grant select on pets.pet_media to service_role;

-- The AI's own verdict stays read-only: only the human-review columns may change.
grant update (review_status, final_decision, final_rejection_code, incorrect_reason_codes,
              missing_reason_codes, remarks, reviewed_by, reviewed_at)
  on moderation.decisions to service_role;

grant update (moderation_status) on social.posts to service_role;
grant update (moderation_status, moderation_rejection_code) on social.post_media, pets.pet_media to service_role;
grant update (profile_photo_moderation_status, profile_photo_moderation_rejection_code) on pets.pets to service_role;

commit;

-- Check: expect 8 rows -- the human-review columns on moderation.decisions.
select table_schema, table_name, column_name, privilege_type
from information_schema.column_privileges
where grantee = 'service_role'
  and table_schema = 'moderation'
  and privilege_type = 'UPDATE'
order by column_name;
