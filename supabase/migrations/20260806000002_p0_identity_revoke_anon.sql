-- P0 SECURITY FIX (partial): revoke ANON access to the identity schema.
--
-- FINDING (verified 2026-08-06, docs/admin/schema-notes.md): the identity
-- schema is exposed to the Data API, RLS is DISABLED on its 8 PII tables, and
-- both `anon` and `authenticated` held full CRUD grants. Live-verified that a
-- browser publishable key with NO login could read identity.accounts
-- (emails, phones) and identity.account_profiles (lat/long).
--
-- SCOPE OF THIS MIGRATION — `anon` ONLY. A read of the Supabase API logs
-- showed the mobile app (Dart/3.12) reads identity.accounts and
-- identity.account_profiles directly through PostgREST as the `authenticated`
-- role. Revoking `authenticated` would break the live app, so it is
-- DELIBERATELY LEFT INTACT here. The correct fix for the authenticated side is
-- enabling RLS with owner-scoped policies — that needs the mobile team's
-- access patterns and is tracked as a follow-up in schema-notes.md, NOT done
-- here.
--
-- `anon` = unauthenticated callers. The mobile app authenticates before
-- touching identity, and account rows are created server-side by the
-- SECURITY DEFINER trigger identity.handle_new_user() (which fires as the
-- table owner regardless of this grant), so removing anon access does not
-- affect signup or any authenticated flow.
--
-- ROLLBACK SNAPSHOT (grants revoked below, captured 2026-08-06):
--   tables (all 8): DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE
--     accounts, account_profiles, account_settings, account_privacy_settings,
--     account_devices, account_sessions, account_email_history,
--     account_verifications
--   functions (EXECUTE): archive_account(text,boolean,boolean),
--     cleanup_expired_password_reset_data(), handle_new_user(),
--     handle_user_update(), purge_account_now(), restore_account()
--   schema USAGE: anon
-- To restore, re-grant the above to anon.

revoke all privileges on all tables in schema identity from anon;
revoke all privileges on all sequences in schema identity from anon;
revoke all privileges on all functions in schema identity from anon;
revoke usage on schema identity from anon;

-- Keep future backend-created identity objects closed to anon as well.
alter default privileges in schema identity revoke all on tables from anon;
alter default privileges in schema identity revoke all on sequences from anon;
alter default privileges in schema identity revoke all on functions from anon;

-- FOLLOW-UP (backend team, NOT in this migration):
--   Enable RLS on the 8 identity tables and add owner-scoped policies so the
--   `authenticated` role can read only rows it should (the mobile app reads
--   its own account + selected profile fields today). Until then,
--   `authenticated` retains full cross-row access to identity — a real but
--   separate exposure that requires app-aware policy design.
