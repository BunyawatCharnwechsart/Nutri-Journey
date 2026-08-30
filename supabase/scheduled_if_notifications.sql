-- ============================================================================
-- scheduled_if_notifications.sql
--
-- NOTE: this file lives OUTSIDE supabase/migrations/ on purpose — it is NOT a
-- schema migration (scripts/run-migration.mjs only scans migrations/). Run it
-- manually once in the Supabase SQL editor (or via
--   node scripts/run-migration.mjs --file=scheduled_if_notifications
--   # then replace the placeholder as described below).
--
-- What it does: installs the scheduler that calls the IF-notification cron
-- endpoint every minute. The endpoint is what actually decides what to send
-- (see app/api/cron/if-notifications/route.ts).
--
-- SECURITY:
--   * Replace :CRON_SECRET below with the real value (same secret as the
--     CRON_SECRET env var on Vercel) BEFORE running. Never commit it.
--   * The secret lives only in this SQL job inside your own Supabase database.
--   * Also add https://nutri-journey-hazel.vercel.app to the pg_net allow-list
--     (Supabase dashboard: Settings → API → pg_net allow list).
--
-- Idempotent — safe to run again (the old job is unscheduled first).
-- ============================================================================

create extension if not exists pg_cron;
create extension if not exists pg_net;

-- Drop the previous job so re-running this script does not create duplicates.
select cron.unschedule(jobid)
from cron.job
where jobname = 'if-notifications';

select cron.schedule(
  'if-notifications',
  '* * * * *',  -- every minute
  $$
  select net.http_post(
    url := 'https://nutri-journey-hazel.vercel.app/api/cron/if-notifications',
    headers := jsonb_build_object(
      'Authorization', 'Bearer :CRON_SECRET',
      'Content-Type', 'application/json'
    ),
    body := '{}'
  );
  $$
);