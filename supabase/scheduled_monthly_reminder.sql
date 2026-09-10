-- ============================================================================
-- scheduled_monthly_reminder.sql
--
-- NOTE: this file lives OUTSIDE supabase/migrations/ on purpose — it is NOT a
-- schema migration (scripts/run-migration.mjs only scans migrations/). Run it
-- manually once in the Supabase SQL editor (or via
--   node scripts/run-migration.mjs --file=scheduled_monthly_reminder
--   # then replace the placeholder as described below).
--
-- What it does: installs the scheduler that calls the monthly-reminder cron
-- endpoint every day at 01:00 UTC = 08:00 ICT. The endpoint itself decides
-- what to send (see app/api/cron/monthly-reminder/route.ts and
-- lib/monthly-reminder.ts):
--   * on the 1st of the month it ALWAYS reminds the user to update weight,
--     measurements and a body photo, and lists exactly which are still missing.
--   * on later days it repeats daily (at most once per ICT day) while any of
--     the three items is still unrecorded.
-- Running daily instead of only on the 1st is what makes the repeated nudge
-- possible; the per-day dedupe lives in the endpoint via
-- users.last_monthly_reminder_at.
--
-- REPLACES the old weight-reminder (7 days) and measurement-reminder
-- (14 days) schedulers, which are unscheduled here.
--
-- SECURITY:
--   * Replace :CRON_SECRET below with the real value (same secret as the
--     CRON_SECRET env var on Vercel) BEFORE running. Never commit it.
--   * The secret lives only in this SQL job inside your own Supabase database.
--   * pg_net allow-list already includes https://www.nutrijourney88.com (used
--     by the IF-notifications scheduler), so no dashboard change is needed.
--
-- Idempotent — safe to run again (all jobs are unscheduled first).
-- ============================================================================

create extension if not exists pg_cron;
create extension if not exists pg_net;

-- Drop the previous jobs so re-running this script does not create duplicates
-- and to retire the replaced weight/measurement schedulers.
select cron.unschedule(jobid)
from cron.job
where jobname in ('weight-reminder', 'measurement-reminder', 'monthly-reminder');

select cron.schedule(
  'monthly-reminder',
  '0 1 * * *',  -- every day at 01:00 UTC = 08:00 ICT
  $$
  select net.http_post(
    url := 'https://www.nutrijourney88.com/api/cron/monthly-reminder',
    headers := jsonb_build_object(
      'Authorization', 'Bearer :CRON_SECRET',
      'Content-Type', 'application/json'
    ),
    body := '{}'
  );
  $$
);