-- AI moderation setup for the admin panel. STAGING ONLY, never production.
--
-- EDITED FOR MMP-STAGING. Three changes from the original, each marked [EDIT] below.
--
-- BEFORE RUNNING
--   1. Upload the 12 images from the mock-upload folder in Supabase: Storage > bucket > Create folder "mock-moderation" > Upload.
--        post-media/mock-moderation/   ai-dog.png
--        pet-images/mock-moderation/   the other 11 files
--   2. The staging URL is already filled in below. Nothing to replace.
--
-- RUN: paste the whole file into the SQL Editor and run it.
-- It all succeeds or nothing changes. It can run again: it adds the tables only if they're missing,
-- and replaces its own fake rows (ids starting 00000000-0000-4000-). Existing rows only get the new status columns, set to approved.
begin;

-- ===== Part 1: columns, moderation.decisions and permissions =====
do $setup$
begin
  if to_regclass('moderation.decisions') is null then
    execute $migration$
-- ===== 1. Columns on existing tables =====
-- DEFAULT 'approved' keeps every existing row visible. Those rows were never checked by this service.
alter table social.posts
  add column moderation_status varchar(20) not null default 'approved'
    constraint posts_moderation_status_check
    check (moderation_status in ('pending', 'in_review', 'approved', 'rejected'));

alter table social.post_media
  add column moderation_status varchar(20) not null default 'approved'
    constraint post_media_moderation_status_check
    check (moderation_status in ('pending', 'in_review', 'approved', 'rejected')),
  add column moderation_rejection_code varchar(10)
    constraint post_media_moderation_rejection_code_check
    check (moderation_rejection_code ~ '^MOD_00[1-9]$');

alter table pets.pet_media
  add column moderation_status varchar(20) not null default 'approved'
    constraint pet_media_moderation_status_check
    check (moderation_status in ('pending', 'in_review', 'approved', 'rejected')),
  add column moderation_rejection_code varchar(10)
    constraint pet_media_moderation_rejection_code_check
    check (moderation_rejection_code ~ '^MOD_00[1-9]$');

alter table pets.pets
  add column profile_photo_moderation_status varchar(20) not null default 'approved'
    constraint pets_profile_photo_moderation_status_check
    check (profile_photo_moderation_status in ('pending', 'in_review', 'approved', 'rejected')),
  add column profile_photo_moderation_rejection_code varchar(10)
    constraint pets_profile_photo_moderation_rejection_code_check
    check (profile_photo_moderation_rejection_code ~ '^MOD_00[1-9]$');

-- ===== 2. The one new table =====
create schema moderation;

create table moderation.decisions (
  id uuid primary key default gen_random_uuid(),         -- the API's content_id

  -- What was checked. No foreign keys, like public.admin_audit_logs: deleting an account or post
  -- must neither erase this record nor be blocked by it.
  account_id uuid not null,                              -- identity.accounts.id
  pet_id uuid,                                           -- pets.pets.id
  media_type varchar(20) not null,                      -- post_media, pet_media, pet_profile_photo
  media_id uuid not null,                               -- the row whose status gets updated
  storage_path text not null,                            -- bucket and path, never a token
  media_sha256 character(64),                            -- null if the file never downloaded
  media_size_bytes bigint,
  content_type varchar(10) not null,
  context varchar(20) not null,

  -- The AI's answer
  decision varchar(20) not null,
  rejection_code varchar(10),
  hard_reject boolean not null default false,
  pet_score numeric(5,2),
  composite_score numeric(5,2),
  dimension_scores jsonb,
  ai_generated boolean,
  ai_score numeric(5,2),
  reason_codes text[] not null default '{}',
  flags text[] not null default '{}',
  species_detected text[] not null default '{}',
  detected_objects jsonb,                                -- debugging only, not in the API answer
  processing_ms integer not null,
  model_version text not null,
  created_at timestamptz not null default now(),

  -- The latest human review. Null review_status = no review needed.
  review_status varchar(10),
  final_decision varchar(20),
  final_rejection_code varchar(10),
  incorrect_reason_codes text[] not null default '{}',
  missing_reason_codes text[] not null default '{}',
  remarks text,
  reviewed_by uuid,                                      -- identity.accounts.id
  reviewed_at timestamptz,

  -- The breed check: recorded only, it never changes moderation_status. Not built yet: always not_checked.
  declared_breed_id uuid,                                -- pets.breeds.id, sent by the app
  declared_is_cross_breed boolean,
  breed_status varchar(15) not null default 'not_checked',
  breed_match_score numeric(5,2),                        -- how well the photo fits the claimed breed
  detected_breed_id uuid,                                -- pets.breeds.id: what the AI found, when unmatched
  detected_breed_name varchar(150),
  detected_breed_score numeric(5,2),

  constraint decisions_breed_status_check check (breed_status in ('matched', 'unmatched', 'not_checked')),
  constraint decisions_breed_unmatched_check check (
    breed_status <> 'unmatched' or (breed_match_score is not null and detected_breed_id is not null)
  ),

  -- Today every post is one pets.pet_media row with the same id (trg_sync_pet_media_to_post);
  -- social.post_media has 0 rows.
  constraint decisions_context_media_check check (
    (context = 'post' and media_type in ('pet_media', 'post_media'))
    or (context = 'profile' and media_type = 'pet_profile_photo')
  ),
  constraint decisions_content_type_check check (content_type in ('image', 'video')),
  constraint decisions_decision_check check (decision in ('APPROVED', 'HUMAN_REVIEW', 'REJECTED')),
  constraint decisions_rejection_code_check check (rejection_code ~ '^MOD_00[1-9]$'),
  constraint decisions_rejected_has_code_check check ((decision = 'REJECTED') = (rejection_code is not null)),
  constraint decisions_review_status_check check (review_status in ('pending', 'done')),
  constraint decisions_final_decision_check check (final_decision in ('APPROVED', 'REJECTED')),
  constraint decisions_final_rejection_code_check check (final_rejection_code ~ '^MOD_00[1-9]$'),
  constraint decisions_final_rejected_has_code_check
    check ((final_decision is not distinct from 'REJECTED') = (final_rejection_code is not null)),
  constraint decisions_review_done_check check (
    (review_status is not distinct from 'done') = (final_decision is not null and reviewed_by is not null and reviewed_at is not null)
  ),
  constraint decisions_remarks_length_check check (char_length(remarks) <= 1000)
);

-- The queue: holds pending rows only, so it stays small however many decisions build up.
create index decisions_queue_idx on moderation.decisions (created_at) where review_status = 'pending';
create index decisions_media_idx on moderation.decisions (media_type, media_id, created_at desc);
create index decisions_account_idx on moderation.decisions (account_id, created_at desc);
create index decisions_breed_unmatched_idx on moderation.decisions (created_at) where breed_status = 'unmatched';

-- Not reachable with the app's public keys. Don't add this schema to the exposed Data API schemas.
alter table moderation.decisions enable row level security;

-- ===== 3. Least-privilege role for the moderation service =====
-- service_role has no UPDATE on these tables today, so the service gets its own role.
-- Row-level security is bypassed, but column grants limit it to exactly these columns.
create role moderation_service nologin bypassrls;

grant usage on schema moderation, social, pets, identity, public to moderation_service;
grant select, insert, update on moderation.decisions to moderation_service;

grant select (id), update (moderation_status) on social.posts to moderation_service;
grant select (id, post_id, moderation_status), update (moderation_status, moderation_rejection_code) on social.post_media to moderation_service;
grant select (id), update (moderation_status, moderation_rejection_code) on pets.pet_media to moderation_service;
grant select (id), update (profile_photo_moderation_status, profile_photo_moderation_rejection_code) on pets.pets to moderation_service;

grant select (id, email, is_platform_moderator, is_platform_admin) on identity.accounts to moderation_service;
grant insert on public.admin_audit_logs to moderation_service;

-- ===== 4. The admin panel (service_role): filter, read the AI's results, approve and reject =====
-- The AI's own answer stays read-only: only the review columns and the status columns can change.
grant usage on schema moderation to service_role;
grant select on moderation.decisions to service_role;
grant select on pets.pet_media to service_role;

grant update (review_status, final_decision, final_rejection_code, incorrect_reason_codes,
              missing_reason_codes, remarks, reviewed_by, reviewed_at)
  on moderation.decisions to service_role;
grant update (moderation_status) on social.posts to service_role;
grant update (moderation_status, moderation_rejection_code) on social.post_media, pets.pet_media to service_role;
grant update (profile_photo_moderation_status, profile_photo_moderation_rejection_code) on pets.pets to service_role;
    $migration$;
  end if;
end
$setup$;

-- ===== Part 2: fake data =====
-- [EDIT 1] staging URL filled in.
select set_config('mock.supabase_url', 'https://lavupsdacofpawqfwbfo.supabase.co', true);

do $$
begin
  if current_setting('mock.supabase_url') like '%<supabase>%' then
    raise exception 'Replace <supabase> in the set_config line with your staging URL first.';
  end if;
end $$;

-- Removes only the mock rows: every one has an id starting 00000000-0000-4000-.
delete from moderation.decisions where id::text like '00000000-0000-4000-%';
delete from social.post_media where id::text like '00000000-0000-4000-%';
delete from pets.pets where id::text like '00000000-0000-4000-%';   -- also removes their pet_media and posts
delete from social.posts where id::text like '00000000-0000-4000-%';
delete from identity.account_profiles where id::text like '00000000-0000-4000-%';
delete from identity.accounts where id::text like '00000000-0000-4000-%';

