-- Admin analytics read grant: swipe-volume chart.
--
-- The admin panel's service client (service_role) has BYPASSRLS but is still
-- subject to table GRANTs. matching.pet_likes (the swipes table) had no
-- service_role SELECT, so apps/admin/src/lib/analytics.ts fetchAnalyticsTimeseries
-- returned query_failed and the chart showed a retry card. This is the
-- long-standing blocker tracked in docs/admin/schema-notes.md.
--
-- SELECT only. The admin dashboard reads aggregates; it never writes swipes.

grant select on matching.pet_likes to service_role;
