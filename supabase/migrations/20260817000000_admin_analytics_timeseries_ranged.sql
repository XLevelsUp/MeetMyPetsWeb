-- Admin analytics: arbitrary date range + selectable bucket granularity.
--
-- WHY: the dashboard gained month / year / custom range controls, and the
-- original function only buckets by day over a trailing `days` window. A year
-- of daily points is 365 marks in a 224px-tall card — unreadable, and the wrong
-- unit for the question being asked.
--
-- The 1-arg admin_analytics_timeseries(int) is deliberately LEFT IN PLACE.
-- `create or replace` cannot change an argument list, so this is an overload
-- either way; keeping the old one means nothing breaks if the app and this
-- migration land out of order.
--
-- Security: identical posture to 20260805000000 — plain SECURITY INVOKER (never
-- DEFINER, per the Supabase checklist), search_path pinned empty, every table
-- schema-qualified. Postgres grants EXECUTE to PUBLIC on new functions by
-- default, so the revokes below are load-bearing, not decoration.
--
-- Sources, verified 2026-08-06 and re-verified 2026-08-17 against the live
-- database: user acquisition = identity.accounts.created_at; swipe volume =
-- matching.pet_likes.created_at.

create or replace function public.admin_analytics_timeseries(
  p_from date,
  p_to date,
  p_bucket text default 'day'
)
returns jsonb
language plpgsql
stable
security invoker
set search_path = ''
as $$
declare
  v_start timestamptz;
  v_end timestamptz;
  v_step interval;
  v_result jsonb;
begin
  -- p_bucket reaches date_trunc as a PARAMETER, never as interpolated SQL, so
  -- there is no injection surface. It is still validated: an unrecognised value
  -- would otherwise fail deep inside the CTE with a message that says nothing
  -- about which argument was wrong.
  if p_bucket not in ('day', 'week', 'month') then
    raise exception 'admin_analytics_timeseries: p_bucket must be day, week or month, got %', p_bucket
      using errcode = 'invalid_parameter_value';
  end if;

  if p_from > p_to then
    raise exception 'admin_analytics_timeseries: p_from (%) is after p_to (%)', p_from, p_to
      using errcode = 'invalid_parameter_value';
  end if;

  v_start := date_trunc(p_bucket, p_from::timestamptz);
  -- Inclusive of p_to's own bucket: a range ending "today" must contain today.
  v_end := date_trunc(p_bucket, p_to::timestamptz);
  v_step := ('1 ' || p_bucket)::interval;

  with series as (
    select generate_series(v_start, v_end, v_step)::date as bucket
  ),
  acquisition as (
    select date_trunc(p_bucket, created_at)::date as bucket, count(*) as n
    from identity.accounts
    where created_at >= v_start
      and created_at < v_end + v_step
    group by 1
  ),
  swipes as (
    select date_trunc(p_bucket, created_at)::date as bucket, count(*) as n
    from matching.pet_likes
    where created_at >= v_start
      and created_at < v_end + v_step
    group by 1
  )
  select jsonb_build_object(
    'from', to_char(v_start, 'YYYY-MM-DD'),
    'to', to_char(v_end, 'YYYY-MM-DD'),
    'bucket', p_bucket,
    -- The earliest row in either source, so the caller can clamp a range that
    -- reaches back further than the product has existed rather than rendering a
    -- row of empty buckets. Null only on a completely empty database.
    'dataStartsAt', (
      select to_char(min(d), 'YYYY-MM-DD')
      from (
        select min(created_at) as d from identity.accounts
        union all
        select min(created_at) from matching.pet_likes
      ) starts
    ),
    -- series LEFT JOIN counts: generate_series pre-seeds every bucket, so a
    -- quiet period renders as 0 instead of disappearing from the axis.
    'userAcquisition', (
      select coalesce(
        jsonb_agg(jsonb_build_object('date', to_char(s.bucket, 'YYYY-MM-DD'), 'value', coalesce(a.n, 0)) order by s.bucket),
        '[]'::jsonb
      )
      from series s left join acquisition a using (bucket)
    ),
    'swipeVolume', (
      select coalesce(
        jsonb_agg(jsonb_build_object('date', to_char(s.bucket, 'YYYY-MM-DD'), 'value', coalesce(w.n, 0)) order by s.bucket),
        '[]'::jsonb
      )
      from series s left join swipes w using (bucket)
    )
  )
  into v_result;

  return v_result;
end;
$$;

revoke execute on function public.admin_analytics_timeseries(date, date, text) from public;
revoke execute on function public.admin_analytics_timeseries(date, date, text) from anon;
revoke execute on function public.admin_analytics_timeseries(date, date, text) from authenticated;
grant execute on function public.admin_analytics_timeseries(date, date, text) to service_role;
