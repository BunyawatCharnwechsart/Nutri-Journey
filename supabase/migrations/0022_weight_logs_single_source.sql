-- ============================================================================
-- 0022_weight_logs_single_source.sql
--
-- weight_logs is now the single source of truth for the user's weight; the app
-- no longer reads or writes profiles.weight / profiles.starting_weight.
--
-- Users created before the weight-tracking feature (pre-0016) may still have a
-- value in profiles.weight with no weight_logs rows at all. Backfill one entry
-- for each of them (recorded as the current ICT day) so those users keep a
-- "น้ำหนักปัจจุบัน" and can start the 7-day update clock from today.
--
-- Idempotent: rows only appear for users WITHOUT any existing log, and the
-- unique (user_id, recorded_on) index makes re-runs a no-op.
--
-- Security: RLS + revoked grants re-asserted (idempotent) so only the
-- service-role server client can touch the table.
-- ============================================================================

do $$
begin
  insert into public.weight_logs (user_id, recorded_on, weight_kg, logged_at, updated_at)
  select
    p.user_id,
    (now() at time zone 'Asia/Bangkok')::date,
    p.weight,
    now(),
    now()
  from public.profiles p
  where p.weight is not null
    and p.weight > 0
    and not exists (
      select 1
      from public.weight_logs w
      where w.user_id = p.user_id
    )
  on conflict (user_id, recorded_on) do nothing;
end $$;

-- ----------------------------------------------------------------------------
-- Security (re-assert, idempotent) – publishable/anon key must never touch
-- weight logging. Service role only, and the app filters user_id in code.
-- ----------------------------------------------------------------------------
alter table public.weight_logs enable row level security;
revoke all on public.weight_logs from anon, authenticated;