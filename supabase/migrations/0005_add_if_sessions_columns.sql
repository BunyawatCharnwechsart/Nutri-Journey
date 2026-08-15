-- ============================================================================
-- 0005_add_if_sessions_columns.sql
-- Add the fasting pattern column to if_sessions (IF tracker MVP).
--
-- The if_sessions table already exists with: id, user_id, start_time,
-- end_time, status (active/completed), duration_minutes, created_at.
-- RLS is enabled and grants to anon/authenticated are already revoked.
-- ============================================================================

alter table public.if_sessions
  add column if not exists if_pattern text;