-- ===== The moderator who made the sample reviews. It has no login: review with your own staging moderator. =====
insert into identity.accounts (id, auth_user_id, email, display_name, is_platform_moderator, status, created_at)
values ('00000000-0000-4000-e000-000000000001', '00000000-0000-4000-f000-000000000001', 'mock-moderator@example.invalid', 'Mock Moderator', true, 'active', now());


-- ===== 1. normal-review =====
insert into identity.accounts (id, auth_user_id, email, display_name, status, created_at)
values ('00000000-0000-4000-b000-000000000001', '00000000-0000-4000-f000-000000000002', 'mock-user-01@example.invalid', 'Mock User 01', 'active', now() - interval '230 minutes');
insert into identity.account_profiles (id, account_id, name, created_at)
values ('00000000-0000-4000-9000-000000000001', '00000000-0000-4000-b000-000000000001', 'Mock User 01', now() - interval '230 minutes');
insert into pets.pets (id, owner_account_id, species_id, breed_id, name, status, profile_photo_url, profile_photo_path,
                       profile_photo_moderation_status, profile_photo_moderation_rejection_code, created_at)
select '00000000-0000-4000-c000-000000000001', '00000000-0000-4000-b000-000000000001', s.id, b.id, 'Mock Pet 01', 'active', current_setting('mock.supabase_url') || '/storage/v1/object/public/pet-images/mock-moderation/lookalike.png', 'mock-moderation/lookalike.png', 'approved', null, now() - interval '230 minutes'
from pets.species s join pets.breeds b on b.species_id = s.id and b.name = 'Unknown/Mixed' where s.name = 'Dog';
insert into pets.pet_media (id, pet_id, kind, url, storage_path, display_order, moderation_status, moderation_rejection_code, created_at)
values ('00000000-0000-4000-d000-000000000001', '00000000-0000-4000-c000-000000000001', 'image', current_setting('mock.supabase_url') || '/storage/v1/object/public/pet-images/mock-moderation/dog-bath.png', 'mock-moderation/dog-bath.png', 0, 'in_review', null, now() - interval '230 minutes');
update social.posts set caption = '[MOCK] normal-review', moderation_status = 'in_review' where id = '00000000-0000-4000-d000-000000000001';
insert into moderation.decisions (
  id, account_id, pet_id, media_type, media_id, storage_path, media_sha256, media_size_bytes, content_type, context,
  decision, rejection_code, hard_reject, pet_score, composite_score, dimension_scores, ai_generated, ai_score,
  reason_codes, flags, species_detected, detected_objects, processing_ms, model_version, created_at,
  review_status, final_decision, final_rejection_code, incorrect_reason_codes, missing_reason_codes, remarks, reviewed_by, reviewed_at,
  declared_breed_id, declared_is_cross_breed, breed_status, breed_match_score, detected_breed_id, detected_breed_name, detected_breed_score
) values (
  '00000000-0000-4000-a000-000000000001', '00000000-0000-4000-b000-000000000001', '00000000-0000-4000-c000-000000000001', 'pet_media', '00000000-0000-4000-d000-000000000001', 'pet-images/mock-moderation/dog-bath.png', 'ebd8e4524f1c4ce816cbca7714af514ccdb7977cc18897b8fb91150a172a3c09', 11485, 'image', 'post',
  'HUMAN_REVIEW', null, false, 82.1, 71.5, '{"D1_welfare": 70.0, "D2_nsfw": 100.0, "D3_violence": 100.0, "D4_prohibited": 100.0, "D5_quality": 88.0, "D6_relevance": 94.0}'::jsonb, false, 8.0,
  array['welfare_distress']::text[], array['validation_passed', 'welfare_distress', 'gate2_review']::text[], array['dog']::text[], '[{"label": "dog", "score": 0.9, "kind": "animal"}]'::jsonb, 1950, 'validation-0.1+gate1-fused-0.7.1+gate2-0.19.2+mock', now() - interval '230 minutes',
  'pending', null, null, '{}'::text[], '{}'::text[], null, null, null,
  null, null, 'not_checked', null, null, null, null
);

-- ===== 2. near-target =====
insert into identity.accounts (id, auth_user_id, email, display_name, status, created_at)
values ('00000000-0000-4000-b000-000000000002', '00000000-0000-4000-f000-000000000003', 'mock-user-02@example.invalid', 'Mock User 02', 'active', now() - interval '225 minutes');
insert into identity.account_profiles (id, account_id, name, created_at)
values ('00000000-0000-4000-9000-000000000002', '00000000-0000-4000-b000-000000000002', 'Mock User 02', now() - interval '225 minutes');
insert into pets.pets (id, owner_account_id, species_id, breed_id, name, status, profile_photo_url, profile_photo_path,
                       profile_photo_moderation_status, profile_photo_moderation_rejection_code, created_at)
select '00000000-0000-4000-c000-000000000002', '00000000-0000-4000-b000-000000000002', s.id, b.id, 'Mock Pet 02', 'active', current_setting('mock.supabase_url') || '/storage/v1/object/public/pet-images/mock-moderation/lookalike.png', 'mock-moderation/lookalike.png', 'approved', null, now() - interval '225 minutes'
from pets.species s join pets.breeds b on b.species_id = s.id and b.name = 'Unknown/Mixed' where s.name = 'Cat';
insert into pets.pet_media (id, pet_id, kind, url, storage_path, display_order, moderation_status, moderation_rejection_code, created_at)
values ('00000000-0000-4000-d000-000000000002', '00000000-0000-4000-c000-000000000002', 'image', current_setting('mock.supabase_url') || '/storage/v1/object/public/pet-images/mock-moderation/cat-carrier.png', 'mock-moderation/cat-carrier.png', 0, 'in_review', null, now() - interval '225 minutes');
update social.posts set caption = '[MOCK] near-target', moderation_status = 'in_review' where id = '00000000-0000-4000-d000-000000000002';
insert into moderation.decisions (
  id, account_id, pet_id, media_type, media_id, storage_path, media_sha256, media_size_bytes, content_type, context,
  decision, rejection_code, hard_reject, pet_score, composite_score, dimension_scores, ai_generated, ai_score,
  reason_codes, flags, species_detected, detected_objects, processing_ms, model_version, created_at,
  review_status, final_decision, final_rejection_code, incorrect_reason_codes, missing_reason_codes, remarks, reviewed_by, reviewed_at,
  declared_breed_id, declared_is_cross_breed, breed_status, breed_match_score, detected_breed_id, detected_breed_name, detected_breed_score
) values (
  '00000000-0000-4000-a000-000000000002', '00000000-0000-4000-b000-000000000002', '00000000-0000-4000-c000-000000000002', 'pet_media', '00000000-0000-4000-d000-000000000002', 'pet-images/mock-moderation/cat-carrier.png', '0a8e55f7a969646abc264b474327a4597b633edb47363f24326c690c113e9acc', 11601, 'image', 'post',
  'HUMAN_REVIEW', null, false, 66.0, 88.0, '{"D1_welfare": 100.0, "D2_nsfw": 100.0, "D3_violence": 100.0, "D4_prohibited": 100.0, "D5_quality": 88.0, "D6_relevance": 94.0}'::jsonb, false, 8.0,
  array['gate1_borderline']::text[], array['validation_passed', 'gate1_borderline', 'gate2_review']::text[], array['cat']::text[], '[{"label": "cat", "score": 0.9, "kind": "animal"}]'::jsonb, 1950, 'validation-0.1+gate1-fused-0.7.1+gate2-0.19.2+mock', now() - interval '225 minutes',
  'pending', null, null, '{}'::text[], '{}'::text[], null, null, null,
  null, null, 'not_checked', null, null, null, null
);

-- ===== 3. ai-rejected-no-pet =====
insert into identity.accounts (id, auth_user_id, email, display_name, status, created_at)
values ('00000000-0000-4000-b000-000000000003', '00000000-0000-4000-f000-000000000004', 'mock-user-03@example.invalid', 'Mock User 03', 'active', now() - interval '180 minutes');
insert into identity.account_profiles (id, account_id, name, created_at)
values ('00000000-0000-4000-9000-000000000003', '00000000-0000-4000-b000-000000000003', 'Mock User 03', now() - interval '180 minutes');
insert into pets.pets (id, owner_account_id, species_id, breed_id, name, status, profile_photo_url, profile_photo_path,
                       profile_photo_moderation_status, profile_photo_moderation_rejection_code, created_at)
