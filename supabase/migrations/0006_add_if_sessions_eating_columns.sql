-- ============================================================================
-- 0006_add_if_sessions_eating_columns.sql
-- Track the eating phase of an IF session alongside the fasting phase.
--
-- Every IF session now stores both periods in one row:
--   eating: eating_start_time, eating_end_time, eating_duration_minutes
--   fasting: start_time, end_time, duration_minutes (existing semantics kept)
--
-- start_time still represents the fasting start, so existing Dashboard /
-- Calendar queries (which group by start_time and use duration_minutes) keep
-- working unchanged. The eating phase comes first in the app flow, so on
-- session creation start_time = eating start and it is moved to the fasting
-- start when the user taps "สิ้นสุดการกิน".
--
-- RLS + revoked grants on public.if_sessions already exist (0002 covers all
-- tables), so no grant changes are needed here.
-- ============================================================================

alter table public.if_sessions
  add column if not exists eating_start_time timestamptz,
  add column if not exists eating_end_time timestamptz,
  add column if not exists eating_duration_minutes integer;