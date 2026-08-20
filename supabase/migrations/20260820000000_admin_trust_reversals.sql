-- Admin-owned counter-ledger for trust deductions reverted by a dismissal.
--
-- WHY THIS TABLE EXISTS AT ALL. When a moderator dismisses a report —
-- `report-constants.ts`: *"dismissed — not a legitimate report"* — the -80 the
-- app deducted when the report was filed should come back. The app records its
-- own deltas in `pets.trust_score_events`, but the panel holds SELECT on that
-- table and nothing more, so we cannot write the counter-entry where it
-- belongs. We hold `UPDATE (trust_score)` on `pets.pets` and can move the
-- score; this table is the record of WHY we moved it.
--
-- The consequence is deliberate and worth stating plainly: after a revert,
-- their ledger shows a -80 with no matching credit while the score sits 80
-- higher. Rows here are what explain the difference, and the trust ledger view
-- merges them into the timeline so the arithmetic is legible where someone
-- would otherwise notice it not adding up.
--
-- THE PROPER FIX, once the app team can take it: add `report_dismissed` /
-- `post_report_dismissed` to `pets.trust_score_delta` and grant EXECUTE on
-- `pets.adjust_pet_trust_score` to `service_role`. That function already writes
-- the ledger row and the score in one transaction. At that point the panel
-- deletes its own write path and this table becomes history rather than a
-- mechanism. Tracked in docs/admin/app-team-handoff.md.
--
-- ⚠️ Supabase ships DEFAULT PRIVILEGES on `public` that automatically grant new
-- tables to `anon`, `authenticated` AND `service_role`. The REVOKEs below are
-- load-bearing, not decoration — this repo has been bitten by it before. RLS is
-- enabled with zero policies as defense in depth (service_role has BYPASSRLS,
-- so it is unaffected).
--
-- No foreign keys point into FastAPI-owned tables: bare uuids keep their
-- migrations and deletes independent of ours, as in 20260806000003.

create table if not exists public.admin_trust_reversals (
  id uuid primary key default gen_random_uuid(),

  -- The dismissed report that caused this credit. UNIQUE: one report can
  -- refund at most once, however many times its dialog is submitted.
  report_id uuid not null unique,

  -- The `pets.trust_score_events` row being reversed. UNIQUE, and this is the
  -- constraint that actually matters: the app dedups its own deductions on
  -- (target_pet_id, actor_pet_id, reason, event_ref), so two reports from the
  -- same reporter against the same pet share ONE deduction. Without this,
  -- dismissing both would refund 160 for an 80-point penalty.
  trust_event_id uuid not null unique,

  pet_id uuid not null,
  -- Positive: the amount added back (80 for a profile report, 20 for a post).
  delta integer not null check (delta > 0),
  -- Both sides recorded, so a later reader can tell whether the score moved as
  -- expected or was concurrently changed by something else.
  score_before integer not null,
  score_after integer not null,

  reverted_by uuid not null,
  reverted_at timestamptz not null default now(),
  -- The moderator's dismissal reason, copied so this row stands alone.
  reason text not null
);

comment on table public.admin_trust_reversals is
  'Trust deductions credited back when a moderator dismissed the report that caused them. The counter-entry to pets.trust_score_events, which the panel may only read. One row per reversed event (unique), so a repeated dismissal cannot double-refund.';

create index if not exists admin_trust_reversals_pet_idx
  on public.admin_trust_reversals (pet_id, reverted_at desc);

alter table public.admin_trust_reversals enable row level security;

revoke all on public.admin_trust_reversals from anon, authenticated;
-- No UPDATE and no DELETE: a reversal is a historical fact. Correcting one
-- means a new, separately audited trust action, not editing the record of the
-- old one. Same default-privileges caveat as the tables above.
revoke all on public.admin_trust_reversals from service_role;
grant select, insert on public.admin_trust_reversals to service_role;
