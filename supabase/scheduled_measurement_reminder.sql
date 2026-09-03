-- ============================================================================
-- scheduled_measurement_reminder.sql
--
-- NOTE: this file lives OUTSIDE supabase/migrations/ on purpose — it is NOT a
-- schema migration (scripts/run-migration.mjs only scans migrations/). Run it
-- manually once in the Supabase SQL editor (or via
--   node scripts/run-migration.mjs --file=scheduled_measurement_reminder
--   # then replace the placeholder as described below).
--
-- What it does: installs the scheduler that calls the measurement-reminder
-- cron endpoint every 6 hours. The endpoint is what actually decides what to
-- send (see app/api/cron/measurement-reminder/route.ts).
--
-- SECURITY:
--   * Replace :CRON_SECRET below with the real value (same secret as the
--     CRON_SECRET env var on Vercel) BEFORE running. Never commit it.
--   * The secret lives only in this SQL job inside your own Supabase database.
--   * pg_net allow-list already includes https://www.nutrijourney88.com, so no
--     dashboard change is needed.
--
-- Idempotent — safe to run again (the old job is unscheduled first).
-- ============================================================================

create extension if not exists pg_cron;
create extension if not exists pg_net;

-- Drop the previous job so re-running this script does not create duplicates.
select cron.unschedule(jobid)
from cron.job
where jobname = 'measurement-reminder';

select cron.schedule(
  'measurement-reminder',
  '0 */6 * * *',  -- every 6 hours
  $$
  select net.http_post(
    url := 'https://www.nutrijourney88.com/api/cron/measurement-reminder',
    headers := jsonb_build_object(
      'Authorization', 'Bearer :CRON_SECRET',
      'Content-Type', 'application/json'
    ),
    body := '{}'
  );
  $$
);
