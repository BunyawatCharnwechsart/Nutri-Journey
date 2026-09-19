-- ============================================================================
-- 0030_split_notification_permissions.sql
--
-- Split the single "LINE notifications" consent into two independent types:
--   * line_notifications_enabled  — IF phase reminders (fasting/eating end).
--   * monthly_reminder_enabled    — the monthly weight & measurement check-in.
--
-- Semantics of the new column:
--   * NULL  = "inherit" — behave as if it were line_notifications_enabled.
--             Existing users who never touched the toggle keep their current
--             behavior exactly (no blast on deploy, and re-runs are a no-op).
--   * true  = user explicitly wants the monthly check-in.
--   * false = user explicitly turned OFF the monthly check-in.
--
-- The NULL default also keeps this migration idempotent: unlike a "not null
-- default true" column plus backfill, re-running cannot overwrite a toggle the
-- user changed after the first run.
--
-- The cron/user-facing code resolves the effective value with
--   coalesce(monthly_reminder_enabled, line_notifications_enabled)
-- (see app/api/cron/monthly-reminder/route.ts and lib/line-link.ts).
--
-- Security: adds a boolean column on users (grants were already revoked from
-- anon/authenticated in 0002/0027 — no new table, no new expect). Re-assert
-- the revoke anyway as defence-in-depth, matching 0027's pattern.
--
-- Idempotent (runnable repeatedly).
-- ============================================================================

alter table public.users
  add column if not exists monthly_reminder_enabled boolean;

alter table public.users enable row level security;
revoke all on public.users from anon, authenticated;