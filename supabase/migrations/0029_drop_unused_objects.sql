-- ============================================================================
-- 0029_drop_unused_objects.sql
-- Drop database objects that are no longer used by any code path.
--
-- Audited 2026-09-11 against the live schema + a full code search:
--   * get_if_session_stats()            – RPC from 0008; the dashboard and
--                                         calendar read if_sessions rows
--                                         directly instead of calling it.
--   * line_link_codes                   – the one-time linking handshake from
--                                         0011. Retired by 0012 (auto-binding:
--                                         oa_user_id == line_user_id), no code
--                                         references it anymore.
--   * notifications                     – created out-of-band; RLS + grants
--                                         re-asserted in 0028. No code reads or
--                                         writes it — the LINE crons push via
--                                         pg_net HTTP calls, not this table.
--
-- Dropping a table drops its indexes/constraints/FKs; dropping the function
-- drops its execute grants. Idempotent (IF EXISTS) so the whole migration
-- folder can be re-run on every deploy like the rest.
-- ============================================================================

drop function if exists public.get_if_session_stats(uuid);
drop table  if exists public.line_link_codes;
drop table  if exists public.notifications;