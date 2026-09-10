-- ============================================================================
-- 0027_monthly_reminder.sql
--
-- Monthly "update your results" reminder support:
--   * users.last_monthly_reminder_at — the last successful push of the monthly
--     reminder (replaces the old weekly weight / biweekly measurement crons).
--
-- Backfill: existing users are stamped with the start of the CURRENT ICT
-- month, so the first real push happens on the NEXT 1st (no blast on deploy).
-- Brand-new users stay NULL → they receive their first monthly check-in on the
-- first cron run after they join.
--
-- Security: re-assert the publishable (anon / authenticated) key cannot touch
-- users. RLS stays enabled from 0001.
--
-- Idempotent (runnable repeatedly).
-- ============================================================================

alter table public.users
  add column if not exists last_monthly_reminder_at timestamptz;

-- Start of the current ICT month as a UTC timestamp (e.g. Sep 1 ICT
-- = 2026-08-31T17:00:00Z). Backfill only rows that were never stamped.
update public.users
set last_monthly_reminder_at =
    (date_trunc('month', now() at time zone 'Asia/Bangkok') at time zone 'Asia/Bangkok')
where last_monthly_reminder_at is null;

alter table public.users enable row level security;
revoke all on public.users from anon, authenticated;