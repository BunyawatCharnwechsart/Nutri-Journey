-- ============================================================================
-- 0016_weight_tracking.sql
-- Weight tracking foundation:
--   * profiles.starting_weight     – the weight the user started their journey
--                                    with (seeded on first weight entry).
--   * users.last_weight_reminder_at – last time the LINE "update your weight"
--                                    reminder was pushed (cron dedupe).
--   * weight_logs.recorded_on/weight_kg – explicit daily tracking columns added
--                                    next to the legacy logged_at/weight, so
--                                    each row = one day per user
--                                    (unique user_id + recorded_on).
--
-- Security: RLS + revoked grants on weight_logs are re-asserted (idempotent)
-- so only the service-role server client can touch the table.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- profiles: where the user started (kg). Null = not established yet.
-- ----------------------------------------------------------------------------
alter table public.profiles
  add column if not exists starting_weight numeric;

-- ----------------------------------------------------------------------------
-- users: last time we pushed the "update your weight" LINE reminder.
-- ----------------------------------------------------------------------------
alter table public.users
  add column if not exists last_weight_reminder_at timestamptz;

-- ----------------------------------------------------------------------------
-- weight_logs: explicit tracking columns (one entry per user per day).
-- ----------------------------------------------------------------------------
alter table public.weight_logs
  add column if not exists recorded_on date,
  add column if not exists weight_kg numeric,
  add column if not exists updated_at timestamptz;

-- Backfill from the legacy columns for rows created before this migration.
-- recorded_on is the ICT calendar day of logged_at.
update public.weight_logs
   set recorded_on = (logged_at at time zone 'Asia/Bangkok')::date,
       weight_kg   = weight,
       updated_at  = now()
 where recorded_on is null or weight_kg is null;

-- Future inserts via the tracking API always set recorded_on; still default it
-- to the current ICT day as a safe fallback.
alter table public.weight_logs
  alter column recorded_on set default (now() at time zone 'Asia/Bangkok')::date;

-- After the backfill above no NULLs remain, so both can be locked down.
alter table public.weight_logs
  alter column recorded_on set not null,
  alter column weight_kg set not null;

-- One entry per user per day – WARNING: a later row with the same recorded_on
-- will violate this (the app upserts, but this is the last line of defense).
create unique index if not exists weight_logs_user_recorded_key
  on public.weight_logs (user_id, recorded_on);

-- Guard sanity: no negative/zero weights at the DB level.
do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.weight_logs'::regclass
      and conname = 'weight_logs_weight_kg_positive'
  ) then
    alter table public.weight_logs
      add constraint weight_logs_weight_kg_positive check (weight_kg > 0);
  end if;
end $$;

-- ----------------------------------------------------------------------------
-- Security (re-assert, idempotent) – publishable/anon key must never touch
-- weight logging. Service role only, and the app filters user_id in code.
-- ----------------------------------------------------------------------------
alter table public.weight_logs enable row level security;
revoke all on public.weight_logs from anon, authenticated;