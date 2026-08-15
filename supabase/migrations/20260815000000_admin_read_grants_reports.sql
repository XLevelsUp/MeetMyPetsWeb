-- Admin read (and narrow write) grants for the moderation report queue.
--
-- CONTEXT (verified 2026-08-15, docs/admin/schema-notes.md): the mobile team
-- shipped matching.pet_reports around 2026-08-11 — after our 2026-08-06
-- introspection, which is why the panel had drafted a duplicate
-- public.admin_reports. That proposal is withdrawn; the panel consumes theirs.
--
-- The table's own comment reads "moderators read and update status through
-- service_role" — the intent was there, the GRANT was not: service_role held
-- NO privilege on matching.pet_reports at all, so the panel could not read a
-- single report. Same for the social schema, which it lacked USAGE on.
--
-- GRANTS ONLY. No DDL on backend-owned tables — that boundary is deliberate
-- (docs/admin/README.md working rules). PostgREST enforces table GRANTs even
-- for service_role, which has BYPASSRLS but not BYPASSGRANT.

-- ---------------------------------------------------------------------------
-- The report queue itself.
-- ---------------------------------------------------------------------------
grant select on matching.pet_reports to service_role;

-- COLUMN-SCOPED on purpose. The panel moves a report through the backend's own
-- vocabulary (pending → reviewed | actioned | dismissed) and must never be able
-- to alter what the reporter wrote. Granting UPDATE on the whole table would
-- make "we don't edit reporter-supplied fields" a promise in a document;
-- scoping it to `status` makes Postgres reject the attempt. Same reasoning as
-- the append-only grant on public.admin_audit_logs (20260806000003).
grant update (status) on matching.pet_reports to service_role;

-- ---------------------------------------------------------------------------
-- Post context. A pet_reports row with context_entity_type = 'post' reports ONE
-- post rather than the pet profile — 10 of the 13 live rows are this shape, so
-- without these the queue cannot show a moderator what was actually reported.
--
-- `social` is the one domain schema service_role had no USAGE on.
-- ---------------------------------------------------------------------------
grant usage on schema social to service_role;
grant select on social.posts to service_role;

-- post_media is EMPTY today (0 rows against 119 posts, verified 2026-08-15), so
-- the queue shows the post caption and does not query this table yet. Granted
-- now because the alternative is a second migration the day a reported post has
-- an image, and a moderator judging an image post by its caption is the exact
-- failure this queue exists to prevent.
grant select on social.post_media to service_role;

-- ---------------------------------------------------------------------------
-- Trust ledger — READ ONLY, and deliberately so.
--
-- pets.pets.trust_score is the backend's automated moderation signal. The panel
-- surfaces it (and this ledger) as context for a human reviewing a report; it
-- does NOT write it, and no UPDATE on pets.pets is requested here. Note that
-- pets.adjust_pet_trust_score currently grants EXECUTE to neither service_role
-- nor authenticated, so score changes remain exclusively the backend's
-- triggers — lifting an automated trust ban from the panel is not possible
-- today and needs an RPC from the app team (tracked in schema-notes).
-- ---------------------------------------------------------------------------
grant select on pets.trust_score_events to service_role;

-- NOT granted here, and tracked as Step 4 blockers in schema-notes.md:
--   pets.pet_certificates      — needed for the verification queue
--   pets.pets (UPDATE)         — would let the panel move trust_score
