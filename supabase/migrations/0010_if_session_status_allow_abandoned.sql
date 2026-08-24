-- ============================================================================
-- 0010_if_session_status_allow_abandoned.sql
-- Allow status = 'abandoned' on if_sessions.
--
-- The live database carries a CHECK constraint (if_sessions_status_check)
-- limiting status to ('active', 'completed') — created before this repo's
-- migrations existed. Sessions auto-closed because the user started a new one
-- are now marked 'abandoned' so they stay out of completed-session stats.
--
-- Idempotent: drops the old constraint if present, then adds the widened
-- version only when missing. Existing rows all satisfy the new check.
-- ============================================================================

alter table public.if_sessions
  drop constraint if exists if_sessions_status_check;

do $$
begin
  if not exists (
    select 1 from pg_constraint
     where conname = 'if_sessions_status_check'
       and conrelid = 'public.if_sessions'::regclass
  ) then
    alter table public.if_sessions
      add constraint if_sessions_status_check
      check (status = any (array['active'::text, 'completed'::text, 'abandoned'::text]));
  end if;
end $$;
