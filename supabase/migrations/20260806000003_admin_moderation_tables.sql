-- Admin-owned moderation tables: audit trail + restriction state.
--
-- SCHEMA CHOICE: these live in `public` rather than a dedicated `moderation`
-- schema because PostgREST only serves schemas on its exposed list
-- (public, graphql_public, identity, pets, matching, social, chat) and adding
-- one is a dashboard-only toggle — a new schema would be unreachable from the
-- admin app until someone clicked it. Security is unaffected: grants and RLS
-- are per-table, not per-schema. Precedent: public.admin_analytics_timeseries.
-- If the team later wants the namespace, `alter table ... set schema` moves
-- these once `moderation` is exposed.
--
-- ⚠️ Supabase ships DEFAULT PRIVILEGES on `public` that automatically grant
-- new tables to `anon`, `authenticated` AND `service_role`. Every create below
-- is therefore followed by explicit REVOKEs — without them these tables would
-- be readable with the browser publishable key, and the append-only guarantee
-- would be a comment rather than a constraint (verified: service_role came out
-- of `create table` holding DELETE despite the narrower grant below). RLS is
-- enabled with zero policies as defense in depth (service_role has BYPASSRLS,
-- so it is unaffected).
--
-- No foreign keys point into FastAPI-owned tables (identity/pets/...): bare
-- uuids keep their migrations and deletes independent of ours.

-- ---------------------------------------------------------------------------
-- Audit trail — append-only record of every admin action.
-- ---------------------------------------------------------------------------
create table if not exists public.admin_audit_logs (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  -- Actor identity is denormalized on purpose: the trail must stay readable
  -- after an admin account is renamed or deleted.
  actor_id uuid not null,
  actor_email text not null,
  actor_role text not null,
  -- Dot-namespaced: account.suspend, account.ban, account.restore,
  -- pet.flag, pet.unflag.
  action text not null,
  target_type text not null,
  target_id text not null,
  -- Mandatory: no destructive admin action is recorded without a reason.
  reason text not null,
  metadata jsonb not null default '{}'::jsonb
);

comment on table public.admin_audit_logs is
  'Append-only audit trail of admin panel actions. Written by apps/admin (service_role). Never updated or deleted.';

create index if not exists admin_audit_logs_created_at_idx
  on public.admin_audit_logs (created_at desc);
create index if not exists admin_audit_logs_target_idx
  on public.admin_audit_logs (target_type, target_id);
create index if not exists admin_audit_logs_actor_idx
  on public.admin_audit_logs (actor_id);

alter table public.admin_audit_logs enable row level security;

revoke all on public.admin_audit_logs from anon, authenticated;
-- INSERT + SELECT only: append-only is enforced by the grant, not convention.
-- The revoke is required — `create table` already handed service_role ALL via
-- Supabase's default privileges.
revoke all on public.admin_audit_logs from service_role;
grant insert, select on public.admin_audit_logs to service_role;

-- ---------------------------------------------------------------------------
-- Restrictions — durable suspend/ban/flag state for accounts and pets.
--
-- Why a separate table rather than writing identity.accounts.status: that
-- column is the backend's user-lifecycle vocabulary ('active'/'archived').
-- Overloading it with moderation state would corrupt their data model. Auth
-- enforcement happens via the Supabase Auth ban; this table is the durable
-- record the panel filters and badges on, and that FastAPI can read later.
-- ---------------------------------------------------------------------------
create table if not exists public.admin_restrictions (
  id uuid primary key default gen_random_uuid(),
  target_type text not null check (target_type in ('account', 'pet')),
  target_id uuid not null,
  kind text not null check (kind in ('suspended', 'banned', 'flagged')),
  reason text not null,
  created_by uuid not null,
  created_at timestamptz not null default now(),
  -- Null = no scheduled expiry (bans and flags).
  expires_at timestamptz,
  lifted_at timestamptz,
  lifted_by uuid
);

comment on table public.admin_restrictions is
  'Moderation state for accounts (identity.accounts.id) and pets (pets.pets.id). Active = lifted_at is null and (expires_at is null or expires_at > now()).';

-- At most one ACTIVE restriction of a kind per target; lifted rows accumulate
-- as history and are excluded from the constraint.
create unique index if not exists admin_restrictions_active_unique
  on public.admin_restrictions (target_type, target_id, kind)
  where lifted_at is null;

create index if not exists admin_restrictions_target_idx
  on public.admin_restrictions (target_type, target_id);

alter table public.admin_restrictions enable row level security;

revoke all on public.admin_restrictions from anon, authenticated;
-- No DELETE: restrictions are lifted (lifted_at/lifted_by), never removed, so
-- the moderation history stays intact. Same default-privileges caveat as above.
revoke all on public.admin_restrictions from service_role;
grant select, insert, update on public.admin_restrictions to service_role;
