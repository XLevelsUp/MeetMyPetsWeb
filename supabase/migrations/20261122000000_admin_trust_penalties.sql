-- Admin-owned record of the extra trust penalty a moderator applies by marking a report "actioned".
-- Mirror image of admin_trust_reversals: the panel may only UPDATE pets.pets.trust_score, so this row is the record of why it moved.
-- The penalty size is the app's own automatic one (report -80, post_report -20), applied a second time on confirmation.
-- Same default-privileges caveat as 20260820000000: the REVOKEs below are load-bearing.

create table if not exists public.admin_trust_penalties (
  id uuid primary key default gen_random_uuid(),

  -- UNIQUE: one actioned report can penalise at most once, however many times its dialog is submitted.
  report_id uuid not null unique,

  pet_id uuid not null,
  -- Negative: the amount taken off (-80 for a profile report, -20 for a post).
  delta integer not null check (delta < 0),
  score_before integer not null,
  score_after integer not null,

  applied_by uuid not null,
  applied_at timestamptz not null default now(),
  -- The moderator's resolution reason, copied so this row stands alone.
  reason text not null
);

comment on table public.admin_trust_penalties is
  'Extra trust penalties applied when a moderator marked a report actioned. One row per report (unique), so a repeated submission cannot double-penalise.';

create index if not exists admin_trust_penalties_pet_idx
  on public.admin_trust_penalties (pet_id, applied_at desc);

alter table public.admin_trust_penalties enable row level security;

revoke all on public.admin_trust_penalties from anon, authenticated;
-- No UPDATE and no DELETE: a penalty is a historical fact; correcting one is a new, separately audited trust action.
revoke all on public.admin_trust_penalties from service_role;
grant select, insert on public.admin_trust_penalties to service_role;
