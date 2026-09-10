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
-- endpoint every day. The endpoint itself gates the send to once per ICT
-- month (see app/api/cron/monthly-reminder/route.ts and
-- lib/monthly-reminder.ts). Running daily — instead of only on the 1st —
-- is self-healing: if the 1st is somehow missed, the next day's run catches
-- up (the month-key dedupe still prevents double-sends).
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
  '0 0 * * *',  -- every day 00:00 UTC = 07:00 ICT; logic gates to once per month
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