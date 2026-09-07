-- ============================================================================
-- 0025_if_sessions_result.sql
-- Persist whether a completed IF session hit BOTH goals of its pattern
-- ("success") or not ("fail"), so history is a stable snapshot.
--
-- Background: before 0025 the success/fail of a session was recomputed on the
-- fly from (status, if_pattern, durations) wherever it was displayed. If a
-- pattern threshold changes later, that would silently rewrite history. Now the
-- result is locked in once at the moment the session ends (/end route).
--
-- Rules (must match lib/if.ts `computeIfResult` exactly):
--   * completed + known pattern + fasting >= planned AND eating >= planned
--     -> 'success'
--   * completed otherwise (pattern unknown/null, or missed either goal) -> 'fail'
--   * active / abandoned -> NULL (no result, they are not success/fail)
--
-- Idempotent: safe to re-run. The backfill only touches rows whose `result` is
-- still null, so a second run is a no-op.
--
-- Security: RLS + revoked grants re-asserted (idempotent) so only the
-- service-role server client can touch the table.
-- ============================================================================

alter table public.if_sessions
  add column if not exists result text;

update public.if_sessions
  set result = case
    when status = 'completed'
      and if_pattern in ('12:12', '14:10', '16:8', '18:6', '20:4')
      and coalesce(fasting_duration_minutes, 0)
          >= split_part(if_pattern, ':', 1)::int * 60
      and coalesce(eating_duration_minutes, 0)
          >= (24 - split_part(if_pattern, ':', 1)::int) * 60
      then 'success'
    when status = 'completed'
      then 'fail'
    else null
  end
  where result is null;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'if_sessions_result_check'
      and conrelid = 'public.if_sessions'::regclass
  ) then
    alter table public.if_sessions
      add constraint if_sessions_result_check
      check (result is null or result in ('success', 'fail'));
  end if;
end $$;

-- ----------------------------------------------------------------------------
-- Security (re-assert, idempotent) – publishable/anon key must never touch
-- the table. Service role only, and the app filters user_id in code.
-- ----------------------------------------------------------------------------
alter table public.if_sessions enable row level security;
revoke all on public.if_sessions from anon, authenticated;