select '00000000-0000-4000-c000-000000000003', '00000000-0000-4000-b000-000000000003', s.id, b.id, 'Mock Pet 03', 'active', current_setting('mock.supabase_url') || '/storage/v1/object/public/pet-images/mock-moderation/lookalike.png', 'mock-moderation/lookalike.png', 'approved', null, now() - interval '180 minutes'
from pets.species s join pets.breeds b on b.species_id = s.id and b.name = 'Unknown/Mixed' where s.name = 'Dog';
insert into pets.pet_media (id, pet_id, kind, url, storage_path, display_order, moderation_status, moderation_rejection_code, created_at)
values ('00000000-0000-4000-d000-000000000003', '00000000-0000-4000-c000-000000000003', 'image', current_setting('mock.supabase_url') || '/storage/v1/object/public/pet-images/mock-moderation/figurine.png', 'mock-moderation/figurine.png', 0, 'in_review', null, now() - interval '180 minutes');
update social.posts set caption = '[MOCK] ai-rejected-no-pet', moderation_status = 'in_review' where id = '00000000-0000-4000-d000-000000000003';
insert into moderation.decisions (
  id, account_id, pet_id, media_type, media_id, storage_path, media_sha256, media_size_bytes, content_type, context,
  decision, rejection_code, hard_reject, pet_score, composite_score, dimension_scores, ai_generated, ai_score,
  reason_codes, flags, species_detected, detected_objects, processing_ms, model_version, created_at,
  review_status, final_decision, final_rejection_code, incorrect_reason_codes, missing_reason_codes, remarks, reviewed_by, reviewed_at,
  declared_breed_id, declared_is_cross_breed, breed_status, breed_match_score, detected_breed_id, detected_breed_name, detected_breed_score
) values (
  '00000000-0000-4000-a000-000000000003', '00000000-0000-4000-b000-000000000003', '00000000-0000-4000-c000-000000000003', 'pet_media', '00000000-0000-4000-d000-000000000003', 'pet-images/mock-moderation/figurine.png', 'a0131c98f0b5f1d11e018b0e99cc1a52b864c15a8783b85baca011b7d960516f', 10713, 'image', 'post',
  'REJECTED', 'MOD_001', false, 18.4, null, null, null, null,
  array['no_pet_detected']::text[], array['validation_passed', 'no_pet_detected']::text[], '{}'::text[], null, 1950, 'validation-0.1+gate1-fused-0.7.1+gate2-0.19.2+mock', now() - interval '180 minutes',
  'pending', null, null, '{}'::text[], '{}'::text[], null, null, null,
  null, null, 'not_checked', null, null, null, null
);

-- ===== 4. ai-rejected-hard =====
insert into identity.accounts (id, auth_user_id, email, display_name, status, created_at)
values ('00000000-0000-4000-b000-000000000004', '00000000-0000-4000-f000-000000000005', 'mock-user-04@example.invalid', 'Mock User 04', 'active', now() - interval '150 minutes');
insert into identity.account_profiles (id, account_id, name, created_at)
values ('00000000-0000-4000-9000-000000000004', '00000000-0000-4000-b000-000000000004', 'Mock User 04', now() - interval '150 minutes');
insert into pets.pets (id, owner_account_id, species_id, breed_id, name, status, profile_photo_url, profile_photo_path,
                       profile_photo_moderation_status, profile_photo_moderation_rejection_code, created_at)
select '00000000-0000-4000-c000-000000000004', '00000000-0000-4000-b000-000000000004', s.id, b.id, 'Mock Pet 04', 'active', current_setting('mock.supabase_url') || '/storage/v1/object/public/pet-images/mock-moderation/lookalike.png', 'mock-moderation/lookalike.png', 'approved', null, now() - interval '150 minutes'
from pets.species s join pets.breeds b on b.species_id = s.id and b.name = 'Unknown/Mixed' where s.name = 'Dog';
insert into pets.pet_media (id, pet_id, kind, url, storage_path, display_order, moderation_status, moderation_rejection_code, created_at)
values ('00000000-0000-4000-d000-000000000004', '00000000-0000-4000-c000-000000000004', 'image', current_setting('mock.supabase_url') || '/storage/v1/object/public/pet-images/mock-moderation/welfare-placeholder.png', 'mock-moderation/welfare-placeholder.png', 0, 'in_review', null, now() - interval '150 minutes');
update social.posts set caption = '[MOCK] ai-rejected-hard', moderation_status = 'in_review' where id = '00000000-0000-4000-d000-000000000004';
insert into moderation.decisions (
  id, account_id, pet_id, media_type, media_id, storage_path, media_sha256, media_size_bytes, content_type, context,
  decision, rejection_code, hard_reject, pet_score, composite_score, dimension_scores, ai_generated, ai_score,
  reason_codes, flags, species_detected, detected_objects, processing_ms, model_version, created_at,
  review_status, final_decision, final_rejection_code, incorrect_reason_codes, missing_reason_codes, remarks, reviewed_by, reviewed_at,
  declared_breed_id, declared_is_cross_breed, breed_status, breed_match_score, detected_breed_id, detected_breed_name, detected_breed_score
) values (
  '00000000-0000-4000-a000-000000000004', '00000000-0000-4000-b000-000000000004', '00000000-0000-4000-c000-000000000004', 'pet_media', '00000000-0000-4000-d000-000000000004', 'pet-images/mock-moderation/welfare-placeholder.png', '4c72f317678e2a67e0655a7dcd32d0863c262ed547a92a5eb6209368ddb8134a', 11606, 'image', 'post',
  'REJECTED', 'MOD_002', true, 91.0, 42.0, '{"D1_welfare": 0.0, "D2_nsfw": 100.0, "D3_violence": 100.0, "D4_prohibited": 100.0, "D5_quality": 88.0, "D6_relevance": 94.0}'::jsonb, false, 8.0,
  array['welfare_abuse', 'welfare_distress']::text[], array['validation_passed', 'welfare_abuse', 'welfare_distress']::text[], array['dog']::text[], '[{"label": "dog", "score": 0.9, "kind": "animal"}]'::jsonb, 1950, 'validation-0.1+gate1-fused-0.7.1+gate2-0.19.2+mock', now() - interval '150 minutes',
  'pending', null, null, '{}'::text[], '{}'::text[], null, null, null,
  null, null, 'not_checked', null, null, null, null
);

-- ===== 5. failed-check =====
insert into identity.accounts (id, auth_user_id, email, display_name, status, created_at)
values ('00000000-0000-4000-b000-000000000005', '00000000-0000-4000-f000-000000000006', 'mock-user-05@example.invalid', 'Mock User 05', 'active', now() - interval '120 minutes');
insert into identity.account_profiles (id, account_id, name, created_at)
values ('00000000-0000-4000-9000-000000000005', '00000000-0000-4000-b000-000000000005', 'Mock User 05', now() - interval '120 minutes');
insert into pets.pets (id, owner_account_id, species_id, breed_id, name, status, profile_photo_url, profile_photo_path,
                       profile_photo_moderation_status, profile_photo_moderation_rejection_code, created_at)
select '00000000-0000-4000-c000-000000000005', '00000000-0000-4000-b000-000000000005', s.id, b.id, 'Mock Pet 05', 'active', current_setting('mock.supabase_url') || '/storage/v1/object/public/pet-images/mock-moderation/lookalike.png', 'mock-moderation/lookalike.png', 'approved', null, now() - interval '120 minutes'
from pets.species s join pets.breeds b on b.species_id = s.id and b.name = 'Unknown/Mixed' where s.name = 'Dog';
insert into pets.pet_media (id, pet_id, kind, url, storage_path, display_order, moderation_status, moderation_rejection_code, created_at)
values ('00000000-0000-4000-d000-000000000005', '00000000-0000-4000-c000-000000000005', 'image', current_setting('mock.supabase_url') || '/storage/v1/object/public/pet-images/mock-moderation/missing-file.png', 'mock-moderation/missing-file.png', 0, 'in_review', null, now() - interval '120 minutes');
update social.posts set caption = '[MOCK] failed-check', moderation_status = 'in_review' where id = '00000000-0000-4000-d000-000000000005';
insert into moderation.decisions (
  id, account_id, pet_id, media_type, media_id, storage_path, media_sha256, media_size_bytes, content_type, context,
  decision, rejection_code, hard_reject, pet_score, composite_score, dimension_scores, ai_generated, ai_score,
  reason_codes, flags, species_detected, detected_objects, processing_ms, model_version, created_at,
  review_status, final_decision, final_rejection_code, incorrect_reason_codes, missing_reason_codes, remarks, reviewed_by, reviewed_at,
  declared_breed_id, declared_is_cross_breed, breed_status, breed_match_score, detected_breed_id, detected_breed_name, detected_breed_score
) values (
  '00000000-0000-4000-a000-000000000005', '00000000-0000-4000-b000-000000000005', '00000000-0000-4000-c000-000000000005', 'pet_media', '00000000-0000-4000-d000-000000000005', 'pet-images/mock-moderation/missing-file.png', null, null, 'image', 'post',
  'HUMAN_REVIEW', null, false, 0.0, 0.0, '{"D1_welfare": 0.0, "D2_nsfw": 0.0, "D3_violence": 0.0, "D4_prohibited": 0.0, "D5_quality": 0.0, "D6_relevance": 0.0}'::jsonb, false, 0.0,
  array['check_incomplete']::text[], array['check_incomplete']::text[], '{}'::text[], null, 1950, 'validation-0.1+gate1-fused-0.7.1+gate2-0.19.2+mock', now() - interval '120 minutes',
  'pending', null, null, '{}'::text[], '{}'::text[], null, null, null,
  null, null, 'not_checked', 0, null, null, 0
);

-- ===== 6. video-review =====
insert into identity.accounts (id, auth_user_id, email, display_name, status, created_at)
values ('00000000-0000-4000-b000-000000000006', '00000000-0000-4000-f000-000000000007', 'mock-user-06@example.invalid', 'Mock User 06', 'active', now() - interval '100 minutes');
insert into identity.account_profiles (id, account_id, name, created_at)
values ('00000000-0000-4000-9000-000000000006', '00000000-0000-4000-b000-000000000006', 'Mock User 06', now() - interval '100 minutes');
insert into pets.pets (id, owner_account_id, species_id, breed_id, name, status, profile_photo_url, profile_photo_path,
                       profile_photo_moderation_status, profile_photo_moderation_rejection_code, created_at)
