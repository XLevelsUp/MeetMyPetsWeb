-- Admin analytics: daily-bucketed timeseries for the dashboard charts.
--
-- VERIFIED 2026-08-06: written against the real schema (docs/admin/schema-notes.md).
-- user acquisition = identity.accounts.created_at; swipe volume =
-- matching.pet_likes.created_at. (The original draft targeted public.profiles /
-- public.swipes, which never existed.)
--
-- Security: plain SECURITY INVOKER (never DEFINER — Supabase checklist). The
-- admin app calls this via the service_role client, which has BYPASSRLS and
-- (as of 20260806000001) SELECT on matching.pet_likes; the REVOKEs below keep
-- every browser-reachable role out. Postgres grants EXECUTE to PUBLIC on new
-- functions by default, hence the explicit revokes.
--
-- search_path is pinned empty and every table is schema-qualified.

create or replace function public.admin_analytics_timeseries(days int default 30)
returns jsonb
language sql
stable
security invoker
set search_path = ''
as $$
  with series as (
    select generate_series(
      date_trunc('day', now()) - make_interval(days => days - 1),
      date_trunc('day', now()),
      interval '1 day'
    )::date as day
  ),
  acquisition as (
    select date_trunc('day', created_at)::date as day, count(*) as n
    from identity.accounts
    where created_at >= date_trunc('day', now()) - make_interval(days => days - 1)
    group by 1
  ),
  swipes as (
    select date_trunc('day', created_at)::date as day, count(*) as n
    from matching.pet_likes
    where created_at >= date_trunc('day', now()) - make_interval(days => days - 1)
    group by 1
  )
  select jsonb_build_object(
    'days', days,
    'userAcquisition', (
      select coalesce(jsonb_agg(jsonb_build_object('date', to_char(s.day, 'YYYY-MM-DD'), 'value', coalesce(a.n, 0)) order by s.day), '[]'::jsonb)
      from series s left join acquisition a using (day)
    ),
    'swipeVolume', (
      select coalesce(jsonb_agg(jsonb_build_object('date', to_char(s.day, 'YYYY-MM-DD'), 'value', coalesce(w.n, 0)) order by s.day), '[]'::jsonb)
      from series s left join swipes w using (day)
    )
  );
$$;

revoke execute on function public.admin_analytics_timeseries(int) from public;
revoke execute on function public.admin_analytics_timeseries(int) from anon;
revoke execute on function public.admin_analytics_timeseries(int) from authenticated;
grant execute on function public.admin_analytics_timeseries(int) to service_role;
