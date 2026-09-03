-- ============================================================================
-- 0019_measurement_logs.sql
-- Measurement tracking foundation:
--   * measurement_logs table — one entry per user per day with waist/hip/chest
--     measurements in inches.
--   * profiles.last_measurement_update_at — tracks when the user last updated
--     their measurements (for the 14-day update lock).
--
-- Security: RLS + revoked grants — only the service-role server client can
-- touch the table. The app filters user_id in code.
-- ============================================================================

create extension if not exists pgcrypto;

-- ----------------------------------------------------------------------------
-- measurement_logs: explicit tracking columns (one entry per user per day).
-- ----------------------------------------------------------------------------
create table if not exists public.measurement_logs (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.users(user_id) on delete cascade,
  recorded_on date not null default (now() at time zone 'Asia/Bangkok')::date,
  waist_in    numeric not null,
  hip_in      numeric not null,
  chest_in    numeric not null,
  updated_at  timestamptz not null default now()
);

-- One entry per user per day.
create unique index if not exists measurement_logs_user_recorded_key
  on public.measurement_logs (user_id, recorded_on);

-- Guard sanity: no negative/zero measurements at the DB level.
do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.measurement_logs'::regclass
      and conname = 'measurement_logs_measurements_positive'
  ) then
    alter table public.measurement_logs
      add constraint measurement_logs_measurements_positive
      check (waist_in > 0 AND hip_in > 0 AND chest_in > 0);
  end if;
end $$;

-- ----------------------------------------------------------------------------
-- profiles: last time the user updated their measurements.
-- ----------------------------------------------------------------------------
alter table public.profiles
  add column if not exists last_measurement_update_at timestamptz;

-- ----------------------------------------------------------------------------
-- users: last time we pushed the "update your measurements" LINE reminder.
-- ----------------------------------------------------------------------------
alter table public.users
  add column if not exists last_measurement_reminder_at timestamptz;

-- ----------------------------------------------------------------------------
-- Security — service-role only, app enforces user_id in code.
-- ----------------------------------------------------------------------------
alter table public.measurement_logs enable row level security;
revoke all on public.measurement_logs from anon, authenticated;