select '00000000-0000-4000-c000-000000000006', '00000000-0000-4000-b000-000000000006', s.id, b.id, 'Mock Pet 06', 'active', current_setting('mock.supabase_url') || '/storage/v1/object/public/pet-images/mock-moderation/lookalike.png', 'mock-moderation/lookalike.png', 'approved', null, now() - interval '100 minutes'
from pets.species s join pets.breeds b on b.species_id = s.id and b.name = 'Unknown/Mixed' where s.name = 'Dog';
insert into pets.pet_media (id, pet_id, kind, url, storage_path, display_order, moderation_status, moderation_rejection_code, created_at)
-- [EDIT 3a] puppies.mp4 was not supplied; this row points at an image so the row still exists. Swap back when the video arrives.
values ('00000000-0000-4000-d000-000000000006', '00000000-0000-4000-c000-000000000006', 'image', current_setting('mock.supabase_url') || '/storage/v1/object/public/pet-images/mock-moderation/dog-bath.png', 'mock-moderation/dog-bath.png', 0, 'in_review', null, now() - interval '100 minutes');
update social.posts set caption = '[MOCK] video-review', moderation_status = 'in_review' where id = '00000000-0000-4000-d000-000000000006';
insert into moderation.decisions (
  id, account_id, pet_id, media_type, media_id, storage_path, media_sha256, media_size_bytes, content_type, context,
  decision, rejection_code, hard_reject, pet_score, composite_score, dimension_scores, ai_generated, ai_score,
  reason_codes, flags, species_detected, detected_objects, processing_ms, model_version, created_at,
  review_status, final_decision, final_rejection_code, incorrect_reason_codes, missing_reason_codes, remarks, reviewed_by, reviewed_at,
  declared_breed_id, declared_is_cross_breed, breed_status, breed_match_score, detected_breed_id, detected_breed_name, detected_breed_score
) values (
  '00000000-0000-4000-a000-000000000006', '00000000-0000-4000-b000-000000000006', '00000000-0000-4000-c000-000000000006', -- [EDIT 3b] matches EDIT 3a: image in place of the missing video.
  'pet_media', '00000000-0000-4000-d000-000000000006', 'pet-images/mock-moderation/dog-bath.png', 'ebd8e4524f1c4ce816cbca7714af514ccdb7977cc18897b8fb91150a172a3c09', 11485, 'image', 'post',
  'HUMAN_REVIEW', null, false, 94.0, 68.0, '{"D1_welfare": 80.0, "D2_nsfw": 100.0, "D3_violence": 70.0, "D4_prohibited": 100.0, "D5_quality": 88.0, "D6_relevance": 94.0}'::jsonb, false, 8.0,
  array['violence_animal_aggression', 'audio_distress']::text[], array['validation_passed', 'violence_animal_aggression', 'audio_distress', 'gate2_review']::text[], array['dog']::text[], '[{"label": "dog", "score": 0.9, "kind": "animal"}]'::jsonb, 1950, 'validation-0.1+gate1-fused-0.7.1+gate2-0.19.2+mock', now() - interval '100 minutes',
  'pending', null, null, '{}'::text[], '{}'::text[], null, null, null,
  null, null, 'not_checked', null, null, null, null
);

-- ===== 7. profile-photo =====
insert into identity.accounts (id, auth_user_id, email, display_name, status, created_at)
values ('00000000-0000-4000-b000-000000000007', '00000000-0000-4000-f000-000000000008', 'mock-user-07@example.invalid', 'Mock User 07', 'active', now() - interval '80 minutes');
insert into identity.account_profiles (id, account_id, name, created_at)
values ('00000000-0000-4000-9000-000000000007', '00000000-0000-4000-b000-000000000007', 'Mock User 07', now() - interval '80 minutes');
insert into pets.pets (id, owner_account_id, species_id, breed_id, name, status, profile_photo_url, profile_photo_path,
                       profile_photo_moderation_status, profile_photo_moderation_rejection_code, created_at)
select '00000000-0000-4000-c000-000000000007', '00000000-0000-4000-b000-000000000007', s.id, b.id, 'Mock Pet 07', 'active', current_setting('mock.supabase_url') || '/storage/v1/object/public/pet-images/mock-moderation/lookalike.png', 'mock-moderation/lookalike.png', 'in_review', null, now() - interval '80 minutes'
from pets.species s join pets.breeds b on b.species_id = s.id and b.name = 'Unknown/Mixed' where s.name = 'Dog';
insert into moderation.decisions (
  id, account_id, pet_id, media_type, media_id, storage_path, media_sha256, media_size_bytes, content_type, context,
  decision, rejection_code, hard_reject, pet_score, composite_score, dimension_scores, ai_generated, ai_score,
  reason_codes, flags, species_detected, detected_objects, processing_ms, model_version, created_at,
  review_status, final_decision, final_rejection_code, incorrect_reason_codes, missing_reason_codes, remarks, reviewed_by, reviewed_at,
  declared_breed_id, declared_is_cross_breed, breed_status, breed_match_score, detected_breed_id, detected_breed_name, detected_breed_score
) values (
  '00000000-0000-4000-a000-000000000007', '00000000-0000-4000-b000-000000000007', '00000000-0000-4000-c000-000000000007', 'pet_profile_photo', '00000000-0000-4000-c000-000000000007', 'pet-images/mock-moderation/lookalike.png', '390e9372f0b482d872eb928f3db4fd67b28916e40bbe34466dbb635da5361a72', 10274, 'image', 'profile',
  'HUMAN_REVIEW', null, false, 77.0, 90.0, '{"D1_welfare": 100.0, "D2_nsfw": 100.0, "D3_violence": 100.0, "D4_prohibited": 100.0, "D5_quality": 88.0, "D6_relevance": 94.0}'::jsonb, false, 8.0,
  array['gate1_head_doubt', 'gate1_borderline']::text[], array['validation_passed', 'gate1_head_doubt', 'gate1_borderline', 'gate2_review']::text[], array['dog']::text[], '[{"label": "dog", "score": 0.9, "kind": "animal"}]'::jsonb, 1950, 'validation-0.1+gate1-fused-0.7.1+gate2-0.19.2+mock', now() - interval '80 minutes',
  'pending', null, null, '{}'::text[], '{}'::text[], null, null, null,
  null, null, 'not_checked', null, null, null, null
);

-- ===== 8. wild-animal =====
insert into identity.accounts (id, auth_user_id, email, display_name, status, created_at)
values ('00000000-0000-4000-b000-000000000008', '00000000-0000-4000-f000-000000000009', 'mock-user-08@example.invalid', 'Mock User 08', 'active', now() - interval '60 minutes');
insert into identity.account_profiles (id, account_id, name, created_at)
values ('00000000-0000-4000-9000-000000000008', '00000000-0000-4000-b000-000000000008', 'Mock User 08', now() - interval '60 minutes');
insert into pets.pets (id, owner_account_id, species_id, breed_id, name, status, profile_photo_url, profile_photo_path,
                       profile_photo_moderation_status, profile_photo_moderation_rejection_code, created_at)
select '00000000-0000-4000-c000-000000000008', '00000000-0000-4000-b000-000000000008', s.id, b.id, 'Mock Pet 08', 'active', current_setting('mock.supabase_url') || '/storage/v1/object/public/pet-images/mock-moderation/lookalike.png', 'mock-moderation/lookalike.png', 'approved', null, now() - interval '60 minutes'
-- [EDIT 2] 'Other Exotic Pets' does not exist in mmp-staging (Dog, Cat, Bird, Rabbit, Reptile, Small Pet, Goat).
from pets.species s join pets.breeds b on b.species_id = s.id and b.name = 'Unknown/Mixed' where s.name = 'Reptile';
insert into pets.pet_media (id, pet_id, kind, url, storage_path, display_order, moderation_status, moderation_rejection_code, created_at)
values ('00000000-0000-4000-d000-000000000008', '00000000-0000-4000-c000-000000000008', 'image', current_setting('mock.supabase_url') || '/storage/v1/object/public/pet-images/mock-moderation/tiger.png', 'mock-moderation/tiger.png', 0, 'in_review', null, now() - interval '60 minutes');
update social.posts set caption = '[MOCK] wild-animal', moderation_status = 'in_review' where id = '00000000-0000-4000-d000-000000000008';
insert into moderation.decisions (
  id, account_id, pet_id, media_type, media_id, storage_path, media_sha256, media_size_bytes, content_type, context,
  decision, rejection_code, hard_reject, pet_score, composite_score, dimension_scores, ai_generated, ai_score,
  reason_codes, flags, species_detected, detected_objects, processing_ms, model_version, created_at,
  review_status, final_decision, final_rejection_code, incorrect_reason_codes, missing_reason_codes, remarks, reviewed_by, reviewed_at,
  declared_breed_id, declared_is_cross_breed, breed_status, breed_match_score, detected_breed_id, detected_breed_name, detected_breed_score
) values (
  '00000000-0000-4000-a000-000000000008', '00000000-0000-4000-b000-000000000008', '00000000-0000-4000-c000-000000000008', 'pet_media', '00000000-0000-4000-d000-000000000008', 'pet-images/mock-moderation/tiger.png', '4e9a04f6aca240b521a0f8a528aeae22c7900f98fed0d06e82a04c8a797ee06f', 9107, 'image', 'post',
  'HUMAN_REVIEW', null, false, 88.0, 92.0, '{"D1_welfare": 100.0, "D2_nsfw": 100.0, "D3_violence": 100.0, "D4_prohibited": 100.0, "D5_quality": 88.0, "D6_relevance": 94.0}'::jsonb, false, 8.0,
  array['wild_context']::text[], array['validation_passed', 'wild_context', 'gate2_review']::text[], array['tiger']::text[], '[{"label": "tiger", "score": 0.9, "kind": "animal"}]'::jsonb, 1950, 'validation-0.1+gate1-fused-0.7.1+gate2-0.19.2+mock', now() - interval '60 minutes',
  'pending', null, null, '{}'::text[], '{}'::text[], null, null, null,
  null, null, 'not_checked', null, null, null, null
);

