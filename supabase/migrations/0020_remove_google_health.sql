-- ============================================================================
-- 0020_remove_google_health.sql
-- Drop Google Health tables that are no longer used.
--
-- `google_health_connections` stored OAuth tokens for Google Health API.
-- `daily_metrics` stored synced health data (steps, distance, kcal).
-- Both tables are now obsolete after removing the Google Health feature.
-- Idempotent: uses IF EXISTS to allow safe re-runs.
-- ============================================================================

drop table if exists public.daily_metrics;
drop table if exists public.google_health_connections;
