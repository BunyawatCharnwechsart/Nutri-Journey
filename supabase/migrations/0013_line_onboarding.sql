-- ============================================================================
-- 0013_line_onboarding.sql
--
-- Ask the user only ONCE, at their first login, whether they want LINE
-- notifications. After they answer (accept or decline) the prompt never
-- shows again.
--
--  1. line_onboarding_answered – has the one-time prompt been answered?
--  2. line_notifications_enabled now defaults to false so brand-new users
--     start "off" and must opt in; existing rows keep their current value.
--
-- Login does NOT write these columns, so repeated logins never reset them.
--
-- Idempotent (runnable repeatedly).
-- ============================================================================

alter table public.users
  add column if not exists line_onboarding_answered boolean
    not null default false;

alter table public.users
  alter column line_notifications_enabled set default false;

-- Security: re-assert the publishable (anon / authenticated) key cannot touch
-- users. RLS stays enabled from 0001.
alter table public.users enable row level security;
revoke all on public.users from anon, authenticated;