-- ===== 9. keep-problem-approve =====
insert into identity.accounts (id, auth_user_id, email, display_name, status, created_at)
values ('00000000-0000-4000-b000-000000000009', '00000000-0000-4000-f000-000000000010', 'mock-user-09@example.invalid', 'Mock User 09', 'active', now() - interval '45 minutes');
insert into identity.account_profiles (id, account_id, name, created_at)
values ('00000000-0000-4000-9000-000000000009', '00000000-0000-4000-b000-000000000009', 'Mock User 09', now() - interval '45 minutes');
insert into pets.pets (id, owner_account_id, species_id, breed_id, name, status, profile_photo_url, profile_photo_path,
                       profile_photo_moderation_status, profile_photo_moderation_rejection_code, created_at)
select '00000000-0000-4000-c000-000000000009', '00000000-0000-4000-b000-000000000009', s.id, b.id, 'Mock Pet 09', 'active', current_setting('mock.supabase_url') || '/storage/v1/object/public/pet-images/mock-moderation/lookalike.png', 'mock-moderation/lookalike.png', 'approved', null, now() - interval '45 minutes'
from pets.species s join pets.breeds b on b.species_id = s.id and b.name = 'Unknown/Mixed' where s.name = 'Dog';
insert into pets.pet_media (id, pet_id, kind, url, storage_path, display_order, moderation_status, moderation_rejection_code, created_at)
values ('00000000-0000-4000-d000-000000000009', '00000000-0000-4000-c000-000000000009', 'image', current_setting('mock.supabase_url') || '/storage/v1/object/public/pet-images/mock-moderation/party.png', 'mock-moderation/party.png', 0, 'in_review', null, now() - interval '45 minutes');
update social.posts set caption = '[MOCK] keep-problem-approve', moderation_status = 'in_review' where id = '00000000-0000-4000-d000-000000000009';
insert into moderation.decisions (
  id, account_id, pet_id, media_type, media_id, storage_path, media_sha256, media_size_bytes, content_type, context,
  decision, rejection_code, hard_reject, pet_score, composite_score, dimension_scores, ai_generated, ai_score,
  reason_codes, flags, species_detected, detected_objects, processing_ms, model_version, created_at,
  review_status, final_decision, final_rejection_code, incorrect_reason_codes, missing_reason_codes, remarks, reviewed_by, reviewed_at,
  declared_breed_id, declared_is_cross_breed, breed_status, breed_match_score, detected_breed_id, detected_breed_name, detected_breed_score
) values (
  '00000000-0000-4000-a000-000000000009', '00000000-0000-4000-b000-000000000009', '00000000-0000-4000-c000-000000000009', 'pet_media', '00000000-0000-4000-d000-000000000009', 'pet-images/mock-moderation/party.png', '46c79ba62e4f74d05f9e8b2b0b50d3e3397a4020126580c18c1e10a277a944be', 11377, 'image', 'post',
  'HUMAN_REVIEW', null, false, 90.0, 79.0, '{"D1_welfare": 100.0, "D2_nsfw": 100.0, "D3_violence": 100.0, "D4_prohibited": 80.0, "D5_quality": 88.0, "D6_relevance": 94.0}'::jsonb, false, 8.0,
  array['item_alcohol', 'guard_concern_items']::text[], array['validation_passed', 'item_alcohol', 'guard_concern_items', 'gate2_review']::text[], array['dog']::text[], '[{"label": "dog", "score": 0.9, "kind": "animal"}]'::jsonb, 1950, 'validation-0.1+gate1-fused-0.7.1+gate2-0.19.2+mock', now() - interval '45 minutes',
  'pending', null, null, '{}'::text[], '{}'::text[], null, null, null,
  null, null, 'not_checked', null, null, null, null
);

-- ===== 10. ai-generated-label =====
insert into identity.accounts (id, auth_user_id, email, display_name, status, created_at)
values ('00000000-0000-4000-b000-000000000010', '00000000-0000-4000-f000-000000000011', 'mock-user-10@example.invalid', 'Mock User 10', 'active', now() - interval '30 minutes');
insert into identity.account_profiles (id, account_id, name, created_at)
values ('00000000-0000-4000-9000-000000000010', '00000000-0000-4000-b000-000000000010', 'Mock User 10', now() - interval '30 minutes');
insert into pets.pets (id, owner_account_id, species_id, breed_id, name, status, profile_photo_url, profile_photo_path,
                       profile_photo_moderation_status, profile_photo_moderation_rejection_code, created_at)
select '00000000-0000-4000-c000-000000000010', '00000000-0000-4000-b000-000000000010', s.id, b.id, 'Mock Pet 10', 'active', current_setting('mock.supabase_url') || '/storage/v1/object/public/pet-images/mock-moderation/lookalike.png', 'mock-moderation/lookalike.png', 'approved', null, now() - interval '30 minutes'
from pets.species s join pets.breeds b on b.species_id = s.id and b.name = 'Unknown/Mixed' where s.name = 'Dog';
insert into social.posts (id, pet_id, caption, moderation_status, created_at)
values ('00000000-0000-4000-8000-000000000010', '00000000-0000-4000-c000-000000000010', '[MOCK] ai-generated-label', 'in_review', now() - interval '30 minutes');
insert into social.post_media (id, post_id, storage_path, media_type, sort_order, moderation_status, moderation_rejection_code, created_at)
values ('00000000-0000-4000-d000-000000000010', '00000000-0000-4000-8000-000000000010', 'post-media/mock-moderation/ai-dog.png', 'photo', 0, 'in_review', null, now() - interval '30 minutes');
insert into moderation.decisions (
  id, account_id, pet_id, media_type, media_id, storage_path, media_sha256, media_size_bytes, content_type, context,
  decision, rejection_code, hard_reject, pet_score, composite_score, dimension_scores, ai_generated, ai_score,
  reason_codes, flags, species_detected, detected_objects, processing_ms, model_version, created_at,
  review_status, final_decision, final_rejection_code, incorrect_reason_codes, missing_reason_codes, remarks, reviewed_by, reviewed_at,
  declared_breed_id, declared_is_cross_breed, breed_status, breed_match_score, detected_breed_id, detected_breed_name, detected_breed_score
) values (
  '00000000-0000-4000-a000-000000000010', '00000000-0000-4000-b000-000000000010', null, 'post_media', '00000000-0000-4000-d000-000000000010', 'post-media/mock-moderation/ai-dog.png', 'f755ca0993bedbba1804dfdada97a0380c43b076e8c50782abb319135d263015', 9958, 'image', 'post',
  'HUMAN_REVIEW', null, false, 85.0, 83.0, '{"D1_welfare": 90.0, "D2_nsfw": 100.0, "D3_violence": 100.0, "D4_prohibited": 100.0, "D5_quality": 88.0, "D6_relevance": 94.0}'::jsonb, true, 91.0,
  array['guard_concern_welfare']::text[], array['validation_passed', 'guard_concern_welfare', 'gate2_review']::text[], array['dog']::text[], '[{"label": "dog", "score": 0.9, "kind": "animal"}]'::jsonb, 1950, 'validation-0.1+gate1-fused-0.7.1+gate2-0.19.2+mock', now() - interval '30 minutes',
  'pending', null, null, '{}'::text[], '{}'::text[], null, null, null,
  null, null, 'not_checked', null, null, null, null
);

-- ===== 11. low-score =====
insert into identity.accounts (id, auth_user_id, email, display_name, status, created_at)
values ('00000000-0000-4000-b000-000000000011', '00000000-0000-4000-f000-000000000012', 'mock-user-11@example.invalid', 'Mock User 11', 'active', now() - interval '20 minutes');
insert into identity.account_profiles (id, account_id, name, created_at)
values ('00000000-0000-4000-9000-000000000011', '00000000-0000-4000-b000-000000000011', 'Mock User 11', now() - interval '20 minutes');
insert into pets.pets (id, owner_account_id, species_id, breed_id, name, status, profile_photo_url, profile_photo_path,
                       profile_photo_moderation_status, profile_photo_moderation_rejection_code, created_at)
