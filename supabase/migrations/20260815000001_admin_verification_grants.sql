-- Admin read + narrow write grants for the certificate verification queue.
--
-- CONTEXT (verified 2026-08-15, docs/admin/schema-notes.md): 15 certificates
-- sit at status='pending' across three types (vaccination 6, health 5,
-- license 4). Every file_path resolves to a real object in the private
-- `pet-certificates` storage bucket. service_role held NO grant on this table
-- at all — only `authenticated` — so the panel could not see the queue.
--
-- ⚠️ APPROVING A CERTIFICATE MOVES THEIR TRUST ENGINE. The backend trigger
-- trg_trust_on_certificate_verified fires on `status = 'approved'` and awards
-- +500 via pets.adjust_pet_trust_score. That is their designed consequence of
-- approval, not a side effect we are working around, and it is the ONE place
-- the panel's actions reach into the trust engine (schema-notes.md §trust).
-- The UI states the +500 in words on the confirmation so a moderator does not
-- learn it from the schema.
--
-- NOTE ON THE STATUS VOCABULARY: `pet_certificates.status` has NO check
-- constraint. 'approved' is read off the trigger body above, not off a
-- constraint — and it conflicts with the pending/verified/rejected vocabulary
-- the app team proposed for identity.account_verifications. Raised with them;
-- until they add the constraint, lib/certificate-constants.ts is the contract.
--
-- GRANTS ONLY. No DDL on backend-owned tables.

-- ---------------------------------------------------------------------------
-- The review queue itself.
-- ---------------------------------------------------------------------------
grant select on pets.pet_certificates to service_role;

-- COLUMN-SCOPED to the four review columns. The owner's uploaded evidence and
-- everything they typed (file_path, certificate_number, issued_by,
-- veterinarian, clinic_name, …) stays unwritable by the panel — Postgres
-- rejects it rather than us promising not to. Same rationale as the
-- update (status) grant on matching.pet_reports in 20260815000000.
grant update (status, reviewed_by, reviewed_at, remarks)
  on pets.pet_certificates to service_role;

-- ---------------------------------------------------------------------------
-- Verification level — READ ONLY, deliberately.
--
-- No trigger anywhere updates this table (the schema has exactly two triggers,
-- both trust-related), so approving a certificate does NOT currently move a
-- pet's badge. We are not guessing at the rule: the existing data contradicts
-- any obvious one — level 2 appears as both 'verified' and
-- 'vaccination_verified', and level 3 'fully_verified' has
-- ownership_verified = false. The panel displays the level as context and the
-- computation rule is an open ask with the app team.
-- ---------------------------------------------------------------------------
grant select on pets.pet_verification_levels to service_role;

-- NOT granted, and tracked in schema-notes.md:
--   pets.pet_verification_levels (UPDATE) — badge rule undefined, see above
--   pets.pets (UPDATE)                    — trust_score stays theirs
