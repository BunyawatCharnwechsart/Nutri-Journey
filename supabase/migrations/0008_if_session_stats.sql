-- ============================================================================
-- 0008_if_session_stats.sql
-- Aggregate stats for a user's completed IF sessions.
--
-- The dashboard used to SELECT every completed session row and sum them in
-- JavaScript, which grows unbounded as the user logs more sessions. This RPC
-- returns count + total minutes straight from Postgres instead.
--
-- Security: the function only accepts a user_id parameter and filters by it.
-- Grants are revoked from public/anon/authenticated and only the service role
-- (used by the server) can execute it.
-- ============================================================================

create or replace function public.get_if_session_stats(p_user_id uuid)
returns table (session_count bigint, total_minutes bigint)
language sql
security definer
set search_path = public
as $$
  select
    count(*)::bigint                                   as session_count,
    coalesce(sum(fasting_duration_minutes), 0)::bigint as total_minutes
  from public.if_sessions
  where user_id = p_user_id
    and status = 'completed';
$$;

revoke all on function public.get_if_session_stats(uuid) from public, anon, authenticated;
grant execute on function public.get_if_session_stats(uuid) to service_role;