select '00000000-0000-4000-c000-000000000011', '00000000-0000-4000-b000-000000000011', s.id, b.id, 'Mock Pet 11', 'active', current_setting('mock.supabase_url') || '/storage/v1/object/public/pet-images/mock-moderation/lookalike.png', 'mock-moderation/lookalike.png', 'approved', null, now() - interval '20 minutes'
from pets.species s join pets.breeds b on b.species_id = s.id and b.name = 'Unknown/Mixed' where s.name = 'Cat';
insert into pets.pet_media (id, pet_id, kind, url, storage_path, display_order, moderation_status, moderation_rejection_code, created_at)
values ('00000000-0000-4000-d000-000000000011', '00000000-0000-4000-c000-000000000011', 'image', current_setting('mock.supabase_url') || '/storage/v1/object/public/pet-images/mock-moderation/dark.png', 'mock-moderation/dark.png', 0, 'in_review', null, now() - interval '20 minutes');
update social.posts set caption = '[MOCK] low-score', moderation_status = 'in_review' where id = '00000000-0000-4000-d000-000000000011';
insert into moderation.decisions (
  id, account_id, pet_id, media_type, media_id, storage_path, media_sha256, media_size_bytes, content_type, context,
  decision, rejection_code, hard_reject, pet_score, composite_score, dimension_scores, ai_generated, ai_score,
  reason_codes, flags, species_detected, detected_objects, processing_ms, model_version, created_at,
  review_status, final_decision, final_rejection_code, incorrect_reason_codes, missing_reason_codes, remarks, reviewed_by, reviewed_at,
  declared_breed_id, declared_is_cross_breed, breed_status, breed_match_score, detected_breed_id, detected_breed_name, detected_breed_score
) values (
  '00000000-0000-4000-a000-000000000011', '00000000-0000-4000-b000-000000000011', '00000000-0000-4000-c000-000000000011', 'pet_media', '00000000-0000-4000-d000-000000000011', 'pet-images/mock-moderation/dark.png', '3a4d9c3e0bf513c9135a3ab43498eeb04dcd6d6a45439535dff717ff5787e8c9', 11111, 'image', 'post',
  'REJECTED', 'MOD_007', false, 76.0, 48.0, '{"D1_welfare": 100.0, "D2_nsfw": 100.0, "D3_violence": 100.0, "D4_prohibited": 100.0, "D5_quality": 20.0, "D6_relevance": 30.0}'::jsonb, false, 8.0,
  array['low_composite']::text[], array['validation_passed', 'low_composite']::text[], array['cat']::text[], '[{"label": "cat", "score": 0.9, "kind": "animal"}]'::jsonb, 1950, 'validation-0.1+gate1-fused-0.7.1+gate2-0.19.2+mock', now() - interval '20 minutes',
  'pending', null, null, '{}'::text[], '{}'::text[], null, null, null,
  null, null, 'not_checked', null, null, null, null
);

-- ===== 12. newest =====
insert into identity.accounts (id, auth_user_id, email, display_name, status, created_at)
values ('00000000-0000-4000-b000-000000000012', '00000000-0000-4000-f000-000000000013', 'mock-user-12@example.invalid', 'Mock User 12', 'active', now() - interval '5 minutes');
insert into identity.account_profiles (id, account_id, name, created_at)
values ('00000000-0000-4000-9000-000000000012', '00000000-0000-4000-b000-000000000012', 'Mock User 12', now() - interval '5 minutes');
insert into pets.pets (id, owner_account_id, species_id, breed_id, name, status, profile_photo_url, profile_photo_path,
                       profile_photo_moderation_status, profile_photo_moderation_rejection_code, created_at)
select '00000000-0000-4000-c000-000000000012', '00000000-0000-4000-b000-000000000012', s.id, b.id, 'Mock Pet 12', 'active', current_setting('mock.supabase_url') || '/storage/v1/object/public/pet-images/mock-moderation/lookalike.png', 'mock-moderation/lookalike.png', 'approved', null, now() - interval '5 minutes'
from pets.species s join pets.breeds b on b.species_id = s.id and b.name = 'Unknown/Mixed' where s.name = 'Rabbit';
insert into pets.pet_media (id, pet_id, kind, url, storage_path, display_order, moderation_status, moderation_rejection_code, created_at)
values ('00000000-0000-4000-d000-000000000012', '00000000-0000-4000-c000-000000000012', 'image', current_setting('mock.supabase_url') || '/storage/v1/object/public/pet-images/mock-moderation/rabbit.png', 'mock-moderation/rabbit.png', 0, 'in_review', null, now() - interval '5 minutes');
update social.posts set caption = '[MOCK] newest', moderation_status = 'in_review' where id = '00000000-0000-4000-d000-000000000012';
insert into moderation.decisions (
  id, account_id, pet_id, media_type, media_id, storage_path, media_sha256, media_size_bytes, content_type, context,
  decision, rejection_code, hard_reject, pet_score, composite_score, dimension_scores, ai_generated, ai_score,
  reason_codes, flags, species_detected, detected_objects, processing_ms, model_version, created_at,
  review_status, final_decision, final_rejection_code, incorrect_reason_codes, missing_reason_codes, remarks, reviewed_by, reviewed_at,
  declared_breed_id, declared_is_cross_breed, breed_status, breed_match_score, detected_breed_id, detected_breed_name, detected_breed_score
) values (
  '00000000-0000-4000-a000-000000000012', '00000000-0000-4000-b000-000000000012', '00000000-0000-4000-c000-000000000012', 'pet_media', '00000000-0000-4000-d000-000000000012', 'pet-images/mock-moderation/rabbit.png', '246019948c80fa3e79e6ff6119cc391334cb4f41504fb684a552ba316a2f2cb5', 9246, 'image', 'post',
  'HUMAN_REVIEW', null, false, 89.0, 78.0, '{"D1_welfare": 70.0, "D2_nsfw": 100.0, "D3_violence": 100.0, "D4_prohibited": 100.0, "D5_quality": 88.0, "D6_relevance": 94.0}'::jsonb, false, 8.0,
  array['welfare_neglect']::text[], array['validation_passed', 'welfare_neglect', 'gate2_review']::text[], array['rabbit']::text[], '[{"label": "rabbit", "score": 0.9, "kind": "animal"}]'::jsonb, 1950, 'validation-0.1+gate1-fused-0.7.1+gate2-0.19.2+mock', now() - interval '5 minutes',
  'pending', null, null, '{}'::text[], '{}'::text[], null, null, null,
  null, null, 'not_checked', null, null, null, null
);

-- ===== 13. approved-no-review =====
insert into identity.accounts (id, auth_user_id, email, display_name, status, created_at)
values ('00000000-0000-4000-b000-000000000013', '00000000-0000-4000-f000-000000000014', 'mock-user-13@example.invalid', 'Mock User 13', 'active', now() - interval '400 minutes');
insert into identity.account_profiles (id, account_id, name, created_at)
values ('00000000-0000-4000-9000-000000000013', '00000000-0000-4000-b000-000000000013', 'Mock User 13', now() - interval '400 minutes');
insert into pets.pets (id, owner_account_id, species_id, breed_id, name, status, profile_photo_url, profile_photo_path,
                       profile_photo_moderation_status, profile_photo_moderation_rejection_code, created_at)
select '00000000-0000-4000-c000-000000000013', '00000000-0000-4000-b000-000000000013', s.id, b.id, 'Mock Pet 13', 'active', current_setting('mock.supabase_url') || '/storage/v1/object/public/pet-images/mock-moderation/lookalike.png', 'mock-moderation/lookalike.png', 'approved', null, now() - interval '400 minutes'
from pets.species s join pets.breeds b on b.species_id = s.id and b.name = 'Unknown/Mixed' where s.name = 'Rabbit';
insert into pets.pet_media (id, pet_id, kind, url, storage_path, display_order, moderation_status, moderation_rejection_code, created_at)
values ('00000000-0000-4000-d000-000000000013', '00000000-0000-4000-c000-000000000013', 'image', current_setting('mock.supabase_url') || '/storage/v1/object/public/pet-images/mock-moderation/rabbit.png', 'mock-moderation/rabbit.png', 0, 'approved', null, now() - interval '400 minutes');
update social.posts set caption = '[MOCK] approved-no-review', moderation_status = 'approved' where id = '00000000-0000-4000-d000-000000000013';
insert into moderation.decisions (
  id, account_id, pet_id, media_type, media_id, storage_path, media_sha256, media_size_bytes, content_type, context,
  decision, rejection_code, hard_reject, pet_score, composite_score, dimension_scores, ai_generated, ai_score,
  reason_codes, flags, species_detected, detected_objects, processing_ms, model_version, created_at,
  review_status, final_decision, final_rejection_code, incorrect_reason_codes, missing_reason_codes, remarks, reviewed_by, reviewed_at,
  declared_breed_id, declared_is_cross_breed, breed_status, breed_match_score, detected_breed_id, detected_breed_name, detected_breed_score
) values (
  '00000000-0000-4000-a000-000000000013', '00000000-0000-4000-b000-000000000013', '00000000-0000-4000-c000-000000000013', 'pet_media', '00000000-0000-4000-d000-000000000013', 'pet-images/mock-moderation/rabbit.png', '246019948c80fa3e79e6ff6119cc391334cb4f41504fb684a552ba316a2f2cb5', 9246, 'image', 'post',
  'APPROVED', null, false, 90.0, 92.0, '{"D1_welfare": 100.0, "D2_nsfw": 100.0, "D3_violence": 100.0, "D4_prohibited": 100.0, "D5_quality": 88.0, "D6_relevance": 94.0}'::jsonb, false, 8.0,
  '{}'::text[], array['validation_passed', 'gate1_passed', 'd1_d3_zero_shot']::text[], array['rabbit']::text[], '[{"label": "rabbit", "score": 0.9, "kind": "animal"}]'::jsonb, 1950, 'validation-0.1+gate1-fused-0.7.1+gate2-0.19.2+mock', now() - interval '400 minutes',
  null, null, null, '{}'::text[], '{}'::text[], null, null, null,
  null, null, 'not_checked', null, null, null, null
);

