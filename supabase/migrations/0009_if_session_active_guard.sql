-- ============================================================================
-- 0009_if_session_active_guard.sql
-- Guard against duplicate active IF sessions per user.
--
-- The start endpoint closes any stale active session before inserting a new
-- one, but two concurrent requests could both pass that check and insert two
-- active rows. This partial unique index enforces "at most one active session
-- per user" at the database level; the API handles the resulting unique
-- violation (SQLSTATE 23505) by returning the existing active session.
--
-- Idempotent: safe to run multiple times. No grants to revoke because an
-- index is not a table.
-- ============================================================================

create unique index if not exists if_sessions_one_active_per_user
  on public.if_sessions (user_id)
  where status = 'active';
