-- Admin analytics: daily-bucketed timeseries for the dashboard charts.
--
-- STATUS: NOT YET APPLIED. Written against the assumed schema in
-- docs/admin/schema-notes.md (tables `profiles`, `swipes` with
-- `created_at timestamptz`). Verify table names during the MCP
-- introspection step, then apply. Until applied, the app-side adapter
-- (apps/admin/src/lib/analytics.ts) buckets timestamps in TypeScript.
--
-- Security: plain SECURITY INVOKER (never DEFINER — see the Supabase
-- checklist). The service_role client the admin app uses bypasses RLS
-- anyway; the REVOKEs below keep every browser-reachable role out.
-- Postgres grants EXECUTE to PUBLIC on new functions by default.

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
    from public.profiles
    where created_at >= date_trunc('day', now()) - make_interval(days => days - 1)
    group by 1
  ),
  swipes as (
    select date_trunc('day', created_at)::date as day, count(*) as n
    from public.swipes
    where created_at >= date_trunc('day', now()) - make_interval(days => days - 1)
    group by 1
  )
  select jsonb_build_object(
    'days', days,
    'userAcquisition', (
      select jsonb_agg(jsonb_build_object('date', to_char(s.day, 'YYYY-MM-DD'), 'value', coalesce(a.n, 0)) order by s.day)
      from series s left join acquisition a using (day)
    ),
    'swipeVolume', (
      select jsonb_agg(jsonb_build_object('date', to_char(s.day, 'YYYY-MM-DD'), 'value', coalesce(w.n, 0)) order by s.day)
      from series s left join swipes w using (day)
    )
  );
$$;

revoke execute on function public.admin_analytics_timeseries(int) from public;
revoke execute on function public.admin_analytics_timeseries(int) from anon;
revoke execute on function public.admin_analytics_timeseries(int) from authenticated;