-- ===== 14. bad-file =====
insert into identity.accounts (id, auth_user_id, email, display_name, status, created_at)
values ('00000000-0000-4000-b000-000000000014', '00000000-0000-4000-f000-000000000015', 'mock-user-14@example.invalid', 'Mock User 14', 'active', now() - interval '390 minutes');
insert into identity.account_profiles (id, account_id, name, created_at)
values ('00000000-0000-4000-9000-000000000014', '00000000-0000-4000-b000-000000000014', 'Mock User 14', now() - interval '390 minutes');
insert into pets.pets (id, owner_account_id, species_id, breed_id, name, status, profile_photo_url, profile_photo_path,
                       profile_photo_moderation_status, profile_photo_moderation_rejection_code, created_at)
select '00000000-0000-4000-c000-000000000014', '00000000-0000-4000-b000-000000000014', s.id, b.id, 'Mock Pet 14', 'active', current_setting('mock.supabase_url') || '/storage/v1/object/public/pet-images/mock-moderation/lookalike.png', 'mock-moderation/lookalike.png', 'approved', null, now() - interval '390 minutes'
from pets.species s join pets.breeds b on b.species_id = s.id and b.name = 'Unknown/Mixed' where s.name = 'Dog';
insert into pets.pet_media (id, pet_id, kind, url, storage_path, display_order, moderation_status, moderation_rejection_code, created_at)
values ('00000000-0000-4000-d000-000000000014', '00000000-0000-4000-c000-000000000014', 'image', current_setting('mock.supabase_url') || '/storage/v1/object/public/pet-images/mock-moderation/broken.png', 'mock-moderation/broken.png', 0, 'rejected', 'MOD_008', now() - interval '390 minutes');
update social.posts set caption = '[MOCK] bad-file', moderation_status = 'rejected' where id = '00000000-0000-4000-d000-000000000014';
insert into moderation.decisions (
  id, account_id, pet_id, media_type, media_id, storage_path, media_sha256, media_size_bytes, content_type, context,
  decision, rejection_code, hard_reject, pet_score, composite_score, dimension_scores, ai_generated, ai_score,
  reason_codes, flags, species_detected, detected_objects, processing_ms, model_version, created_at,
  review_status, final_decision, final_rejection_code, incorrect_reason_codes, missing_reason_codes, remarks, reviewed_by, reviewed_at,
  declared_breed_id, declared_is_cross_breed, breed_status, breed_match_score, detected_breed_id, detected_breed_name, detected_breed_score
) values (
  '00000000-0000-4000-a000-000000000014', '00000000-0000-4000-b000-000000000014', '00000000-0000-4000-c000-000000000014', 'pet_media', '00000000-0000-4000-d000-000000000014', 'pet-images/mock-moderation/broken.png', null, null, 'image', 'post',
  'REJECTED', 'MOD_008', false, null, null, null, null, null,
  array['corrupt_file']::text[], array['corrupt_file']::text[], '{}'::text[], null, 1950, 'validation-0.1+gate1-fused-0.7.1+gate2-0.19.2+mock', now() - interval '390 minutes',
  null, null, null, '{}'::text[], '{}'::text[], null, null, null,
  null, null, 'not_checked', null, null, null, null
);

-- ===== 15. reviewed-approved =====
insert into identity.accounts (id, auth_user_id, email, display_name, status, created_at)
values ('00000000-0000-4000-b000-000000000015', '00000000-0000-4000-f000-000000000016', 'mock-user-15@example.invalid', 'Mock User 15', 'active', now() - interval '380 minutes');
insert into identity.account_profiles (id, account_id, name, created_at)
values ('00000000-0000-4000-9000-000000000015', '00000000-0000-4000-b000-000000000015', 'Mock User 15', now() - interval '380 minutes');
insert into pets.pets (id, owner_account_id, species_id, breed_id, name, status, profile_photo_url, profile_photo_path,
                       profile_photo_moderation_status, profile_photo_moderation_rejection_code, created_at)
select '00000000-0000-4000-c000-000000000015', '00000000-0000-4000-b000-000000000015', s.id, b.id, 'Mock Pet 15', 'active', current_setting('mock.supabase_url') || '/storage/v1/object/public/pet-images/mock-moderation/lookalike.png', 'mock-moderation/lookalike.png', 'approved', null, now() - interval '380 minutes'
from pets.species s join pets.breeds b on b.species_id = s.id and b.name = 'Unknown/Mixed' where s.name = 'Dog';
insert into pets.pet_media (id, pet_id, kind, url, storage_path, display_order, moderation_status, moderation_rejection_code, created_at)
values ('00000000-0000-4000-d000-000000000015', '00000000-0000-4000-c000-000000000015', 'image', current_setting('mock.supabase_url') || '/storage/v1/object/public/pet-images/mock-moderation/dog-bath.png', 'mock-moderation/dog-bath.png', 0, 'approved', null, now() - interval '380 minutes');
update social.posts set caption = '[MOCK] reviewed-approved', moderation_status = 'approved' where id = '00000000-0000-4000-d000-000000000015';
insert into moderation.decisions (
  id, account_id, pet_id, media_type, media_id, storage_path, media_sha256, media_size_bytes, content_type, context,
  decision, rejection_code, hard_reject, pet_score, composite_score, dimension_scores, ai_generated, ai_score,
  reason_codes, flags, species_detected, detected_objects, processing_ms, model_version, created_at,
  review_status, final_decision, final_rejection_code, incorrect_reason_codes, missing_reason_codes, remarks, reviewed_by, reviewed_at,
  declared_breed_id, declared_is_cross_breed, breed_status, breed_match_score, detected_breed_id, detected_breed_name, detected_breed_score
) values (
  '00000000-0000-4000-a000-000000000015', '00000000-0000-4000-b000-000000000015', '00000000-0000-4000-c000-000000000015', 'pet_media', '00000000-0000-4000-d000-000000000015', 'pet-images/mock-moderation/dog-bath.png', 'ebd8e4524f1c4ce816cbca7714af514ccdb7977cc18897b8fb91150a172a3c09', 11485, 'image', 'post',
  'HUMAN_REVIEW', null, false, 90.0, 71.5, '{"D1_welfare": 100.0, "D2_nsfw": 100.0, "D3_violence": 100.0, "D4_prohibited": 100.0, "D5_quality": 88.0, "D6_relevance": 94.0}'::jsonb, false, 8.0,
  array['welfare_distress']::text[], array['validation_passed', 'welfare_distress']::text[], array['dog']::text[], '[{"label": "dog", "score": 0.9, "kind": "animal"}]'::jsonb, 1950, 'validation-0.1+gate1-fused-0.7.1+gate2-0.19.2+mock', now() - interval '380 minutes',
  'done', 'APPROVED', null, array['welfare_distress']::text[], array['fine_grooming']::text[], 'Ordinary bath, the dog is calm.', '00000000-0000-4000-e000-000000000001', now() - interval '380 minutes' + interval '30 minutes',
  null, null, 'not_checked', null, null, null, null
);

-- ===== 16. reviewed-rejected =====
insert into identity.accounts (id, auth_user_id, email, display_name, status, created_at)
values ('00000000-0000-4000-b000-000000000016', '00000000-0000-4000-f000-000000000017', 'mock-user-16@example.invalid', 'Mock User 16', 'active', now() - interval '370 minutes');
insert into identity.account_profiles (id, account_id, name, created_at)
values ('00000000-0000-4000-9000-000000000016', '00000000-0000-4000-b000-000000000016', 'Mock User 16', now() - interval '370 minutes');
insert into pets.pets (id, owner_account_id, species_id, breed_id, name, status, profile_photo_url, profile_photo_path,
                       profile_photo_moderation_status, profile_photo_moderation_rejection_code, created_at)
select '00000000-0000-4000-c000-000000000016', '00000000-0000-4000-b000-000000000016', s.id, b.id, 'Mock Pet 16', 'active', current_setting('mock.supabase_url') || '/storage/v1/object/public/pet-images/mock-moderation/lookalike.png', 'mock-moderation/lookalike.png', 'approved', null, now() - interval '370 minutes'
from pets.species s join pets.breeds b on b.species_id = s.id and b.name = 'Unknown/Mixed' where s.name = 'Dog';
insert into pets.pet_media (id, pet_id, kind, url, storage_path, display_order, moderation_status, moderation_rejection_code, created_at)
values ('00000000-0000-4000-d000-000000000016', '00000000-0000-4000-c000-000000000016', 'image', current_setting('mock.supabase_url') || '/storage/v1/object/public/pet-images/mock-moderation/welfare-placeholder.png', 'mock-moderation/welfare-placeholder.png', 0, 'rejected', 'MOD_002', now() - interval '370 minutes');
update social.posts set caption = '[MOCK] reviewed-rejected', moderation_status = 'rejected' where id = '00000000-0000-4000-d000-000000000016';
insert into moderation.decisions (
  id, account_id, pet_id, media_type, media_id, storage_path, media_sha256, media_size_bytes, content_type, context,
  decision, rejection_code, hard_reject, pet_score, composite_score, dimension_scores, ai_generated, ai_score,
  reason_codes, flags, species_detected, detected_objects, processing_ms, model_version, created_at,
  review_status, final_decision, final_rejection_code, incorrect_reason_codes, missing_reason_codes, remarks, reviewed_by, reviewed_at,
  declared_breed_id, declared_is_cross_breed, breed_status, breed_match_score, detected_breed_id, detected_breed_name, detected_breed_score
) values (
  '00000000-0000-4000-a000-000000000016', '00000000-0000-4000-b000-000000000016', '00000000-0000-4000-c000-000000000016', 'pet_media', '00000000-0000-4000-d000-000000000016', 'pet-images/mock-moderation/welfare-placeholder.png', '4c72f317678e2a67e0655a7dcd32d0863c262ed547a92a5eb6209368ddb8134a', 11606, 'image', 'post',
  'HUMAN_REVIEW', null, false, 90.0, 68.0, '{"D1_welfare": 100.0, "D2_nsfw": 100.0, "D3_violence": 100.0, "D4_prohibited": 100.0, "D5_quality": 88.0, "D6_relevance": 94.0}'::jsonb, false, 8.0,
  array['welfare_distress']::text[], array['validation_passed', 'welfare_distress']::text[], array['dog']::text[], '[{"label": "dog", "score": 0.9, "kind": "animal"}]'::jsonb, 1950, 'validation-0.1+gate1-fused-0.7.1+gate2-0.19.2+mock', now() - interval '370 minutes',
  'done', 'REJECTED', 'MOD_002', '{}'::text[], array['welfare_abuse']::text[], null, '00000000-0000-4000-e000-000000000001', now() - interval '370 minutes' + interval '30 minutes',
  null, null, 'not_checked', null, null, null, null
);

-- ===== 17. quarantined =====
insert into identity.accounts (id, auth_user_id, email, display_name, status, created_at)
values ('00000000-0000-4000-b000-000000000017', '00000000-0000-4000-f000-000000000018', 'mock-user-17@example.invalid', 'Mock User 17', 'active', now() - interval '360 minutes');
insert into identity.account_profiles (id, account_id, name, created_at)
values ('00000000-0000-4000-9000-000000000017', '00000000-0000-4000-b000-000000000017', 'Mock User 17', now() - interval '360 minutes');
insert into pets.pets (id, owner_account_id, species_id, breed_id, name, status, profile_photo_url, profile_photo_path,
                       profile_photo_moderation_status, profile_photo_moderation_rejection_code, created_at)
select '00000000-0000-4000-c000-000000000017', '00000000-0000-4000-b000-000000000017', s.id, b.id, 'Mock Pet 17', 'active', current_setting('mock.supabase_url') || '/storage/v1/object/public/pet-images/mock-moderation/lookalike.png', 'mock-moderation/lookalike.png', 'approved', null, now() - interval '360 minutes'
from pets.species s join pets.breeds b on b.species_id = s.id and b.name = 'Unknown/Mixed' where s.name = 'Dog';
insert into pets.pet_media (id, pet_id, kind, url, storage_path, display_order, moderation_status, moderation_rejection_code, created_at)
values ('00000000-0000-4000-d000-000000000017', '00000000-0000-4000-c000-000000000017', 'image', current_setting('mock.supabase_url') || '/storage/v1/object/public/pet-images/mock-moderation/quarantined.png', 'mock-moderation/quarantined.png', 0, 'rejected', 'MOD_004', now() - interval '360 minutes');
update social.posts set caption = '[MOCK] quarantined', moderation_status = 'rejected' where id = '00000000-0000-4000-d000-000000000017';
insert into moderation.decisions (
  id, account_id, pet_id, media_type, media_id, storage_path, media_sha256, media_size_bytes, content_type, context,
  decision, rejection_code, hard_reject, pet_score, composite_score, dimension_scores, ai_generated, ai_score,
  reason_codes, flags, species_detected, detected_objects, processing_ms, model_version, created_at,
  review_status, final_decision, final_rejection_code, incorrect_reason_codes, missing_reason_codes, remarks, reviewed_by, reviewed_at,
  declared_breed_id, declared_is_cross_breed, breed_status, breed_match_score, detected_breed_id, detected_breed_name, detected_breed_score
) values (
  '00000000-0000-4000-a000-000000000999', '00000000-0000-4000-b000-000000000017', '00000000-0000-4000-c000-000000000017', 'pet_media', '00000000-0000-4000-d000-000000000017', 'pet-images/mock-moderation/quarantined.png', null, null, 'image', 'post',
  'REJECTED', 'MOD_004', true, null, null, null, null, null,
  array['quarantined']::text[], array['quarantined']::text[], '{}'::text[], null, 1950, 'validation-0.1+gate1-fused-0.7.1+gate2-0.19.2+mock', now() - interval '360 minutes',
  null, null, null, '{}'::text[], '{}'::text[], null, null, null,
  null, null, 'not_checked', null, null, null, null
);

-- ===== 18. breed-unmatched =====
insert into identity.accounts (id, auth_user_id, email, display_name, status, created_at)
values ('00000000-0000-4000-b000-000000000018', '00000000-0000-4000-f000-000000000019', 'mock-user-18@example.invalid', 'Mock User 18', 'active', now() - interval '350 minutes');
insert into identity.account_profiles (id, account_id, name, created_at)
values ('00000000-0000-4000-9000-000000000018', '00000000-0000-4000-b000-000000000018', 'Mock User 18', now() - interval '350 minutes');
insert into pets.pets (id, owner_account_id, species_id, breed_id, name, status, profile_photo_url, profile_photo_path,
                       profile_photo_moderation_status, profile_photo_moderation_rejection_code, created_at)
select '00000000-0000-4000-c000-000000000018', '00000000-0000-4000-b000-000000000018', s.id, b.id, 'Mock Pet 18', 'active', current_setting('mock.supabase_url') || '/storage/v1/object/public/pet-images/mock-moderation/lookalike.png', 'mock-moderation/lookalike.png', 'approved', null, now() - interval '350 minutes'
from pets.species s join pets.breeds b on b.species_id = s.id and b.name = 'Unknown/Mixed' where s.name = 'Dog';
insert into pets.pet_media (id, pet_id, kind, url, storage_path, display_order, moderation_status, moderation_rejection_code, created_at)
values ('00000000-0000-4000-d000-000000000018', '00000000-0000-4000-c000-000000000018', 'image', current_setting('mock.supabase_url') || '/storage/v1/object/public/pet-images/mock-moderation/lookalike.png', 'mock-moderation/lookalike.png', 0, 'approved', null, now() - interval '350 minutes');
update social.posts set caption = '[MOCK] breed-unmatched', moderation_status = 'approved' where id = '00000000-0000-4000-d000-000000000018';
insert into moderation.decisions (
  id, account_id, pet_id, media_type, media_id, storage_path, media_sha256, media_size_bytes, content_type, context,
  decision, rejection_code, hard_reject, pet_score, composite_score, dimension_scores, ai_generated, ai_score,
  reason_codes, flags, species_detected, detected_objects, processing_ms, model_version, created_at,
  review_status, final_decision, final_rejection_code, incorrect_reason_codes, missing_reason_codes, remarks, reviewed_by, reviewed_at,
  declared_breed_id, declared_is_cross_breed, breed_status, breed_match_score, detected_breed_id, detected_breed_name, detected_breed_score
) values (
  '00000000-0000-4000-a000-000000000018', '00000000-0000-4000-b000-000000000018', '00000000-0000-4000-c000-000000000018', 'pet_media', '00000000-0000-4000-d000-000000000018', 'pet-images/mock-moderation/lookalike.png', '390e9372f0b482d872eb928f3db4fd67b28916e40bbe34466dbb635da5361a72', 10274, 'image', 'post',
  'APPROVED', null, false, 90.0, 92.0, '{"D1_welfare": 100.0, "D2_nsfw": 100.0, "D3_violence": 100.0, "D4_prohibited": 100.0, "D5_quality": 88.0, "D6_relevance": 94.0}'::jsonb, false, 8.0,
  '{}'::text[], array['validation_passed', 'gate1_passed', 'd1_d3_zero_shot']::text[], array['dog']::text[], '[{"label": "dog", "score": 0.9, "kind": "animal"}]'::jsonb, 1950, 'validation-0.1+gate1-fused-0.7.1+gate2-0.19.2+mock', now() - interval '350 minutes',
  null, null, null, '{}'::text[], '{}'::text[], null, null, null,
  (select b.id from pets.breeds b join pets.species s on s.id = b.species_id where s.name = 'Dog' and b.name <> 'Unknown/Mixed' order by b.name limit 1 offset 0), false, 'unmatched', 23.5, (select b.id from pets.breeds b join pets.species s on s.id = b.species_id where s.name = 'Dog' and b.name <> 'Unknown/Mixed' order by b.name limit 1 offset 1), (select b.name from pets.breeds b join pets.species s on s.id = b.species_id where s.name = 'Dog' and b.name <> 'Unknown/Mixed' order by b.name limit 1 offset 1), 81.0
);


commit;

-- ===== Check: this should list 12 rows, oldest first. Open a media_link to see the image. =====
-- failed-check's link fails on purpose: its file doesn't exist, so the panel can test a missing file.
select d.id, d.media_type, d.decision, d.rejection_code, d.reason_codes, d.pet_score, d.composite_score,
       coalesce(m.url, '') as pet_media_url,
       d.storage_path
from moderation.decisions d
left join pets.pet_media m on m.id = d.media_id
where d.review_status = 'pending'
order by d.created_at;
